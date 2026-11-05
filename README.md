# SRI-VASAVI-GENERAL-STORE
## Personal Digital Day Book – Smart Record Management System

A modern, fully functional Personal Digital Day Book designed to digitally manage daily business and personal transactions, credits, debits, expenses, loans, and customer ledgers.

---

### ✨ Features
- **Smart Name-Based Search:** Instant person lookup with autocomplete and strict name isolation.
- **Advanced Date Filtering:** Filter by Today, Yesterday, Last 7/30 Days, This Month, Year, or custom date ranges.
- **Individual Person Profiles:** Real-time net balances (receivable / payable) and complete account statements.
- **Financial Dashboard & Analytics:** Real-time metrics and charts for payments, receipts, and expenses.
- **Export & Backup:** One-click export to PDF, Excel, and CSV, plus complete JSON database backup and restore.
- **Hybrid Database:** Built with local SQLite storage and ready for Online Cloud Database (PostgreSQL via Neon / Supabase).

---

### 🚀 Getting Started

#### 1. Clone repository
```bash
git clone https://github.com/SIVA2102004/SRI-VASAVI-GENERAL-STORE.git
cd SRI-VASAVI-GENERAL-STORE
```

#### 2. Install dependencies
```bash
# Install root, server, and client dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

#### 3. Build & Run
```bash
# Build frontend
npm run build

# Start the application
npm start
```
Open [http://localhost:5000](http://localhost:5000) in your browser.
