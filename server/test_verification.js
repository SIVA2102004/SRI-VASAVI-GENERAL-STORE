const { db, normalizePersonName } = require('./db.js');
const bcrypt = require('bcryptjs');

console.log('--- RUNNING RIGOROUS VERIFICATION TEST SUITE ---');

// 1. Isolation check
const user1 = db.prepare('SELECT id FROM users WHERE email = ?').get('user1@test.com') ||
  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id')
    .get('User One', 'user1@test.com', 'hash1');

const user2 = db.prepare('SELECT id FROM users WHERE email = ?').get('user2@test.com') ||
  db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id')
    .get('User Two', 'user2@test.com', 'hash2');

console.log(`User1 ID: ${user1.id}, User2 ID: ${user2.id}`);

// 2. People normalization check
const p1Name = '  Ramesh    Kumar ';
const norm1 = normalizePersonName(p1Name);
console.log(`Normalized "${p1Name}" -> "${norm1}"`);
if (norm1 !== 'ramesh kumar') throw new Error('Normalization mismatch');

// Insert person for User 1
const p1 = db.prepare('INSERT INTO people (user_id, person_name, normalized_name, mobile_number) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, normalized_name) DO UPDATE SET mobile_number=excluded.mobile_number RETURNING *')
  .get(user1.id, 'Ramesh Kumar', norm1, '9876543210');

// Insert person with same name for User 2 (must be isolated and succeed)
const p2 = db.prepare('INSERT INTO people (user_id, person_name, normalized_name, mobile_number) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, normalized_name) DO UPDATE SET mobile_number=excluded.mobile_number RETURNING *')
  .get(user2.id, 'Ramesh Kumar', norm1, '9999999999');

console.log(`User1 Person ID: ${p1.id}, User2 Person ID: ${p2.id}`);
if (p1.id === p2.id) throw new Error('Multi-tenant data isolation failure!');

// 3. Transactions verification
db.prepare('DELETE FROM transactions WHERE user_id IN (?, ?)').run(user1.id, user2.id);

// Add Ramesh records for User 1
db.prepare('INSERT INTO transactions (user_id, person_id, transaction_date, transaction_type, amount, payment_mode, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(user1.id, p1.id, '2026-11-01', 'Amount Given', 5000, 'UPI', 'Advance');
db.prepare('INSERT INTO transactions (user_id, person_id, transaction_date, transaction_type, amount, payment_mode, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(user1.id, p1.id, '2026-11-02', 'Amount Received', 2000, 'Cash', 'Return');
db.prepare('INSERT INTO transactions (user_id, person_id, transaction_date, transaction_type, amount, payment_mode, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(user1.id, p1.id, '2026-11-03', 'Expense', 1000, 'Bank Transfer', 'Expense on Ramesh site');

// Add Ramesh records for User 2
db.prepare('INSERT INTO transactions (user_id, person_id, transaction_date, transaction_type, amount, payment_mode, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run(user2.id, p2.id, '2026-11-01', 'Amount Given', 99999, 'Cash', 'Secret payment user 2');

// 4. Strict Person & User Isolation verification
const u1RameshTxs = db.prepare(`
  SELECT t.*, p.person_name 
  FROM transactions t
  JOIN people p ON t.person_id = p.id
  WHERE t.user_id = ? AND t.person_id = ?
  ORDER BY t.transaction_date ASC
`).all(user1.id, p1.id);

console.log(`User1 Ramesh Txs count: ${u1RameshTxs.length}`);
if (u1RameshTxs.length !== 3) throw new Error('Expected 3 transactions for user1 Ramesh');

// Check that 99999 from user2 is NOT present
const leak = u1RameshTxs.find(t => t.amount === 99999);
if (leak) throw new Error('DATA LEAK DETECTED: User 2 transaction returned in User 1 query!');
console.log('✓ Strict Isolation verified: No leakage between users or persons.');

// 5. Test Date Filtering on Ramesh's records
const dateFiltered = db.prepare(`
  SELECT t.* FROM transactions t
  WHERE t.user_id = ? AND t.person_id = ? AND t.transaction_date BETWEEN ? AND ?
`).all(user1.id, p1.id, '2026-11-02', '2026-11-03');

console.log(`Filtered transactions (2026-11-02 to 2026-11-03): count=${dateFiltered.length}`);
if (dateFiltered.length !== 2) throw new Error('Date filter logic failed');
console.log('✓ Advanced Date Filtering verified.');

// 6. Balance calculations
const sum = db.prepare(`
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Given', 'Loan Given') THEN amount ELSE 0 END), 0) as given,
    COALESCE(SUM(CASE WHEN transaction_type IN ('Amount Received', 'Loan Received') THEN amount ELSE 0 END), 0) as received,
    COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as expense
  FROM transactions
  WHERE user_id = ? AND person_id = ?
`).get(user1.id, p1.id);

console.log('Financial sums for Ramesh:', sum);
if (sum.given !== 5000 || sum.received !== 2000 || sum.expense !== 1000) {
  throw new Error('Sum calculation mismatch');
}
console.log('✓ Financial calculations verified.');

console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
