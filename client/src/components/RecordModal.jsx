import React, { useState, useEffect } from 'react';
import { Save, X, Calendar, User, Phone, IndianRupee, CreditCard, AlignLeft, Hash, StickyNote } from 'lucide-react';
import api from '../services/api';

export default function RecordModal({ isOpen, onClose, onRecordSaved, editData = null }) {
  const [formData, setFormData] = useState({
    person_name: '',
    mobile_number: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'Amount Given',
    amount: '',
    payment_mode: 'Cash',
    description: '',
    notes: '',
    reference_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [peopleSuggestions, setPeopleSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        person_name: editData.person_name || '',
        mobile_number: editData.mobile_number || '',
        transaction_date: editData.transaction_date || new Date().toISOString().split('T')[0],
        transaction_type: editData.transaction_type || 'Amount Given',
        amount: editData.amount ? editData.amount.toString() : '',
        payment_mode: editData.payment_mode || 'Cash',
        description: editData.description || '',
        notes: editData.notes || '',
        reference_number: editData.reference_number || ''
      });
    } else {
      setFormData({
        person_name: '',
        mobile_number: '',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'Amount Given',
        amount: '',
        payment_mode: 'Cash',
        description: '',
        notes: '',
        reference_number: ''
      });
    }
    setError('');
  }, [editData, isOpen]);

  // Autocomplete existing people names
  const handleNameChange = async (val) => {
    setFormData(prev => ({ ...prev, person_name: val }));
    if (val.trim().length > 0) {
      try {
        const res = await api.get('/people/search', { params: { q: val } });
        setPeopleSuggestions(res.data);
        setShowSuggestions(true);
      } catch (e) {
        // silently fail
      }
    } else {
      setPeopleSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestedPerson = (person) => {
    setFormData(prev => ({
      ...prev,
      person_name: person.person_name,
      mobile_number: person.mobile_number || prev.mobile_number
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.person_name.trim()) {
      setError('Person name is required');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      if (editData && editData.id) {
        await api.put(`/transactions/${editData.id}`, formData);
      } else {
        await api.post('/transactions', formData);
      }
      onRecordSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save record. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const transactionTypes = [
    'Amount Given',
    'Amount Received',
    'Expense',
    'Loan Given',
    'Loan Received',
    'Other'
  ];

  const paymentModes = [
    'Cash',
    'UPI',
    'Bank Transfer',
    'Cheque',
    'Other'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {editData ? 'Edit Day Book Record' : 'Add New Record'}
            </h3>
            <p className="text-xs text-slate-400">
              {editData ? 'Update transaction details' : 'Save daily transaction, payment, loan, or expense'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Person Name with Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Person Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                value={formData.person_name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  if (peopleSuggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="e.g. Ramesh Kumar"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && peopleSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {peopleSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectSuggestedPerson(p)}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs flex justify-between items-center"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.person_name}</span>
                    <span className="text-slate-400">{p.mobile_number || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mobile & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number (Optional)
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Type & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {transactionTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode & Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / UTR / Cheque No.
              </label>
              <div className="relative flex items-center">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="e.g. UPI-12345678"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Purpose / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Purpose / Description
            </label>
            <div className="relative flex items-center">
              <AlignLeft className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Monthly maintenance, Site loan, Travel refund"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Additional Notes
            </label>
            <div className="relative">
              <StickyNote className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Private reminders, promises or remarks..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : editData ? 'Update Record' : 'Save Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
