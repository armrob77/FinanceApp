import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { AccountItem, AssetLiabilityItem, NetWorthSnapshotItem } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/format.ts';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Save,
  Layers,
  X,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

const ASSET_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#6366f1', '#f59e0b', '#ec4899'];
const DEBT_COLORS = ['#f43f5e', '#fb923c', '#e11d48', '#be123c', '#9f1239'];

interface NetWorthViewProps {
  accounts: AccountItem[];
  onRefresh: () => void;
}

export const NetWorthView: React.FC<NetWorthViewProps> = ({ accounts, onRefresh }) => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<AssetLiabilityItem[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshotItem[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetLiabilityItem | null>(null);
  const [kind, setKind] = useState<'asset' | 'liability'>('asset');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('real_estate');
  const [value, setValue] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currency = profile?.currency || 'CAD';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [alRes, snapRes, invRes] = await Promise.all([
        fetchWithAuth('/api/assets-liabilities'),
        fetchWithAuth('/api/net-worth/snapshots'),
        fetchWithAuth('/api/investments/overview'),
      ]);

      if (alRes.ok) {
        const alData = await alRes.json();
        setItems(alData);
      }
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        setSnapshots(snapData);
      }
      if (invRes.ok) {
        const invData = await invRes.json();
        setPortfolioValue(invData.summary?.totalPortfolioValue || 0);
      }
    } catch (err) {
      console.error('Failed to load net worth data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live assets and liabilities
  const manualAssets = items
    .filter((i) => i.kind === 'asset')
    .reduce((acc, i) => acc + (parseFloat(i.value) || 0), 0);

  const manualLiabilities = items
    .filter((i) => i.kind === 'liability')
    .reduce((acc, i) => acc + (parseFloat(i.value) || 0), 0);

  // Liquid account cash
  let accountCash = 0;
  let creditDebt = 0;
  for (const acc of accounts) {
    if (acc.isArchived) continue;
    const b = parseFloat(acc.currentBalance ?? acc.initialBalance) || 0;
    if (acc.type === 'credit_card') {
      if (b > 0) creditDebt += b;
    } else {
      if (b > 0) accountCash += b;
      else creditDebt += Math.abs(b);
    }
  }

  const totalAssets = manualAssets + accountCash + portfolioValue;
  const totalLiabilities = manualLiabilities + creditDebt;
  const netWorth = totalAssets - totalLiabilities;

  // Open modal
  const openCreate = (k: 'asset' | 'liability') => {
    setEditingItem(null);
    setKind(k);
    setName('');
    setCategory(k === 'asset' ? 'real_estate' : 'mortgage');
    setValue('');
    setAsOfDate(new Date().toISOString().substring(0, 10));
    setNotes('');
    setModalOpen(true);
  };

  const openEdit = (item: AssetLiabilityItem) => {
    setEditingItem(item);
    setKind(item.kind);
    setName(item.name);
    setCategory(item.category);
    setValue(item.value);
    setAsOfDate(item.asOfDate);
    setNotes(item.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = parseFloat(value);
    if (!name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }
    if (!cleanVal || cleanVal <= 0) {
      showToast('Please enter a valid positive value', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        kind,
        category,
        value: cleanVal.toFixed(2),
        asOfDate,
        notes: notes.trim() || null,
      };

      let res;
      if (editingItem) {
        res = await fetchWithAuth(`/api/assets-liabilities/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth('/api/assets-liabilities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast(editingItem ? 'Item updated' : 'Item added successfully');
        setModalOpen(false);
        fetchData();
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save item', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      const res = await fetchWithAuth(`/api/assets-liabilities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Entry removed');
        fetchData();
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete entry', 'error');
    }
  };

  // Save current month snapshot
  const handleSaveSnapshot = async () => {
    const month = new Date().toISOString().substring(0, 7);
    try {
      const res = await fetchWithAuth('/api/net-worth/snapshots', {
        method: 'POST',
        body: JSON.stringify({
          month,
          assetsTotal: totalAssets,
          liabilitiesTotal: totalLiabilities,
        }),
      });
      if (res.ok) {
        showToast(`Saved net worth snapshot for ${month}`);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save snapshot', 'error');
    }
  };

  // Prepare chart data
  const chartData = [
    ...snapshots.map((s) => ({
      month: s.month,
      netWorth: parseFloat(s.netWorth) || 0,
      assets: parseFloat(s.assetsTotal) || 0,
      liabilities: parseFloat(s.liabilitiesTotal) || 0,
    })),
  ];

  // Asset breakdown
  const assetBreakdown = [
    { name: 'Liquid Cash & Bank Accounts', value: accountCash },
    { name: 'Investment Portfolio', value: portfolioValue },
    ...items
      .filter((i) => i.kind === 'asset')
      .map((i) => ({ name: i.name, value: parseFloat(i.value) || 0 })),
  ].filter((a) => a.value > 0);

  // Debt breakdown
  const debtBreakdown = [
    { name: 'Credit Card Balances', value: creditDebt },
    ...items
      .filter((i) => i.kind === 'liability')
      .map((i) => ({ name: i.name, value: parseFloat(i.value) || 0 })),
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Net Worth</h1>
          <p className="text-xs text-slate-500">
            Total Wealth = All Assets (Cash + Investments + Real Estate) minus Liabilities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveSnapshot}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span>Freeze Monthly Snapshot</span>
          </button>

          <button
            onClick={() => openCreate('asset')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Asset</span>
          </button>

          <button
            onClick={() => openCreate('liability')}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Liability</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Net Worth</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(netWorth, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-2">Assets minus all liabilities</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assets</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-600 tracking-tight">
            {formatCurrency(totalAssets, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-2">Cash, Portfolios, Properties, Vehicles</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Liabilities</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-600 tracking-tight">
            {formatCurrency(totalLiabilities, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-2">Mortgages, Student Loans, Cards</div>
        </div>
      </div>

      {/* Net Worth Trajectory Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Net Worth Progression</h2>
          <p className="text-xs text-slate-500 mb-4">Tracking your wealth accumulation milestones</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0f172a' }}
                  formatter={(val: any) => formatCurrency(Number(val), currency)}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  name="Net Worth"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#nwGrad2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Assets Breakdown</h2>
              <p className="text-xs text-slate-500">Total: {formatCurrency(totalAssets, currency)}</p>
            </div>
            <button
              onClick={() => openCreate('asset')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              + Add Asset
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {/* Automatic assets */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="font-semibold text-slate-900">Liquid Bank Accounts</div>
                <div className="text-slate-500">Checking, Savings & Cash</div>
              </div>
              <div className="font-bold text-emerald-600 font-mono text-sm">
                {formatCurrency(accountCash, currency)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="font-semibold text-slate-900">Investment Portfolios</div>
                <div className="text-slate-500">Equities, ETFs, Crypto</div>
              </div>
              <div className="font-bold text-emerald-600 font-mono text-sm">
                {formatCurrency(portfolioValue, currency)}
              </div>
            </div>

            {/* Manual Assets */}
            {items
              .filter((i) => i.kind === 'asset')
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="text-slate-500 capitalize">
                      {a.category.replace('_', ' ')} • As of {formatDate(a.asOfDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-emerald-600 font-mono text-sm">
                      {formatCurrency(parseFloat(a.value) || 0, currency)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Liabilities & Debt Breakdown</h2>
              <p className="text-xs text-slate-500">Total: {formatCurrency(totalLiabilities, currency)}</p>
            </div>
            <button
              onClick={() => openCreate('liability')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
            >
              + Add Liability
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {creditDebt > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Credit Card Balances</div>
                  <div className="text-slate-500">Revolving credit balances</div>
                </div>
                <div className="font-bold text-rose-600 font-mono text-sm">
                  {formatCurrency(creditDebt, currency)}
                </div>
              </div>
            )}

            {items
              .filter((i) => i.kind === 'liability')
              .map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{l.name}</div>
                    <div className="text-slate-500 capitalize">
                      {l.category.replace('_', ' ')} • As of {formatDate(l.asOfDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-rose-600 font-mono text-sm">
                      {formatCurrency(parseFloat(l.value) || 0, currency)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(l)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {items.filter((i) => i.kind === 'liability').length === 0 && creditDebt === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No debts or liabilities recorded. You are 100% debt-free!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Asset or Liability Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">
                {editingItem ? 'Edit Item' : kind === 'asset' ? 'Add Asset' : 'Add Liability'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Name *</label>
                <input
                  type="text"
                  required
                  placeholder={kind === 'asset' ? 'e.g. Primary Residence, Tesla Model 3' : 'e.g. Condo Mortgage, Student Loan'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 capitalize shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    {kind === 'asset' ? (
                      <>
                        <option value="real_estate">Real Estate</option>
                        <option value="vehicles">Vehicles</option>
                        <option value="business">Business Interests</option>
                        <option value="other_asset">Valuables / Other</option>
                      </>
                    ) : (
                      <>
                        <option value="mortgage">Mortgage</option>
                        <option value="student_loan">Student Loan</option>
                        <option value="auto_loan">Auto Loan</option>
                        <option value="personal_loan">Personal Loan</option>
                        <option value="other_liability">Other Debt</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Valuation ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">As Of Date</label>
                <input
                  type="date"
                  required
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 5-yr fixed 4.5%, appraisal based on comps"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                />
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
                  className={`font-semibold py-2 px-4 rounded-lg text-white disabled:opacity-50 shadow-sm cursor-pointer ${
                    kind === 'asset' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
