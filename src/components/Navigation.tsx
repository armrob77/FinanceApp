import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  CreditCard,
  PiggyBank,
  TrendingUp,
  LineChart,
  FileBarChart,
  Settings,
  PlusCircle,
  Database,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { NavigationTab } from '../types.ts';

interface NavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenQuickAdd: () => void;
  onSeedDemo: () => void;
  seedLoading: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAdd,
  onSeedDemo,
  seedLoading,
}) => {
  const { user, profile, signOut } = useAuth();

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'accounts', label: 'Accounts', icon: CreditCard },
    { id: 'budgets', label: 'Budgets', icon: PiggyBank },
    { id: 'net-worth', label: 'Net Worth', icon: TrendingUp },
    { id: 'investments', label: 'Investments', icon: LineChart },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-screen sticky top-0">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg tracking-tight leading-tight">WealthPulse</div>
              <div className="text-[11px] text-slate-500 font-medium">Personal Finance</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
            {profile?.currency || 'CAD'}
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-4 space-y-2">
          <button
            onClick={onOpenQuickAdd}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
          <button
            onClick={onSeedDemo}
            disabled={seedLoading}
            className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>{seedLoading ? 'Seeding Data...' : 'Seed Demo Data'}</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate max-w-[170px]">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.displayName || user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-3.5 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 text-base tracking-tight">WealthPulse</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenQuickAdd}
            className="p-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium flex items-center gap-1 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
            {profile?.currency || 'CAD'}
          </span>
          <button
            onClick={signOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-40 flex items-center justify-around py-1.5 shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
