import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { AccountItem } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';
import {
  CreditCard,
  Plus,
  Landmark,
  Archive,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  Wallet,
  ShieldCheck,
} from 'lucide-react';

interface AccountsViewProps {
  accounts: AccountItem[];
  onRefresh: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ accounts, onRefresh }) => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountItem['type']>('checking');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currency = profile?.currency || 'CAD';

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setType('checking');
    setInstitution('');
    setInitialBalance('0.00');
    setNotes('');
    setIsArchived(false);
    setModalOpen(true);
  };

  const openEditModal = (acc: AccountItem) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setInstitution(acc.institution || '');
    setInitialBalance(acc.initialBalance);
    setNotes(acc.notes || '');
    setIsArchived(acc.isArchived);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an account name', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        type,
        institution: institution.trim() || null,
        initialBalance: (parseFloat(initialBalance) || 0).toFixed(2),
        currency,
        notes: notes.trim() || null,
        isArchived,
      };

      let res;
      if (editingAccount) {
        res = await fetchWithAuth(`/api/accounts/${editingAccount.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth('/api/accounts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast(editingAccount ? 'Account updated' : 'Account created successfully');
        setModalOpen(false);
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save account', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (acc: AccountItem) => {
    try {
      const res = await fetchWithAuth(`/api/accounts/${acc.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: !acc.isArchived }),
      });
      if (res.ok) {
        showToast(acc.isArchived ? 'Account unarchived' : 'Account archived');
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle archive', 'error');
    }
  };

  // Summaries
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const archivedAccounts = accounts.filter((a) => a.isArchived);

  let totalLiquid = 0;
  let totalCreditDebt = 0;

  for (const a of activeAccounts) {
    const bal = parseFloat(a.currentBalance ?? a.initialBalance) || 0;
    if (a.type === 'credit_card') {
      if (bal > 0) totalCreditDebt += bal;
    } else {
      if (bal > 0) totalLiquid += bal;
      else totalCreditDebt += Math.abs(bal);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounts</h1>
          <p className="text-xs text-slate-500">
            Track bank accounts, credit cards, brokerage, and cash balances
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              Total Liquid Cash & Bank Balances
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(totalLiquid, currency)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              Total Credit Card & Revolving Debt
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {formatCurrency(totalCreditDebt, currency)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Active Accounts Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Active Accounts ({activeAccounts.length})
        </h2>
        {activeAccounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs shadow-sm">
            <p>No active accounts yet. Click "Add Account" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccounts.map((acc) => {
              const bal = parseFloat(acc.currentBalance ?? acc.initialBalance) || 0;
              const isCredit = acc.type === 'credit_card';
              return (
                <div
                  key={acc.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                          {acc.type.replace('_', ' ')}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{acc.name}</h3>
                        <p className="text-xs text-slate-500">{acc.institution || 'Self-managed'}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(acc)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[11px] text-slate-400 font-medium">Current Balance</div>
                      <div
                        className={`text-xl font-bold font-mono tracking-tight ${
                          isCredit && bal > 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(bal, currency)}
                      </div>
                    </div>
                  </div>

                  {acc.notes && (
                    <div className="mt-4 pt-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">
                      {acc.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">
            Archived Accounts ({archivedAccounts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {archivedAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-700">{acc.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {acc.institution} • {formatCurrency(parseFloat(acc.currentBalance ?? acc.initialBalance) || 0, currency)}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleArchive(acc)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-2.5 py-1 bg-white border border-slate-200 shadow-xs rounded-md cursor-pointer"
                >
                  Unarchive
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Checking, Wealthsimple TFSA, Visa Infinite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Account Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AccountItem['type'])}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="retirement">Retirement (RRSP/TFSA/401k)</option>
                    <option value="cash">Cash / Wallet</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Institution / Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. TD, RBC, Chase, EQ Bank"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Initial / Starting Balance</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 4.5% interest rate, no annual fee"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:border-indigo-500"
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
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {editingAccount ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
