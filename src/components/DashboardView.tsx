import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Percent,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DashboardSummary } from '../types.ts';
import { formatCurrency, formatPercent } from '../utils/format.ts';

const CATEGORY_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#71717a', // zinc
];

interface DashboardViewProps {
  onOpenAddTransaction: () => void;
  onNavigateToTab?: (tab: any) => void;
  onNavigate?: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddTransaction,
  onNavigateToTab,
  onNavigate,
}) => {
  const navigate = onNavigate || onNavigateToTab || (() => {});
  const { fetchWithAuth, profile } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );

  const currency = profile?.currency || data?.currency || 'CAD';

  const loadDashboard = async (month: string) => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/dashboard/summary?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedMonth);
  }, [selectedMonth]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-medium">Calculating financial metrics...</p>
        </div>
      </div>
    );
  }

  // Month selector navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-xs text-slate-500">
            Real-time snapshot of your net worth, cash flow, and investments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            <button
              onClick={handlePrevMonth}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            >
              ←
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-800">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{selectedMonth}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
            >
              →
            </button>
          </div>

          <button
            onClick={onOpenAddTransaction}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Budget Alerts Banner */}
      {data && data.alerts && data.alerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Budget Advisory Notice ({data.alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-900">
            {data.alerts.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/90 p-2.5 rounded-lg border border-amber-200/60 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Worth */}
        <div
          onClick={() => navigate('net-worth')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Worth</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(data?.netWorth || 0, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {(data?.netWorthGrowthPct ?? 0) >= 0 ? (
              <span className="text-emerald-600 flex items-center font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{data?.netWorthGrowthPct}%
              </span>
            ) : (
              <span className="text-rose-600 flex items-center font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {data?.netWorthGrowthPct}%
              </span>
            )}
            <span className="text-slate-400">vs last recorded month</span>
          </div>
        </div>

        {/* 2. Total Assets */}
        <div
          onClick={() => navigate('net-worth')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Assets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(data?.totalAssets || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Accounts + Real Estate + Portfolio</div>
        </div>

        {/* 3. Total Liabilities */}
        <div
          onClick={() => navigate('net-worth')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Liabilities</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight">
            {formatCurrency(data?.totalLiabilities || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Mortgages, Loans & Cards</div>
        </div>

        {/* 4. Portfolio Value */}
        <div
          onClick={() => navigate('investments')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Investments</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(data?.investmentPortfolioValue || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Equities, ETFs, Crypto</div>
        </div>

        {/* 5. Month Income */}
        <div
          onClick={() => navigate('transactions')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Income ({selectedMonth})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {formatCurrency(data?.currentMonthIncome || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Salary, Dividends & Other</div>
        </div>

        {/* 6. Month Expenses */}
        <div
          onClick={() => navigate('transactions')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses ({selectedMonth})</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(data?.currentMonthExpenses || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Living costs & Discretionary</div>
        </div>

        {/* 7. Month Net Cash Flow / Savings */}
        <div
          onClick={() => navigate('reports')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Cash Flow</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              (data?.currentMonthSavings ?? 0) >= 0 ? 'text-teal-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(data?.currentMonthSavings || 0, currency)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Income minus expenses</div>
        </div>

        {/* 8. Savings Rate */}
        <div
          onClick={() => navigate('reports')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Savings Rate</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 tracking-tight">
            {formatPercent(data?.savingsRate || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-400">Percentage of income retained</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Trend (BarChart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Monthly Cash Flow</h2>
              <p className="text-xs text-slate-400">Income vs Expenses over the last 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.incomeExpenseTrend || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => formatCurrency(Number(val), currency)}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="income" name="Income" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Worth Growth (AreaChart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Net Worth Trajectory</h2>
              <p className="text-xs text-slate-400">Historical snapshots and current valuation</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.netWorthTrend || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => formatCurrency(Number(val), currency)}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#nwGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts: Category Breakdown & Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Category Spending ({selectedMonth})</h2>
              <p className="text-xs text-slate-400">Where your funds were allocated</p>
            </div>
            <button
              onClick={() => navigate('transactions')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              View All
            </button>
          </div>

          {data?.expenseCategories && data.expenseCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {data.expenseCategories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#1e293b',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      formatter={(val: any) => formatCurrency(Number(val), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
                {data.expenseCategories.slice(0, 6).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-slate-900 font-bold">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                      <span className="text-slate-400 ml-1.5 font-normal">({cat.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
              <p>No expense transactions recorded in {selectedMonth}.</p>
              <button
                onClick={onOpenAddTransaction}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                + Add transaction
              </button>
            </div>
          )}
        </div>

        {/* Budget Utilization Progress */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Budget Utilization</h2>
              <p className="text-xs text-slate-400">Pacing against planned monthly spending</p>
            </div>
            <button
              onClick={() => navigate('budgets')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              Manage Budgets
            </button>
          </div>

          {data?.budgetProgress && data.budgetProgress.length > 0 ? (
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-2">
              {data.budgetProgress.map((b) => {
                const pct = Math.min(b.percentageUsed, 100);
                const colorClass =
                  b.status === 'red'
                    ? 'bg-rose-500'
                    : b.status === 'orange'
                    ? 'bg-amber-500'
                    : b.status === 'yellow'
                    ? 'bg-amber-400'
                    : 'bg-indigo-600';

                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium">{b.categoryName}</span>
                      <div className="text-right">
                        <span className="text-slate-500">
                          {formatCurrency(b.actualSpent, currency)} / {formatCurrency(parseFloat(b.amount) || 0, currency)}
                        </span>
                        <span
                          className={`ml-2 font-bold ${
                            b.status === 'red' ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {b.percentageUsed}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
              <p>No budgets configured for {selectedMonth}.</p>
              <button
                onClick={() => navigate('budgets')}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                Set up budgets
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
