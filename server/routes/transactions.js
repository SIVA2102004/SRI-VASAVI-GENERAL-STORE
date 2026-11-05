const express = require('express');
const { db, normalizePersonName } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Helper function to find or create person
function findOrCreatePerson(userId, personName, mobileNumber) {
  const normalized = normalizePersonName(personName);
  let person = db.prepare('SELECT * FROM people WHERE user_id = ? AND normalized_name = ?').get(userId, normalized);

  if (!person) {
    const insert = db.prepare(`
      INSERT INTO people (user_id, person_name, normalized_name, mobile_number)
      VALUES (?, ?, ?, ?)
    `);
    const info = insert.run(userId, personName.trim(), normalized, mobileNumber ? mobileNumber.trim() : null);
    person = db.prepare('SELECT * FROM people WHERE id = ?').get(info.lastInsertRowid);
  } else if (mobileNumber && (!person.mobile_number || person.mobile_number !== mobileNumber.trim())) {
    // Optionally update mobile number if previously blank
    db.prepare('UPDATE people SET mobile_number = ? WHERE id = ?').run(mobileNumber.trim(), person.id);
    person.mobile_number = mobileNumber.trim();
  }

  return person;
}

// 1. Get transactions with advanced filters (Strictly user-isolated and person-isolated)
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const {
      person_id,
      person_name, // If filtering by partial person name directly
      start_date,
      end_date,
      transaction_type,
      payment_mode,
      search, // search in description, notes, or reference number
      sort_order = 'desc', // 'asc' or 'desc'
      limit = 500,
      offset = 0
    } = req.query;

    let conditions = ['t.user_id = ?'];
    let params = [userId];

    if (person_id) {
      conditions.push('t.person_id = ?');
      params.push(person_id);
    } else if (person_name) {
      const normalized = normalizePersonName(person_name);
      conditions.push('p.normalized_name LIKE ?');
      params.push(`%${normalized}%`);
    }

    if (start_date) {
      conditions.push('t.transaction_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('t.transaction_date <= ?');
      params.push(end_date);
    }

    if (transaction_type && transaction_type !== 'All') {
      conditions.push('t.transaction_type = ?');
      params.push(transaction_type);
    }

    if (payment_mode && payment_mode !== 'All') {
      conditions.push('t.payment_mode = ?');
      params.push(payment_mode);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push('(t.description LIKE ? OR t.notes LIKE ? OR t.reference_number LIKE ?)');
      params.push(s, s, s);
    }

    const whereClause = conditions.join(' AND ');
    const orderDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Fetch transactions with joined Person details
    const query = `
      SELECT 
        t.*,
        p.person_name,
        p.mobile_number
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE ${whereClause}
      ORDER BY t.transaction_date ${orderDirection}, t.id ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const txParams = [...params, Number(limit), Number(offset)];
    const transactions = db.prepare(query).all(...txParams);

    // Summary calculation for the filtered dataset
    const summaryQuery = `
      SELECT 
        COUNT(t.id) as total_count,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Amount Given' THEN t.amount ELSE 0 END), 0) as amount_given,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Amount Received' THEN t.amount ELSE 0 END), 0) as amount_received,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Loan Given' THEN t.amount ELSE 0 END), 0) as loan_given,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Loan Received' THEN t.amount ELSE 0 END), 0) as loan_received,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' THEN t.amount ELSE 0 END), 0) as expense,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Other' THEN t.amount ELSE 0 END), 0) as other,
        COALESCE(SUM(t.amount), 0) as total_volume
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE ${whereClause}
    `;

    const summary = db.prepare(summaryQuery).get(...params);

    const totalGiven = summary.amount_given + summary.loan_given;
    const totalReceived = summary.amount_received + summary.loan_received;

    res.json({
      transactions,
      summary: {
        ...summary,
        total_given: totalGiven,
        total_received: totalReceived,
        net_balance: totalGiven - totalReceived
      }
    });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// 2. Get single transaction details
router.get('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    const tx = db.prepare(`
      SELECT 
        t.*,
        p.person_name,
        p.mobile_number
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(txId, userId);

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(tx);
  } catch (err) {
    console.error('Fetch single tx error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// 3. Create new transaction
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const {
      person_id,
      person_name,
      mobile_number,
      transaction_date,
      transaction_type,
      amount,
      payment_mode,
      description,
      notes,
      reference_number
    } = req.body;

    if (!person_name && !person_id) {
      return res.status(400).json({ error: 'Person name is required' });
    }

    if (!transaction_date) {
      return res.status(400).json({ error: 'Transaction date is required' });
    }

    if (!transaction_type) {
      return res.status(400).json({ error: 'Transaction type is required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    // Resolve person
    let finalPersonId = person_id;
    let finalPersonName = person_name;

    if (!finalPersonId) {
      const person = findOrCreatePerson(userId, person_name, mobile_number);
      finalPersonId = person.id;
      finalPersonName = person.person_name;
    } else {
      const existingPerson = db.prepare('SELECT * FROM people WHERE id = ? AND user_id = ?').get(finalPersonId, userId);
      if (!existingPerson) {
        return res.status(400).json({ error: 'Invalid person specified' });
      }
      finalPersonName = existingPerson.person_name;
    }

    const stmt = db.prepare(`
      INSERT INTO transactions (
        user_id,
        person_id,
        transaction_date,
        transaction_type,
        amount,
        payment_mode,
        description,
        notes,
        reference_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      userId,
      finalPersonId,
      transaction_date,
      transaction_type,
      numAmount,
      payment_mode || 'Cash',
      description ? description.trim() : null,
      notes ? notes.trim() : null,
      reference_number ? reference_number.trim() : null
    );

    const createdTx = db.prepare(`
      SELECT 
        t.*,
        p.person_name,
        p.mobile_number
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE t.id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json({
      message: 'Transaction saved successfully',
      transaction: createdTx
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// 4. Update transaction
router.put('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;
    const {
      person_id,
      person_name,
      mobile_number,
      transaction_date,
      transaction_type,
      amount,
      payment_mode,
      description,
      notes,
      reference_number
    } = req.body;

    const existingTx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(txId, userId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    let finalPersonId = person_id || existingTx.person_id;
    if (person_name) {
      const person = findOrCreatePerson(userId, person_name, mobile_number);
      finalPersonId = person.id;
    }

    const stmt = db.prepare(`
      UPDATE transactions
      SET 
        person_id = ?,
        transaction_date = ?,
        transaction_type = ?,
        amount = ?,
        payment_mode = ?,
        description = ?,
        notes = ?,
        reference_number = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      finalPersonId,
      transaction_date || existingTx.transaction_date,
      transaction_type || existingTx.transaction_type,
      numAmount,
      payment_mode || existingTx.payment_mode,
      description !== undefined ? (description ? description.trim() : null) : existingTx.description,
      notes !== undefined ? (notes ? notes.trim() : null) : existingTx.notes,
      reference_number !== undefined ? (reference_number ? reference_number.trim() : null) : existingTx.reference_number,
      txId,
      userId
    );

    const updatedTx = db.prepare(`
      SELECT 
        t.*,
        p.person_name,
        p.mobile_number
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE t.id = ?
    `).get(txId);

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// 5. Delete transaction
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const txId = req.params.id;

    const existingTx = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(txId, userId);
    if (!existingTx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(txId, userId);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
