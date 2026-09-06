import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { BudgetItem, CategoryItem } from '../types.ts';
import { formatCurrency, formatPercent } from '../utils/format.ts';
import {
  PiggyBank,
  Plus,
  Copy,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface BudgetsViewProps {
  categories: CategoryItem[];
  onRefresh: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ categories, onRefresh }) => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);

  const currency = profile?.currency || 'CAD';
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/budgets?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount);
    if (!categoryName) {
      showToast('Please select a category', 'error');
      return;
    }
    if (!cleanAmt || cleanAmt <= 0) {
      showToast('Please enter a budget amount greater than 0', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetchWithAuth('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          month: selectedMonth,
          categoryName,
          amount: cleanAmt.toFixed(2),
          rollover,
        }),
      });

      if (res.ok) {
        showToast('Budget saved successfully');
        setModalOpen(false);
        setAmount('');
        fetchBudgets();
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save budget', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving budget', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPrevious = async () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const prevMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!window.confirm(`Copy all budgets from ${prevMonth} to ${selectedMonth}?`)) return;

    try {
      const res = await fetchWithAuth('/api/budgets/copy-previous', {
        method: 'POST',
        body: JSON.stringify({
          targetMonth: selectedMonth,
          prevMonth,
        }),
      });

      if (res.ok) {
        showToast(`Budgets copied from ${prevMonth}`);
        fetchBudgets();
        onRefresh();
      } else {
        showToast('No previous month budgets found to copy', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to copy budgets', 'error');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      const res = await fetchWithAuth(`/api/budgets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Budget removed');
        fetchBudgets();
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete budget', 'error');
    }
  };

  // Month navigation
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

  // Aggregate totals
  const totalBudgeted = budgets.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.actualSpent || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallUsedPct = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const alerts = budgets.filter((b) => b.status === 'red' || b.status === 'orange');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Budgets</h1>
          <p className="text-xs text-slate-500">
            Set and track spending limits by category with real-time pacing alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigator */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            <button
              onClick={handlePrevMonth}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded font-semibold cursor-pointer"
            >
              ←
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{selectedMonth}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 rounded font-semibold cursor-pointer"
            >
              →
            </button>
          </div>

          <button
            onClick={handleCopyPrevious}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Prev Month</span>
          </button>

          <button
            onClick={() => {
              setCategoryName(expenseCategories[0]?.name || '');
              setAmount('');
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Over-Budget Warnings ({alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-rose-800">
            {alerts.map((b) => (
              <div key={b.id} className="p-2.5 bg-white rounded-lg border border-rose-200 shadow-xs font-medium">
                {b.alertMessage}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Budgeted</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalBudgeted, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Spent</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(totalSpent, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Remaining Pool</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(totalRemaining, currency)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Overall Pace</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              overallUsedPct > 100 ? 'text-rose-600' : 'text-indigo-600'
            }`}
          >
            {overallUsedPct}%
          </div>
        </div>
      </div>

      {/* Budgets List */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Category Budgets for {selectedMonth} ({budgets.length})
          </h2>
          <span className="text-xs text-slate-500">
            Alert Threshold: {profile?.budgetAlertThreshold || 80}%
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading budgets...</div>
        ) : budgets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <p>No budgets configured for {selectedMonth}.</p>
            <p className="text-slate-500">
              Click "Set Budget" or "Copy Prev Month" to establish monthly spending goals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              const budgetVal = parseFloat(b.amount) || 0;
              const spent = b.actualSpent || 0;
              const remaining = b.remaining || 0;
              const pct = b.percentageUsed || 0;

              const barColor =
                b.status === 'red'
                  ? 'bg-rose-500'
                  : b.status === 'orange'
                  ? 'bg-amber-500'
                  : b.status === 'yellow'
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';

              const badgeColor =
                b.status === 'red'
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : b.status === 'orange'
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : b.status === 'yellow'
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200';

              return (
                <div
                  key={b.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{b.categoryName}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Spent {formatCurrency(spent, currency)} of {formatCurrency(budgetVal, currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badgeColor}`}
                      >
                        {pct}%
                      </span>
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-white transition-colors cursor-pointer"
                        title="Delete Budget"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      {remaining >= 0 ? (
                        <span className="text-emerald-600 font-semibold">
                          {formatCurrency(remaining, currency)} remaining
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold">
                          {formatCurrency(Math.abs(remaining), currency)} over budget
                        </span>
                      )}
                    </span>
                    {b.rollover && <span className="text-slate-400 italic">Rollover enabled</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set / Update Budget Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">
                Set Budget ({selectedMonth})
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Category</label>
                <select
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>Select Expense Category</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Monthly Limit ({currency})</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rollover}
                    onChange={(e) => setRollover(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Enable budget rollover to next month</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 -mx-6 -mb-6 p-4 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
