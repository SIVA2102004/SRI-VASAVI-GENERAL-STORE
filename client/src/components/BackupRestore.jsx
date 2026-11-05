import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function BackupRestore({ onDataRestored }) {
  const [file, setFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleDownloadBackup = async () => {
    try {
      const res = await api.get('/backup/export-json', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DayBook_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download backup: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!file) return;

    if (!window.confirm('Are you sure you want to restore data from this backup? Your existing records will be updated/merged.')) {
      return;
    }

    setRestoring(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('backupFile', file);

    try {
      const res = await api.post('/backup/restore-json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMessage({ type: 'success', text: res.data.message });
      setFile(null);
      if (onDataRestored) onDataRestored();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Restore failed' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Database Backup & Restore</h2>
        <p className="text-xs text-slate-400">Safeguard your day book records with one-click JSON snapshots and restoration</p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Export Database Snapshot</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Export all people, transactions, and notes into an authenticated JSON backup file. Keep this file safe on your computer or cloud drive.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Backup (.json)</span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Restore from Backup</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Select a previously exported Day Book JSON file to restore records. All data will be parsed, verified, and safely written to your database.
            </p>
          </div>

          <form onSubmit={handleRestore} className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
            />
            <button
              type="submit"
              disabled={!file || restoring}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{restoring ? 'Restoring Database...' : 'Restore Records Now'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
