import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Wallet, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2,
  Calendar,
  Filter,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import DateFilterBar from './DateFilterBar';
import { formatCurrency, formatDate, getTypeBadge, exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function PersonProfile({ personId, onBack, onAddRecordForPerson, onEditRecord }) {
  const [person, setPerson] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering state
  const [dateFilters, setDateFilters] = useState({ preset: 'all', startDate: '', endDate: '' });
  const [selectedType, setSelectedType] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');

  // Delete modal state
  const [deleteConfirmTx, setDeleteConfirmTx] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch person info and transactions
  const loadPersonData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch Person Profile and Summary
      const resPerson = await api.get(`/people/${personId}`);
      setPerson(resPerson.data.person);
      setSummary(resPerson.data.summary);

      // 2. Fetch Transactions with strict isolation
      const params = {
        person_id: personId,
        sort_order: sortOrder
      };

      if (dateFilters.startDate) params.start_date = dateFilters.startDate;
      if (dateFilters.endDate) params.end_date = dateFilters.endDate;
      if (selectedType !== 'All') params.transaction_type = selectedType;
      if (selectedMode !== 'All') params.payment_mode = selectedMode;

      const resTx = await api.get('/transactions', { params });
      setTransactions(resTx.data.transactions);
    } catch (err) {
      console.error('Failed to load person data:', err);
      setError('Unable to load person profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      loadPersonData();
    }
  }, [personId, dateFilters, selectedType, selectedMode, sortOrder]);

  const handleDelete = async () => {
    if (!deleteConfirmTx) return;
    setIsDeleting(true);
    try {
      await api.delete(`/transactions/${deleteConfirmTx.id}`);
      setDeleteConfirmTx(null);
      loadPersonData();
    } catch (err) {
      alert('Failed to delete transaction: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !person) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-4">{error || 'Person record not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl"
        >
          Return to Previous View
        </button>
      </div>
    );
  }

  const netBalance = summary?.net_balance || 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {person.person_name.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {person.person_name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  Individual Profile
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                {person.mobile_number && (
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{person.mobile_number}</span>
                  </span>
                )}
                <span>Added: {formatDate(person.created_at?.split(' ')[0] || person.created_at?.split('T')[0])}</span>
              </div>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onAddRecordForPerson(person)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record for {person.person_name}</span>
            </button>

            <button
              onClick={() => exportToExcel(transactions, `${person.person_name}_DayBook_Transactions.xlsx`)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
              title="Download Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              onClick={() => exportToPDF(transactions, `Account Statement - ${person.person_name}`, `Contact: ${person.mobile_number || 'N/A'}`)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
              title="Download Statement PDF"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Person Individual Financial Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Total Given */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span className="text-xs font-semibold">Total Amount Given</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-2">
              {formatCurrency(summary?.total_given || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Payments & loans given</p>
          </div>

          {/* Total Received */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-semibold">Total Received</span>
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-2">
              {formatCurrency(summary?.total_received || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Payments & loans returned</p>
          </div>

          {/* Expenses */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-semibold">Total Expenses</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-2">
              {formatCurrency(summary?.total_expense || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Shared / associated costs</p>
          </div>

          {/* Net Balance */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <span className="text-xs font-semibold">Net Balance</span>
              <Wallet className="w-4 h-4" />
            </div>
            <p className={`text-xl font-bold font-mono mt-2 ${
              netBalance > 0 ? 'text-amber-600 dark:text-amber-400' : netBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {formatCurrency(Math.abs(netBalance))}
            </p>
            <p className="text-[11px] font-semibold mt-0.5 text-slate-500 dark:text-slate-400">
              {netBalance > 0 ? 'Pending (They owe you)' : netBalance < 0 ? 'Payable (You owe them)' : 'Settled / Zero'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter Integration */}
      <DateFilterBar onFilterChange={setDateFilters} activeFilters={dateFilters} />

      {/* Filter Row: Type, Payment Mode, Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
            >
              <option value="All">All Types</option>
              <option value="Amount Given">Amount Given</option>
              <option value="Amount Received">Amount Received</option>
              <option value="Expense">Expense</option>
              <option value="Loan Given">Loan Given</option>
              <option value="Loan Received">Loan Received</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400 font-medium">Mode:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
            >
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Sort Order */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Sort:</span>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition"
          >
            {sortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}
          </button>
        </div>
      </div>

      {/* Transactions Table for this person */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            Transaction History ({transactions.length} record{transactions.length === 1 ? '' : 's'})
          </h3>
          <p className="text-xs text-slate-400">
            Showing records exclusively belonging to <span className="font-semibold text-slate-700 dark:text-slate-300">{person.person_name}</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Purpose / Description</th>
                <th className="py-3 px-4">Ref No.</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No records found</p>
                      <p className="text-xs">
                        No transactions match the selected date or filter criteria for {person.person_name}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const badge = getTypeBadge(t.transaction_type);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(t.transaction_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`}></span>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold font-mono">
                        <span className={badge.sign === '+' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {badge.sign} {formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {t.payment_mode}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                        <div className="font-medium">{t.description || '-'}</div>
                        {t.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">Note: {t.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {t.reference_number || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => onEditRecord(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                          title="Edit transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmTx(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Confirm Delete Record</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this transaction for{' '}
              <strong className="text-slate-700 dark:text-slate-200">{deleteConfirmTx.person_name}</strong> of{' '}
              <strong className="text-rose-600">{formatCurrency(deleteConfirmTx.amount)}</strong> dated{' '}
              {formatDate(deleteConfirmTx.transaction_date)}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
