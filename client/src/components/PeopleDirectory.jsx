import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Plus, 
  ChevronRight,
  Trash2,
  Edit2
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

export default function PeopleDirectory({ onSelectPerson, onAddRecordForPerson }) {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletePersonId, setDeletePersonId] = useState(null);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const res = await api.get('/people');
      setPeople(res.data);
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const filteredPeople = people.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.person_name.toLowerCase().includes(q) ||
      (p.mobile_number && p.mobile_number.includes(q))
    );
  });

  const handleDeletePerson = async (id) => {
    try {
      await api.delete(`/people/${id}`);
      setDeletePersonId(null);
      fetchPeople();
    } catch (err) {
      alert('Delete person failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">People Directory</h2>
          <p className="text-xs text-slate-400">All registered contacts and their outstanding balances</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search person or mobile..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* People Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">No people found</p>
          <p className="text-xs mt-1">When you record transactions with a person's name, they will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((person) => {
            const net = person.net_balance;
            return (
              <div
                key={person.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                        {person.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 
                          onClick={() => onSelectPerson(person)}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition text-base leading-tight"
                        >
                          {person.person_name}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          <span>{person.mobile_number || 'No mobile added'}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeletePersonId(person.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Delete person & history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Financial stats summary for card */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Given / Lent</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                        {formatCurrency(person.total_given)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Received</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(person.total_received)}
                      </span>
                    </div>
                  </div>

                  {/* Net Balance Pill */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Net Balance:</span>
                    <span className={`font-bold font-mono ${
                      net > 0 ? 'text-amber-600 dark:text-amber-400' : net < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                    }`}>
                      {formatCurrency(Math.abs(net))} {net > 0 ? '(Owed to you)' : net < 0 ? '(You owe)' : ''}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => onAddRecordForPerson(person)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Entry</span>
                  </button>

                  <button
                    onClick={() => onSelectPerson(person)}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 flex items-center space-x-0.5"
                  >
                    <span>Full History</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Person Confirmation Modal */}
      {deletePersonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Delete Person & All Records</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this person and all their day book transaction history? This cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeletePersonId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePerson(deletePersonId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
