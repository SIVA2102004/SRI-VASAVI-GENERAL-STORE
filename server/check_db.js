const { db, dbPath } = require('./db.js');

console.log('=== REAL DATABASE STATUS CHECK ===');
console.log('Database Path:', dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Active Tables in Database:', tables.map(t => t.name).join(', '));

const users = db.prepare('SELECT id, name, email FROM users').all();
console.log('\nUsers stored in DB:', users);

const people = db.prepare('SELECT id, person_name, mobile_number FROM people').all();
console.log('\nPeople registered in DB:', people);

const transactions = db.prepare(`
  SELECT t.id, t.transaction_date, p.person_name, t.transaction_type, t.amount, t.payment_mode, t.description
  FROM transactions t
  JOIN people p ON t.person_id = p.id
`).all();

console.log(`\nTransactions logged in DB (${transactions.length} records):`);
console.table(transactions);
