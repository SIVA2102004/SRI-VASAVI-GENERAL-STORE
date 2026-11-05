const express = require('express');
const { db, normalizePersonName } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Search people with autocomplete / partial query
router.get('/search', (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    const userId = req.user.id;

    if (!q) {
      // Return top recent active people
      const people = db.prepare(`
        SELECT p.*,
          COUNT(t.id) as transaction_count,
          MAX(t.transaction_date) as last_transaction_date,
          COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Given', 'Loan Given') THEN t.amount ELSE 0 END), 0) as total_given,
          COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Received', 'Loan Received') THEN t.amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END), 0) as total_expense
        FROM people p
        LEFT JOIN transactions t ON t.person_id = p.id AND t.user_id = p.user_id
        WHERE p.user_id = ?
        GROUP BY p.id
        ORDER BY last_transaction_date DESC NULLS LAST, p.person_name ASC
        LIMIT 20
      `).all(userId);
      return res.json(people);
    }

    const normalizedQuery = normalizePersonName(q);
    const searchPattern = `%${normalizedQuery}%`;

    const people = db.prepare(`
      SELECT p.*,
        COUNT(t.id) as transaction_count,
        MAX(t.transaction_date) as last_transaction_date,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Given', 'Loan Given') THEN t.amount ELSE 0 END), 0) as total_given,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Received', 'Loan Received') THEN t.amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END), 0) as total_expense
      FROM people p
      LEFT JOIN transactions t ON t.person_id = p.id AND t.user_id = p.user_id
      WHERE p.user_id = ? AND (p.normalized_name LIKE ? OR p.mobile_number LIKE ?)
      GROUP BY p.id
      ORDER BY 
        CASE 
          WHEN p.normalized_name = ? THEN 1
          WHEN p.normalized_name LIKE ? THEN 2
          ELSE 3
        END,
        p.person_name ASC
      LIMIT 20
    `).all(userId, searchPattern, `%${q}%`, normalizedQuery, `${normalizedQuery}%`);

    res.json(people);
  } catch (err) {
    console.error('People search error:', err);
    res.status(500).json({ error: 'Failed to search people' });
  }
});

// List all people with summary stats
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const people = db.prepare(`
      SELECT p.*,
        COUNT(t.id) as transaction_count,
        MAX(t.transaction_date) as last_transaction_date,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Given', 'Loan Given') THEN t.amount ELSE 0 END), 0) as total_given,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Received', 'Loan Received') THEN t.amount ELSE 0 END), 0) as total_received,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END), 0) as total_expense
      FROM people p
      LEFT JOIN transactions t ON t.person_id = p.id AND t.user_id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.person_name ASC
    `).all(userId);

    // Calculate net balances:
    // Net balance = (Amount Given + Loan Given) - (Amount Received + Loan Received)
    // Positive means they owe the user (receivable/pending from them), Negative means user owes them
    const enriched = people.map(p => ({
      ...p,
      net_balance: (p.total_given - p.total_received)
    }));

    res.json(enriched);
  } catch (err) {
    console.error('List people error:', err);
    res.status(500).json({ error: 'Failed to fetch people list' });
  }
});

// Get individual person profile with aggregated calculations
router.get('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const personId = req.params.id;

    const person = db.prepare(`
      SELECT * FROM people WHERE id = ? AND user_id = ?
    `).get(personId, userId);

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Calculate aggregated metrics exclusively for this person
    const summary = db.prepare(`
      SELECT 
        COUNT(id) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'Amount Given' THEN amount ELSE 0 END), 0) as amount_given,
        COALESCE(SUM(CASE WHEN transaction_type = 'Amount Received' THEN amount ELSE 0 END), 0) as amount_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'Loan Given' THEN amount ELSE 0 END), 0) as loan_given,
        COALESCE(SUM(CASE WHEN transaction_type = 'Loan Received' THEN amount ELSE 0 END), 0) as loan_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN transaction_type = 'Other' THEN amount ELSE 0 END), 0) as total_other
      FROM transactions
      WHERE user_id = ? AND person_id = ?
    `).get(userId, personId);

    const totalGiven = summary.amount_given + summary.loan_given;
    const totalReceived = summary.amount_received + summary.loan_received;
    const netBalance = totalGiven - totalReceived;

    res.json({
      person,
      summary: {
        ...summary,
        total_given: totalGiven,
        total_received: totalReceived,
        net_balance: netBalance
      }
    });
  } catch (err) {
    console.error('Person details error:', err);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
});

// Update person profile details
router.put('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const personId = req.params.id;
    const { person_name, mobile_number, notes } = req.body;

    if (!person_name || !person_name.trim()) {
      return res.status(400).json({ error: 'Person name is required' });
    }

    const normalized = normalizePersonName(person_name);

    // Check if another person with this normalized name exists
    const existing = db.prepare(`
      SELECT id FROM people WHERE user_id = ? AND normalized_name = ? AND id != ?
    `).get(userId, normalized, personId);

    if (existing) {
      return res.status(409).json({ error: 'Another person with this name already exists' });
    }

    const stmt = db.prepare(`
      UPDATE people
      SET person_name = ?, normalized_name = ?, mobile_number = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(person_name.trim(), normalized, mobile_number ? mobile_number.trim() : null, notes ? notes.trim() : null, personId, userId);

    res.json({ message: 'Person updated successfully' });
  } catch (err) {
    console.error('Update person error:', err);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Delete person and cascade all records
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const personId = req.params.id;

    const person = db.prepare('SELECT id FROM people WHERE id = ? AND user_id = ?').get(personId, userId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Database foreign key with ON DELETE CASCADE handles transactions
    db.prepare('DELETE FROM people WHERE id = ? AND user_id = ?').run(personId, userId);

    res.json({ message: 'Person and all their associated records deleted successfully' });
  } catch (err) {
    console.error('Delete person error:', err);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

module.exports = router;
