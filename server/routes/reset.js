const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Temporary reset route to wipe or clear user account so you can register fresh
router.post('/reset-user', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const trimmed = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(trimmed);

    if (!user) {
      return res.status(404).json({ message: `No account found for ${trimmed}. You can sign up right away!` });
    }

    // Delete user (foreign keys with CASCADE will delete all related people & transactions)
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    console.log(`User ${trimmed} (ID: ${user.id}) deleted from database.`);

    res.json({
      success: true,
      message: `Account for ${trimmed} has been completely removed. You can now register with any password of your choice!`
    });
  } catch (err) {
    console.error('Reset user error:', err);
    res.status(500).json({ error: 'Failed to reset user: ' + err.message });
  }
});

// Clear all users for a fresh start if needed
router.post('/reset-all', (req, res) => {
  try {
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM people').run();
    db.prepare('DELETE FROM users').run();

    res.json({ success: true, message: 'All users and records have been cleared. Database is brand new!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
