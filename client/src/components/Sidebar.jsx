import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ReceiptText, 
  Users, 
  BarChart3, 
  Settings, 
  Database,
  Moon,
  Sun,
  LogOut,
  BookOpen
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout, darkMode, setDarkMode }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add-record', label: 'Add Record', icon: PlusCircle },
    { id: 'records', label: 'All Records', icon: ReceiptText },
    { id: 'people', label: 'People', icon: Users },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen shrink-0 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
        <img 
          src="/logo.png" 
          alt="Sri Vasavi Logo" 
          className="w-11 h-11 rounded-full object-cover border-2 border-blue-500 shadow-md shrink-0" 
        />
        <div className="min-w-0">
          <h1 className="font-bold text-slate-800 dark:text-white tracking-tight leading-tight text-base truncate">
            Sri Vasavi
          </h1>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">General Store DayBook</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User info & theme toggle footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 transition"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
