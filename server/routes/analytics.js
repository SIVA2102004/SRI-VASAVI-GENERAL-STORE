const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/metrics', (req, res) => {
  try {
    const userId = req.user.id;
    // Current date format: YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // 'YYYY-MM'

    // 1. Total number of records
    const totalRecords = db.prepare('SELECT COUNT(id) as count FROM transactions WHERE user_id = ?').get(userId).count;

    // 2. Today's payments (Amount Given + Loan Given today)
    const todayPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE user_id = ? 
      AND transaction_date = ? 
      AND transaction_type IN ('Amount Given', 'Loan Given')
    `).get(userId, today).total;

    // 3. Today's received amounts (Amount Received + Loan Received today)
    const todayReceived = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE user_id = ? 
      AND transaction_date = ? 
      AND transaction_type IN ('Amount Received', 'Loan Received')
    `).get(userId, today).total;

    // 4. Today's expenses
    const todayExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE user_id = ? 
      AND transaction_date = ? 
      AND transaction_type = 'Expense'
    `).get(userId, today).total;

    // 5. Total pending amounts
    // Total given across all time minus total received across all time where positive
    const pendingSummary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as all_given,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as all_received
      FROM transactions
      WHERE user_id = ?
    `).get(userId);

    // Sum of net balances where individual people owe money
    const peopleBalances = db.prepare(`
      SELECT 
        person_id,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as balance
      FROM transactions
      WHERE user_id = ?
      GROUP BY person_id
      HAVING balance > 0
    `).all(userId);

    const totalPending = peopleBalances.reduce((acc, curr) => acc + curr.balance, 0);

    // 6. Recent transactions (Last 10)
    const recentTransactions = db.prepare(`
      SELECT 
        t.*,
        p.person_name,
        p.mobile_number
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT 10
    `).all(userId);

    // 7. Monthly transaction summary (Last 6-12 months breakdown)
    const monthlySummary = db.prepare(`
      SELECT 
        strftime('%Y-%m', transaction_date) as month,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as payments,
        COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expenses
      FROM transactions
      WHERE user_id = ?
      GROUP BY strftime('%Y-%m', transaction_date)
      ORDER BY month DESC
      LIMIT 12
    `).all(userId);

    res.json({
      total_records: totalRecords,
      today_payments: todayPayments,
      today_received: todayReceived,
      today_expenses: todayExpenses,
      total_pending: totalPending,
      all_time_given: pendingSummary.all_given,
      all_time_received: pendingSummary.all_received,
      recent_transactions: recentTransactions,
      monthly_summary: monthlySummary.reverse()
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Analytics & Reports API
router.get('/reports', (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly', year = new Date().getFullYear(), month } = req.query;

    let timeBreakdown = [];

    if (period === 'daily') {
      // Last 30 days daily
      timeBreakdown = db.prepare(`
        SELECT 
          transaction_date as label,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as payments,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
          COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expenses
        FROM transactions
        WHERE user_id = ? AND transaction_date >= date('now', '-30 days')
        GROUP BY transaction_date
        ORDER BY transaction_date ASC
      `).all(userId);
    } else if (period === 'weekly') {
      // Group by week
      timeBreakdown = db.prepare(`
        SELECT 
          strftime('%Y-W%W', transaction_date) as label,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as payments,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
          COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expenses
        FROM transactions
        WHERE user_id = ? AND transaction_date >= date('now', '-12 weeks')
        GROUP BY label
        ORDER BY label ASC
      `).all(userId);
    } else if (period === 'yearly') {
      timeBreakdown = db.prepare(`
        SELECT 
          strftime('%Y', transaction_date) as label,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as payments,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
          COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expenses
        FROM transactions
        WHERE user_id = ?
        GROUP BY label
        ORDER BY label ASC
      `).all(userId);
    } else {
      // Monthly for selected year
      timeBreakdown = db.prepare(`
        SELECT 
          strftime('%Y-%m', transaction_date) as label,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as payments,
          COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
          COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expenses
        FROM transactions
        WHERE user_id = ? AND strftime('%Y', transaction_date) = ?
        GROUP BY label
        ORDER BY label ASC
      `).all(userId, String(year));
    }

    // Payment method distribution
    const paymentModes = db.prepare(`
      SELECT 
        payment_mode,
        COUNT(id) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions
      WHERE user_id = ?
      GROUP BY payment_mode
      ORDER BY total_amount DESC
    `).all(userId);

    // Transaction type distribution
    const transactionTypes = db.prepare(`
      SELECT 
        transaction_type,
        COUNT(id) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM transactions
      WHERE user_id = ?
      GROUP BY transaction_type
      ORDER BY total_amount DESC
    `).all(userId);

    // Top people by transaction volume
    const topPeople = db.prepare(`
      SELECT 
        p.id,
        p.person_name,
        COUNT(t.id) as count,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Given', 'Loan Given') THEN t.amount ELSE 0 END), 0) as given,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Amount Received', 'Loan Received') THEN t.amount ELSE 0 END), 0) as received,
        COALESCE(SUM(t.amount), 0) as total_volume
      FROM people p
      JOIN transactions t ON t.person_id = p.id AND t.user_id = p.user_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY total_volume DESC
      LIMIT 10
    `).all(userId);

    res.json({
      time_breakdown: timeBreakdown,
      payment_modes: paymentModes,
      transaction_types: transactionTypes,
      top_people: topPeople
    });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

module.exports = router;
