const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// One-tap smart access: login or auto-register/auto-update password smoothly
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);

    if (!user) {
      // User doesn't exist yet -> automatically create the account with this password
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync(password, salt);
      const defaultName = trimmedEmail.split('@')[0].toUpperCase();

      const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
      const info = stmt.run(defaultName, trimmedEmail, password_hash);

      user = {
        id: info.lastInsertRowid,
        name: defaultName,
        email: trimmedEmail
      };
    } else {
      // User exists -> check password
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        // Automatically update to the new password entered by the user
        const salt = bcrypt.genSaltSync(10);
        const new_hash = bcrypt.hashSync(password, salt);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(new_hash, user.id);
        console.log(`Password auto-updated for user: ${trimmedEmail}`);
      }
    }

    // Generate authenticated session token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Access granted successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// Explicit registration (also auto-updates if already existing)
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const finalName = name && name.trim() ? name.trim() : trimmedEmail.split('@')[0].toUpperCase();

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);

    let userId;
    if (existing) {
      // Update name and password
      db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(finalName, password_hash, existing.id);
      userId = existing.id;
    } else {
      const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
      const info = stmt.run(finalName, trimmedEmail, password_hash);
      userId = info.lastInsertRowid;
    }

    const token = jwt.sign(
      { id: userId, email: trimmedEmail, name: finalName },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: 'Account saved successfully',
      token,
      user: {
        id: userId,
        name: finalName,
        email: trimmedEmail
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Get current profile
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

module.exports = router;
