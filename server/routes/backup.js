const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db, dbPath } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const upload = multer({ dest: path.join(__dirname, '../uploads') });

// Backup route: export full user records or entire DB json
router.get('/export-json', (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(userId);
    const people = db.prepare('SELECT * FROM people WHERE user_id = ?').all(userId);
    const transactions = db.prepare(`
      SELECT t.*, p.person_name, p.mobile_number 
      FROM transactions t
      JOIN people p ON t.person_id = p.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date ASC
    `).all(userId);

    const backupData = {
      export_version: '1.0',
      export_timestamp: new Date().toISOString(),
      user,
      people,
      transactions
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=daybook-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Failed to create backup export' });
  }
});

// Restore route: restore records from JSON backup file
router.post('/restore-json', upload.single('backupFile'), (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const data = JSON.parse(fileContent);

    if (!data.people || !data.transactions) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid backup file structure' });
    }

    const insertPerson = db.prepare(`
      INSERT INTO people (user_id, person_name, normalized_name, mobile_number, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, normalized_name) DO UPDATE SET
        mobile_number = COALESCE(excluded.mobile_number, people.mobile_number),
        notes = COALESCE(excluded.notes, people.notes)
    `);

    const insertTx = db.prepare(`
      INSERT INTO transactions (
        user_id, person_id, transaction_date, transaction_type, amount, payment_mode, description, notes, reference_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Run within a transaction for safety and atomicity
    const runRestore = db.transaction(() => {
      // Create mapping of old person_id to new person_id
      const personIdMap = {};

      for (const p of data.people) {
        insertPerson.run(userId, p.person_name, p.normalized_name, p.mobile_number, p.notes);
        const resolved = db.prepare('SELECT id FROM people WHERE user_id = ? AND normalized_name = ?').get(userId, p.normalized_name);
        personIdMap[p.id] = resolved.id;
      }

      let restoredCount = 0;
      for (const t of data.transactions) {
        let pId = personIdMap[t.person_id];
        if (!pId && t.person_name) {
          // If old map didn't catch it, find or create by name
          const norm = t.person_name.trim().toLowerCase().replace(/\s+/g, ' ');
          let p = db.prepare('SELECT id FROM people WHERE user_id = ? AND normalized_name = ?').get(userId, norm);
          if (!p) {
            const ins = db.prepare('INSERT INTO people (user_id, person_name, normalized_name) VALUES (?, ?, ?)')
              .run(userId, t.person_name.trim(), norm);
            pId = ins.lastInsertRowid;
          } else {
            pId = p.id;
          }
        }

        if (pId) {
          insertTx.run(
            userId,
            pId,
            t.transaction_date,
            t.transaction_type,
            t.amount,
            t.payment_mode || 'Cash',
            t.description || null,
            t.notes || null,
            t.reference_number || null
          );
          restoredCount++;
        }
      }

      return restoredCount;
    });

    const count = runRestore();
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Data restored successfully! Restored ${count} transactions.`,
      restoredCount: count
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup data: ' + err.message });
  }
});

module.exports = router;
