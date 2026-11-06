import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SmartSearchBar from './components/SmartSearchBar';
import Dashboard from './components/Dashboard';
import AllRecords from './components/AllRecords';
import PersonProfile from './components/PersonProfile';
import PeopleDirectory from './components/PeopleDirectory';
import ReportsAnalytics from './components/ReportsAnalytics';
import BackupRestore from './components/BackupRestore';
import SettingsView from './components/SettingsView';
import RecordModal from './components/RecordModal';
import AuthModal from './components/AuthModal';
import api from './services/api';
import { 
  Menu, 
  X, 
  Plus, 
  LayoutDashboard, 
  ReceiptText, 
  Users, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('daybook_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePerson, setActivePerson] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editRecordData, setEditRecordData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('daybook_theme') === 'dark';
  });

  const [searchPersonQuery, setSearchPersonQuery] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('daybook_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('daybook_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('daybook_token');
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('daybook_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('daybook_token');
          localStorage.removeItem('daybook_user');
          setUser(null);
        });
    }

    const handleAuthChange = () => {
      setUser(null);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('daybook_token');
    localStorage.removeItem('daybook_user');
    setUser(null);
    setActivePerson(null);
    setIsMobileMenuOpen(false);
  };

  const handleSelectPerson = (person) => {
    setActivePerson(person);
    setCurrentTab('person-profile');
    setIsMobileMenuOpen(false);
  };

  const handleOpenAddRecord = (prefillPerson = null) => {
    if (prefillPerson) {
      setEditRecordData({
        person_name: prefillPerson.person_name,
        mobile_number: prefillPerson.mobile_number || ''
      });
    } else {
      setEditRecordData(null);
    }
    setIsRecordModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const handleOpenEditRecord = (tx) => {
    setEditRecordData(tx);
    setIsRecordModalOpen(true);
  };

  const navigateTab = (tab) => {
    setCurrentTab(tab);
    if (tab !== 'person-profile') {
      setActivePerson(null);
    }
    setIsMobileMenuOpen(false);
  };

  if (!user) {
    return <AuthModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-100 select-none">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={navigateTab} 
          user={user}
          onLogout={handleLogout}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar 
              currentTab={currentTab} 
              setCurrentTab={navigateTab} 
              user={user}
              onLogout={handleLogout}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Responsive Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 z-30 shrink-0">
          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center space-x-2 lg:hidden shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-8 h-8 rounded-full object-cover border border-blue-500 shadow-xs" 
            />
          </div>

          {/* Search bar adapts to all device widths */}
          <div className="flex-1 max-w-xl">
            <SmartSearchBar 
              currentSearchQuery={searchPersonQuery}
              onSelectPerson={(person) => {
                setSearchPersonQuery(person.person_name);
                handleSelectPerson(person);
              }}
              onClearSearch={() => {
                setSearchPersonQuery('');
              }}
            />
          </div>

          {/* Add record quick action */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleOpenAddRecord()}
              className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Record</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport with responsive padding */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentTab === 'dashboard' && (
              <Dashboard 
                onQuickAdd={() => handleOpenAddRecord()}
                onSelectPerson={handleSelectPerson}
                onViewAllRecords={() => navigateTab('records')}
              />
            )}

            {currentTab === 'add-record' && (
              <div className="max-w-xl mx-auto py-2">
                <RecordModal 
                  isOpen={true} 
                  onClose={() => navigateTab('records')}
                  onRecordSaved={() => navigateTab('records')}
                  editData={null}
                />
              </div>
            )}

            {currentTab === 'records' && (
              <AllRecords 
                onSelectPerson={handleSelectPerson}
                onAddNewRecord={() => handleOpenAddRecord()}
                onEditRecord={handleOpenEditRecord}
              />
            )}

            {currentTab === 'person-profile' && activePerson && (
              <PersonProfile 
                personId={activePerson.id}
                onBack={() => navigateTab('people')}
                onAddRecordForPerson={(p) => handleOpenAddRecord(p)}
                onEditRecord={handleOpenEditRecord}
              />
            )}

            {currentTab === 'people' && (
              <PeopleDirectory 
                onSelectPerson={handleSelectPerson}
                onAddRecordForPerson={(p) => handleOpenAddRecord(p)}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsAnalytics onSelectPerson={handleSelectPerson} />
            )}

            {currentTab === 'backup' && (
              <BackupRestore onDataRestored={() => navigateTab('dashboard')} />
            )}

            {currentTab === 'settings' && (
              <SettingsView user={user} onLogout={handleLogout} />
            )}
          </div>
        </div>

        {/* Mobile Sticky Bottom Navigation Bar (Phone & Tablet) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-40">
          <button
            onClick={() => navigateTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition ${
              currentTab === 'dashboard' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => navigateTab('records')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition ${
              currentTab === 'records' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ReceiptText className="w-5 h-5 mb-0.5" />
            <span>Records</span>
          </button>

          {/* Center Floating Add Button */}
          <button
            onClick={() => handleOpenAddRecord()}
            className="w-11 h-11 -mt-5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition"
            title="Add Record"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={() => navigateTab('people')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition ${
              currentTab === 'people' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>People</span>
          </button>

          <button
            onClick={() => navigateTab('reports')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-semibold transition ${
              currentTab === 'reports' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>Reports</span>
          </button>
        </nav>
      </main>

      {/* Global Add/Edit Transaction Modal */}
      <RecordModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecordSaved={() => {
          setIsRecordModalOpen(false);
        }}
        editData={editRecordData}
      />
    </div>
  );
}
