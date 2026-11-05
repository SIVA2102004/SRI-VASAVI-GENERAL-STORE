import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  Clock, 
  TrendingUp, 
  Plus, 
  FileSpreadsheet, 
  FileText,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '../services/api';
import { formatCurrency, formatDate, getTypeBadge, exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function Dashboard({ onQuickAdd, onSelectPerson, onViewAllRecords }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Records",
      value: metrics?.total_records || 0,
      subtext: "All-time logged transactions",
      icon: Receipt,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      border: "border-blue-100 dark:border-blue-900/40"
    },
    {
      title: "Today's Payments Given",
      value: formatCurrency(metrics?.today_payments || 0),
      subtext: "Amount & loans given today",
      icon: ArrowUpRight,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-rose-100 dark:border-rose-900/40"
    },
    {
      title: "Today's Amount Received",
      value: formatCurrency(metrics?.today_received || 0),
      subtext: "Money received today",
      icon: ArrowDownLeft,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-100 dark:border-emerald-900/40"
    },
    {
      title: "Today's Expenses",
      value: formatCurrency(metrics?.today_expenses || 0),
      subtext: "Daily miscellaneous costs",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-100 dark:border-amber-900/40"
    },
    {
      title: "Total Pending (Receivable)",
      value: formatCurrency(metrics?.total_pending || 0),
      subtext: "Net balance owed to you by people",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      border: "border-orange-100 dark:border-orange-900/40"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Personal Digital Day Book</h2>
          <p className="text-blue-100 text-sm mt-1">
            Real-time balance, instant person lookup, and digital transaction history.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onQuickAdd}
            className="flex items-center space-x-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-sm rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add Record</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-xl bg-white dark:bg-slate-900 border ${card.border} shadow-xs flex flex-col justify-between transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.title}</span>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Monthly Transaction Overview</h3>
              <p className="text-xs text-slate-400">Comparing Payments Given, Received, and Expenses</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {metrics?.monthly_summary?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthly_summary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip 
                    formatter={(val) => formatCurrency(val)} 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="payments" name="Payments Given" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <span>No monthly transaction data available yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* All-time Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Financial Summary</h3>
            <p className="text-xs text-slate-400">All-time balance distribution</p>
            
            <div className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Money Given / Lent</span>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatCurrency(metrics?.all_time_given || 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Money Received</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(metrics?.all_time_received || 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Net Outstanding Balance</span>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {formatCurrency((metrics?.all_time_given || 0) - (metrics?.all_time_received || 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onViewAllRecords}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              Explore Full Day Book
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest records added to the day book</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportToExcel(metrics?.recent_transactions || [], 'Recent_Transactions.xlsx')}
              className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition text-xs flex items-center space-x-1"
              title="Export to Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => exportToPDF(metrics?.recent_transactions || [], 'Recent Transactions Statement')}
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-xs flex items-center space-x-1"
              title="Export to PDF"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={onViewAllRecords}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-2"
            >
              View All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Person</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics?.recent_transactions?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 text-sm">
                    No transactions yet. Click "Quick Add Record" above to create your first entry!
                  </td>
                </tr>
              ) : (
                metrics?.recent_transactions?.map((t) => {
                  const badge = getTypeBadge(t.transaction_type);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition cursor-pointer"
                      onClick={() => onSelectPerson({ id: t.person_id, person_name: t.person_name })}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(t.transaction_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center space-x-2">
                          <span>{t.person_name}</span>
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`}></span>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900 dark:text-white">
                        <span className={badge.sign === '+' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {badge.sign} {formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {t.payment_mode}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {t.description || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
