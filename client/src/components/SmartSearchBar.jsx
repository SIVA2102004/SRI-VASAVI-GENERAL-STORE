import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function SmartSearchBar({ onSelectPerson, currentSearchQuery, onClearSearch }) {
  const [query, setQuery] = useState(currentSearchQuery || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(currentSearchQuery || '');
  }, [currentSearchQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/people/search', { params: { q: query.trim() } });
        setSuggestions(res.data);
        setIsOpen(true);
      } catch (err) {
        console.error('Autocomplete error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (person) => {
    setQuery(person.person_name);
    setIsOpen(false);
    onSelectPerson(person);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    if (onClearSearch) onClearSearch();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Smart Search: Type person's name (e.g. Ramesh)..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>Matching People</span>
            {isLoading && <span className="text-blue-500">Searching...</span>}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">
                {isLoading ? 'Searching...' : `No person found matching "${query}"`}
              </div>
            ) : (
              suggestions.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50/60 dark:hover:bg-blue-900/20 flex items-center justify-between group transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      {person.person_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {person.person_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {person.mobile_number ? `📱 ${person.mobile_number} • ` : ''}
                        {person.transaction_count} transaction{person.transaction_count === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
