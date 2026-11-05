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

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('daybook_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePerson, setActivePerson] = useState(null); // When viewing person profile
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editRecordData, setEditRecordData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('daybook_theme') === 'dark';
  });

  // Track search query state
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

  // Check auth validity on mount
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
  };

  // Open person profile view
  const handleSelectPerson = (person) => {
    setActivePerson(person);
    setCurrentTab('person-profile');
  };

  // Open Record Modal for Adding
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
  };

  // Open Record Modal for Editing
  const handleOpenEditRecord = (tx) => {
    setEditRecordData(tx);
    setIsRecordModalOpen(true);
  };

  if (!user) {
    return <AuthModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-800 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'person-profile') {
            setActivePerson(null);
          }
        }} 
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar with Smart Name-Based Search prominently displayed */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center space-x-3 w-full max-w-xl">
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

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleOpenAddRecord()}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <span>+ Record</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'dashboard' && (
              <Dashboard 
                onQuickAdd={() => handleOpenAddRecord()}
                onSelectPerson={handleSelectPerson}
                onViewAllRecords={() => setCurrentTab('records')}
              />
            )}

            {currentTab === 'add-record' && (
              <div className="max-w-xl mx-auto py-6">
                <RecordModal 
                  isOpen={true} 
                  onClose={() => setCurrentTab('records')}
                  onRecordSaved={() => setCurrentTab('records')}
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
                onBack={() => setCurrentTab('people')}
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
              <BackupRestore onDataRestored={() => setCurrentTab('dashboard')} />
            )}

            {currentTab === 'settings' && (
              <SettingsView user={user} onLogout={handleLogout} />
            )}
          </div>
        </div>
      </main>

      {/* Global Add/Edit Transaction Modal */}
      <RecordModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecordSaved={() => {
          // Trigger reload by nudging state
          setIsRecordModalOpen(false);
          // if we are on person profile or records, it will auto-update
        }}
        editData={editRecordData}
      />
    </div>
  );
}
