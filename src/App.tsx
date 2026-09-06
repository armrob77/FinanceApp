import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { Navigation } from './components/Navigation.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AddTransactionModal } from './components/AddTransactionModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TransactionsView } from './components/TransactionsView.tsx';
import { AccountsView } from './components/AccountsView.tsx';
import { BudgetsView } from './components/BudgetsView.tsx';
import { NetWorthView } from './components/NetWorthView.tsx';
import { InvestmentsView } from './components/InvestmentsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AccountItem, CategoryItem, NavigationTab, TransactionItem } from './types.ts';
import {
  ShieldCheck,
  TrendingUp,
  CreditCard,
  PiggyBank,
  LineChart,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const MainApplication: React.FC = () => {
  const { user, loading: authLoading, fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  // Global shared state
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAllData = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Fetch accounts and categories whenever user changes or refresh is triggered
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadGlobalData = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          fetchWithAuth('/api/accounts'),
          fetchWithAuth('/api/categories'),
        ]);

        if (isMounted) {
          if (accRes.ok) {
            const accData = await accRes.json();
            setAccounts(accData);
          }
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(catData);
          }
        }
      } catch (err) {
        console.error('Error fetching global accounts/categories:', err);
      }
    };

    loadGlobalData();
    return () => {
      isMounted = false;
    };
  }, [user, refreshTrigger]);

  const handleSeedDemo = async () => {
    try {
      setSeedLoading(true);
      const res = await fetchWithAuth('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        showToast('Demo data seeded successfully!');
        refreshAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to seed demo data', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error seeding demo data', 'error');
    } finally {
      setSeedLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-base font-semibold tracking-tight">WealthPulse</h2>
        <p className="text-xs text-zinc-500 mt-1">Connecting to Cloud SQL & verifying session...</p>
      </div>
    );
  }

  // Unauthenticated Landing Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans">
        {/* Navigation */}
        <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="font-bold text-slate-900 text-lg tracking-tight">WealthPulse</div>
          </div>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <span>Sign In / Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* Hero Section */}
        <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col items-center text-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full-Stack Personal Finance • Cloud SQL Powered</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-tight">
            Complete clarity over your entire financial life.
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Track income, expenses, budgets, multi-currency accounts, investment portfolios, and net worth
            growth — all secured by Google Cloud SQL and Firebase Authentication.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-200 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Core Feature Pillars */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 w-full text-left">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cash Flow & Accounts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log transactions, import bank CSVs, and reconcile checking, savings, and credit cards.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <PiggyBank className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Smart Budgets</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Category spending limits with pacing alerts (green, yellow, red) and month copy.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">True Net Worth</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated aggregation of liquid cash, real estate, debts, and monthly milestone snapshots.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                <LineChart className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Investment Holdings</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cost basis calculations, unrealized gains, dividends, and asset class distributions.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          WealthPulse Personal Finance Platform • Powered by Google Cloud SQL (PostgreSQL)
        </footer>

        {/* Auth Modal */}
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // Authenticated Workspace
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenQuickAdd={() => {
          setEditingTransaction(null);
          setQuickAddOpen(true);
        }}
        onSeedDemo={handleSeedDemo}
        seedLoading={seedLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-24 md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={(tab) => setCurrentTab(tab as NavigationTab)}
            onOpenAddTransaction={() => {
              setEditingTransaction(null);
              setQuickAddOpen(true);
            }}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            accounts={accounts}
            categories={categories}
            onOpenAddTransaction={() => {
              setEditingTransaction(null);
              setQuickAddOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setQuickAddOpen(true);
            }}
            onRefreshData={refreshAllData}
          />
        )}

        {currentTab === 'accounts' && (
          <AccountsView accounts={accounts} onRefresh={refreshAllData} />
        )}

        {currentTab === 'budgets' && (
          <BudgetsView categories={categories} onRefresh={refreshAllData} />
        )}

        {currentTab === 'net-worth' && (
          <NetWorthView accounts={accounts} onRefresh={refreshAllData} />
        )}

        {currentTab === 'investments' && (
          <InvestmentsView accounts={accounts} onRefresh={refreshAllData} />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'settings' && <SettingsView onRefreshAll={refreshAllData} />}
      </main>

      {/* Global Add / Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        editingTransaction={editingTransaction}
        onSuccess={refreshAllData}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApplication />
      </AuthProvider>
    </ToastProvider>
  );
}
