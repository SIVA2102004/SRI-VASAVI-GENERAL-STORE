import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  ArrowUpDown, 
  Calendar, 
  SlidersHorizontal,
  ChevronRight,
  User
} from 'lucide-react';
import api from '../services/api';
import DateFilterBar from './DateFilterBar';
import { formatCurrency, formatDate, getTypeBadge, exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';

export default function AllRecords({ 
  onSelectPerson, 
  onAddNewRecord, 
  onEditRecord, 
  initialSearchName = '',
  initialPersonId = null
}) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [personId, setPersonId] = useState(initialPersonId);
  const [personNameSearch, setPersonNameSearch] = useState(initialSearchName);
  const [dateFilters, setDateFilters] = useState({ preset: 'all', startDate: '', endDate: '' });
  const [transactionType, setTransactionType] = useState('All');
  const [paymentMode, setPaymentMode] = useState('All');
  const [textSearch, setTextSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  // Deletion Modal
  const [deleteConfirmTx, setDeleteConfirmTx] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialSearchName !== undefined) {
      setPersonNameSearch(initialSearchName);
    }
    if (initialPersonId !== undefined) {
      setPersonId(initialPersonId);
    }
  }, [initialSearchName, initialPersonId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        sort_order: sortOrder
      };

      if (personId) {
        params.person_id = personId;
      } else if (personNameSearch && personNameSearch.trim()) {
        params.person_name = personNameSearch.trim();
      }

      if (dateFilters.startDate) params.start_date = dateFilters.startDate;
      if (dateFilters.endDate) params.end_date = dateFilters.endDate;
      if (transactionType !== 'All') params.transaction_type = transactionType;
      if (paymentMode !== 'All') params.payment_mode = paymentMode;
      if (textSearch && textSearch.trim()) params.search = textSearch.trim();

      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions);
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 150);
    return () => clearTimeout(timer);
  }, [personId, personNameSearch, dateFilters, transactionType, paymentMode, textSearch, sortOrder]);

  const handleDelete = async () => {
    if (!deleteConfirmTx) return;
    setIsDeleting(true);
    try {
      await api.delete(`/transactions/${deleteConfirmTx.id}`);
      setDeleteConfirmTx(null);
      fetchTransactions();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearPersonFilter = () => {
    setPersonId(null);
    setPersonNameSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            All Day Book Transactions
          </h2>
          <p className="text-xs text-slate-400">
            Complete searchable ledger with simultaneous name & date filtering
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddNewRecord}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>

          <button
            onClick={() => exportToExcel(transactions, 'DayBook_Ledger.xlsx')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={() => exportToCSV(transactions, 'DayBook_Ledger.csv')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={() => exportToPDF(transactions, 'Day Book Comprehensive Statement')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="Export PDF"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Active Person Filter Banner */}
      {(personId || personNameSearch) && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-600 dark:text-slate-300">Filtered strictly by person:</span>
            <span className="font-bold text-blue-700 dark:text-blue-300">
              {transactions[0]?.person_name || personNameSearch || 'Selected Person'}
            </span>
          </div>
          <button
            onClick={handleClearPersonFilter}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold underline"
          >
            Show All People
          </button>
        </div>
      )}

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateFilters} activeFilters={dateFilters} />

      {/* Secondary Filter Controls: Text search, Type, Mode, Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Quick person or desc search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              placeholder="Search description, notes, ref #..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          {/* Transaction Type Filter */}
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Types</option>
            <option value="Amount Given">Amount Given</option>
            <option value="Amount Received">Amount Received</option>
            <option value="Expense">Expense</option>
            <option value="Loan Given">Loan Given</option>
            <option value="Loan Received">Loan Received</option>
            <option value="Other">Other</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Sort order toggle */}
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-lg transition"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>{sortOrder === 'desc' ? 'Date: Newest First' : 'Date: Oldest First'}</span>
        </button>
      </div>

      {/* Summary KPI Pills of Filtered Results */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Filtered Records</span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">{summary.total_count || 0}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Total Given</span>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summary.total_given || 0)}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Total Received</span>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.total_received || 0)}</p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400">Total Expense</span>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400">{formatCurrency(summary.expense || 0)}</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Person</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Description / Notes</th>
                <th className="py-3 px-4">Ref No.</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-xs">Loading day book records...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No records found</p>
                      <p className="text-xs">
                        Try modifying your date filter or search query.
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
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                        <button
                          onClick={() => onSelectPerson({ id: t.person_id, person_name: t.person_name })}
                          className="flex items-center space-x-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                          title="View person profile"
                        >
                          <span>{t.person_name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                        {t.mobile_number && (
                          <span className="text-[11px] text-slate-400 block font-normal">{t.mobile_number}</span>
                        )}
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
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="font-medium truncate">{t.description || '-'}</div>
                        {t.notes && <div className="text-[11px] text-slate-400 italic truncate mt-0.5">Note: {t.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                        {t.reference_number || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
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
              <strong className="text-rose-600">{formatCurrency(deleteConfirmTx.amount)}</strong>?
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
