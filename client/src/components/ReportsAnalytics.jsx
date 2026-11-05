import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar, BarChart3, PieChart as PieIcon, TrendingUp, Users, CreditCard } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

export default function ReportsAnalytics({ onSelectPerson }) {
  const [period, setPeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/reports', { params: { period } });
      setData(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-400">Deep-dive financial breakdown, payment modes, and top entities</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          {[
            { id: 'daily', label: 'Daily (30D)' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'yearly', label: 'Yearly' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === p.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Main Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-base text-slate-800 dark:text-white mb-1">
              Transaction Volume Trend ({period.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-400 mb-6">Given, Received, and Expense comparisons across time</p>

            <div className="h-72 w-full">
              {data?.time_breakdown?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.time_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
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
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No records to chart for this time period.
                </div>
              )}
            </div>
          </div>

          {/* Secondary 2-Column: Modes & Types Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Modes */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-1">Payment Method Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Volume grouped by payment method</p>

              <div className="space-y-3">
                {data?.payment_modes?.map((pm, i) => (
                  <div key={pm.payment_mode} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{pm.payment_mode}</span>
                      <span className="text-slate-400">({pm.count} records)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(pm.total_amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top People by Volume */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white mb-1">Top People by Volume</h3>
              <p className="text-xs text-slate-400 mb-4">Contacts with the highest financial activities</p>

              <div className="space-y-3">
                {data?.top_people?.map((tp) => (
                  <div 
                    key={tp.id} 
                    onClick={() => onSelectPerson(tp)}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{tp.person_name}</span>
                      <span className="text-slate-400 block text-[11px]">{tp.count} transactions</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(tp.total_volume)}</span>
                      <span className="text-[10px] text-slate-400 block">Total Volume</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
