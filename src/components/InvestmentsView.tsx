import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { AccountItem, InvestmentTransactionItem, SecurityHoldingItem } from '../types.ts';
import { formatCurrency, formatDate, formatPercent } from '../utils/format.ts';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  PieChart as PieIcon,
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const ASSET_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

interface InvestmentsViewProps {
  accounts: AccountItem[];
  onRefresh: () => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({ accounts, onRefresh }) => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [holdings, setHoldings] = useState<SecurityHoldingItem[]>([]);
  const [allocation, setAllocation] = useState<{ name: string; value: number }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<InvestmentTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<SecurityHoldingItem | null>(null);

  // Trade form state
  const [tradeType, setTradeType] = useState<'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal'>('buy');
  const [symbol, setSymbol] = useState('');
  const [secName, setSecName] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().substring(0, 10));
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0.00');
  const [tradeAccountId, setTradeAccountId] = useState('');
  const [tradeNotes, setTradeNotes] = useState('');
  const [submittingTrade, setSubmittingTrade] = useState(false);

  // Price update form state
  const [newPrice, setNewPrice] = useState('');

  const currency = profile?.currency || 'CAD';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/investments/overview');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setHoldings(data.holdings);
        setAllocation(data.allocation);
        setRecentTransactions(data.recentTransactions);
      }
    } catch (err) {
      console.error('Failed to load investments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQty = parseFloat(quantity) || 0;
    const cleanPrice = parseFloat(price) || 0;
    const cleanFees = parseFloat(fees) || 0;

    if (!symbol.trim()) {
      showToast('Please enter a ticker symbol', 'error');
      return;
    }

    const totalAmount = (cleanQty * cleanPrice + cleanFees).toFixed(2);

    try {
      setSubmittingTrade(true);
      const res = await fetchWithAuth('/api/investments/transactions', {
        method: 'POST',
        body: JSON.stringify({
          securitySymbol: symbol.trim().toUpperCase(),
          securityName: secName.trim() || symbol.trim().toUpperCase(),
          type: tradeType,
          date: tradeDate,
          quantity: cleanQty.toFixed(4),
          price: cleanPrice.toFixed(2),
          fees: cleanFees.toFixed(2),
          totalAmount,
          accountId: tradeAccountId || null,
          notes: tradeNotes.trim() || null,
        }),
      });

      if (res.ok) {
        showToast('Investment transaction recorded');
        setTradeModalOpen(false);
        setSymbol('');
        setSecName('');
        setQuantity('');
        setPrice('');
        fetchData();
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to record transaction', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error recording transaction', 'error');
    } finally {
      setSubmittingTrade(false);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolding) return;
    const cleanPrice = parseFloat(newPrice);
    if (isNaN(cleanPrice) || cleanPrice < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    try {
      const res = await fetchWithAuth('/api/investments/holdings', {
        method: 'POST',
        body: JSON.stringify({
          symbol: selectedHolding.symbol,
          name: selectedHolding.name,
          assetType: selectedHolding.assetType,
          quantity: selectedHolding.quantity,
          averageCost: selectedHolding.averageCost,
          currentPrice: cleanPrice.toFixed(2),
          currency: selectedHolding.currency || 'CAD',
        }),
      });

      if (res.ok) {
        showToast(`Updated price for ${selectedHolding.symbol}`);
        setPriceModalOpen(false);
        fetchData();
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update price', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Delete this investment transaction?')) return;
    try {
      const res = await fetchWithAuth(`/api/investments/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Transaction deleted');
        fetchData();
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  const isGain = (summary?.totalGainLoss ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Investment Holdings</h1>
          <p className="text-xs text-slate-500">
            Track stocks, ETFs, mutual funds, and crypto with cost basis & performance calculations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTradeType('buy');
              setSymbol('');
              setSecName('');
              setQuantity('');
              setPrice('');
              setTradeAccountId(accounts.find((a) => a.type === 'brokerage')?.id || accounts[0]?.id || '');
              setTradeModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Trade / Dividend</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Portfolio Market Value</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(summary?.totalPortfolioValue || 0, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Across all holdings</div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Cost Basis</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(summary?.totalCostBasis || 0, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Principal invested + fees</div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Unrealized P&L</div>
          <div
            className={`text-2xl font-bold mt-1 flex items-center gap-1 ${
              isGain ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isGain ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            <span>{formatCurrency(summary?.totalGainLoss || 0, currency)}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Net profit / loss</div>
        </div>

        <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Return</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              isGain ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isGain ? '+' : ''}
            {formatPercent(summary?.totalReturnPercentage || 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">ROI percentage</div>
        </div>
      </div>

      {/* Main Holdings Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Current Holdings ({holdings.length})
          </h2>
          <span className="text-xs text-slate-500">
            Click edit to update current market price manually
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Shares / Qty</th>
                <th className="py-3 px-4 text-right">Avg Cost</th>
                <th className="py-3 px-4 text-right">Current Price</th>
                <th className="py-3 px-4 text-right">Market Value</th>
                <th className="py-3 px-4 text-right">Gain / Loss</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading investment holdings...
                  </td>
                </tr>
              ) : holdings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No investment holdings yet. Click "Record Trade" to log your first purchase.
                  </td>
                </tr>
              ) : (
                holdings.map((h) => {
                  const gain = h.gainLoss ?? 0;
                  const isHoldingGain = gain >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{h.symbol}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{h.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {h.assetType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {parseFloat(h.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(parseFloat(h.averageCost) || 0, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(parseFloat(h.currentPrice) || 0, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(h.marketValue ?? 0, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className={`font-semibold ${isHoldingGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isHoldingGain ? '+' : ''}{formatCurrency(gain, currency)}
                        </div>
                        <div className={`text-[10px] font-medium ${isHoldingGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isHoldingGain ? '+' : ''}{formatPercent(h.gainLossPercentage ?? 0)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedHolding(h);
                            setNewPrice(h.currentPrice);
                            setPriceModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                          title="Update Price"
                        >
                          Update Price
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Allocation & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Asset Allocation</h2>
          <p className="text-xs text-slate-500 mb-3">Portfolio distribution by class</p>

          {allocation.length > 0 ? (
            <div className="space-y-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {allocation.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={ASSET_COLORS[index % ASSET_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#0f172a' }}
                      formatter={(val: any) => formatCurrency(Number(val), currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5">
                {allocation.map((a, idx) => (
                  <div key={a.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }}
                      />
                      <span className="text-slate-600 font-medium">{a.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(a.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">No investments recorded yet.</div>
          )}
        </div>

        {/* Recent Investment Transactions */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Recent Investment Activity</h2>
          <p className="text-xs text-slate-500 mb-4">Historical purchases, sales, and dividend payouts</p>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No transactions recorded.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded ${
                        tx.type === 'buy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.type === 'sell'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {tx.type}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {tx.securitySymbol} {tx.securityName && `— ${tx.securityName}`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDate(tx.date)} • {parseFloat(tx.quantity) > 0 ? `${tx.quantity} shares @ ${formatCurrency(parseFloat(tx.price), currency)}` : 'Distribution'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {formatCurrency(parseFloat(tx.totalAmount), currency)}
                      </div>
                      {parseFloat(tx.fees) > 0 && (
                        <div className="text-[10px] text-slate-400">
                          Fee: {formatCurrency(parseFloat(tx.fees), currency)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Trade / Dividend Modal */}
      {tradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Record Investment Activity</h2>
              <button
                onClick={() => setTradeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTrade} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTradeType('buy')}
                  className={`py-1.5 rounded font-semibold cursor-pointer ${
                    tradeType === 'buy' ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('sell')}
                  className={`py-1.5 rounded font-semibold cursor-pointer ${
                    tradeType === 'sell' ? 'bg-white text-rose-700 shadow-xs border border-rose-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sell
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('dividend')}
                  className={`py-1.5 rounded font-semibold cursor-pointer ${
                    tradeType === 'dividend' ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dividend
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Ticker Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VFV, AAPL, BTC"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono uppercase shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Security Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vanguard S&P 500"
                    value={secName}
                    onChange={(e) => setSecName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Price / Share</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Fees</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    required
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Account</label>
                  <select
                    value={tradeAccountId}
                    onChange={(e) => setTradeAccountId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(No specific account)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 -mx-6 -mb-6 p-4 mt-4">
                <button
                  type="button"
                  onClick={() => setTradeModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTrade}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Holding Price Modal */}
      {priceModalOpen && selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">
                Update Price for {selectedHolding.symbol}
              </h2>
              <button
                onClick={() => setPriceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePrice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Current Market Price ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 -mx-6 -mb-6 p-4 mt-4">
                <button
                  type="button"
                  onClick={() => setPriceModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
