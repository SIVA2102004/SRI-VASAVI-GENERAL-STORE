import React, { useState } from 'react';
import { Calendar, Filter, X, RotateCcw } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';

export default function DateFilterBar({ onFilterChange, activeFilters }) {
  const [preset, setPreset] = useState(activeFilters.preset || 'all');
  const [startDate, setStartDate] = useState(activeFilters.startDate || '');
  const [endDate, setEndDate] = useState(activeFilters.endDate || '');
  const [specificDate, setSpecificDate] = useState(activeFilters.specificDate || '');
  const [selectedMonth, setSelectedMonth] = useState(activeFilters.selectedMonth || '');
  const [selectedYear, setSelectedYear] = useState(activeFilters.selectedYear || new Date().getFullYear().toString());
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const applyPreset = (key) => {
    setPreset(key);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    let s = '';
    let e = '';

    switch (key) {
      case 'today':
        s = todayStr;
        e = todayStr;
        break;
      case 'yesterday':
        const yest = format(subDays(today, 1), 'yyyy-MM-dd');
        s = yest;
        e = yest;
        break;
      case 'last7':
        s = format(subDays(today, 6), 'yyyy-MM-dd');
        e = todayStr;
        break;
      case 'last30':
        s = format(subDays(today, 29), 'yyyy-MM-dd');
        e = todayStr;
        break;
      case 'thisMonth':
        s = format(startOfMonth(today), 'yyyy-MM-dd');
        e = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'prevMonth':
        const prevM = subMonths(today, 1);
        s = format(startOfMonth(prevM), 'yyyy-MM-dd');
        e = format(endOfMonth(prevM), 'yyyy-MM-dd');
        break;
      case 'thisYear':
        s = format(startOfYear(today), 'yyyy-MM-dd');
        e = format(endOfYear(today), 'yyyy-MM-dd');
        break;
      case 'all':
      default:
        s = '';
        e = '';
        break;
    }

    setStartDate(s);
    setEndDate(e);
    setSpecificDate('');
    onFilterChange({ preset: key, startDate: s, endDate: e });
  };

  const applyCustomRange = () => {
    setPreset('custom');
    onFilterChange({ preset: 'custom', startDate, endDate });
  };

  const applySpecificDate = (val) => {
    setSpecificDate(val);
    setPreset('specific');
    setStartDate(val);
    setEndDate(val);
    onFilterChange({ preset: 'specific', startDate: val, endDate: val, specificDate: val });
  };

  const applyMonthYear = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    setPreset('monthYear');
    if (m && y) {
      const date = new Date(parseInt(y), parseInt(m) - 1, 1);
      const s = format(startOfMonth(date), 'yyyy-MM-dd');
      const e = format(endOfMonth(date), 'yyyy-MM-dd');
      setStartDate(s);
      setEndDate(e);
      onFilterChange({ preset: 'monthYear', startDate: s, endDate: e, selectedMonth: m, selectedYear: y });
    }
  };

  const resetFilters = () => {
    applyPreset('all');
    setStartDate('');
    setEndDate('');
    setSpecificDate('');
    setSelectedMonth('');
    setIsCustomOpen(false);
  };

  const presets = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'prevMonth', label: 'Previous Month' },
    { key: 'thisYear', label: 'This Year' },
  ];

  const months = [
    { value: '01', name: 'Jan' },
    { value: '02', name: 'Feb' },
    { value: '03', name: 'Mar' },
    { value: '04', name: 'Apr' },
    { value: '05', name: 'May' },
    { value: '06', name: 'Jun' },
    { value: '07', name: 'Jul' },
    { value: '08', name: 'Aug' },
    { value: '09', name: 'Sep' },
    { value: '10', name: 'Oct' },
    { value: '11', name: 'Nov' },
    { value: '12', name: 'Dec' },
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
      {/* Quick Presets Row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center text-xs font-semibold text-slate-400 mr-2 uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 mr-1" />
          <span>Date Filter:</span>
        </div>

        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              preset === p.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}

        <button
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
            isCustomOpen || preset === 'custom' || preset === 'specific' || preset === 'monthYear'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Filter className="w-3 h-3 mr-1" />
          <span>Advanced / Custom</span>
        </button>

        {preset !== 'all' && (
          <button
            onClick={resetFilters}
            title="Reset Filters"
            className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Advanced Custom Drawer */}
      {isCustomOpen && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Custom Date Range */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Custom Range (From – To)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                />
              </div>
            </div>
            <button
              onClick={applyCustomRange}
              disabled={!startDate || !endDate}
              className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded text-xs transition"
            >
              Apply Range
            </button>
          </div>

          {/* Specific Single Date */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Specific Date</span>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Select Exact Day</label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => applySpecificDate(e.target.value)}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400">Shows all records matching only this selected date.</p>
          </div>

          {/* Month & Year Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Month & Year</span>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => applyMonthYear(e.target.value, selectedYear)}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
              >
                <option value="">Month...</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => applyMonthYear(selectedMonth, e.target.value)}
                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400">Filters full month of specified year.</p>
          </div>
        </div>
      )}

      {/* Active Filter Indicator Badge */}
      {(startDate || endDate) && (
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
          <span>Active filter:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {startDate || 'Any'} → {endDate || 'Any'}
          </span>
        </div>
      )}
    </div>
  );
}
