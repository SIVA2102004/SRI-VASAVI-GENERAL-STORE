import React, { useState } from 'react';
import { User, Shield, Info, Check, LogOut } from 'lucide-react';

export default function SettingsView({ user, onLogout }) {
  const [currencySymbol, setCurrencySymbol] = useState('₹ (INR)');

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-400">Account details and day book preferences</p>
      </div>

      {/* User Information */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Account</h3>
            <p className="text-xs text-slate-400">Your authenticated day book profile</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Full Name</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Email Address</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-xs rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Day Book</span>
          </button>
        </div>
      </div>

      {/* Security & Database Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Security & Architecture</h3>
            <p className="text-xs text-slate-400">Database encryption, isolated records, and performance</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Local SQLite Database with Write-Ahead Logging (WAL) enabled for instant I/O</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>User-level data isolation: SQL queries enforced with user_id parameterization</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Server-side normalized name matching prevents duplicate or mixed records</span>
          </div>
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Bcrypt salt rounds for secure password authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}
