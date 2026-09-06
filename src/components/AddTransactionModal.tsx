import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { AccountItem, CategoryItem, TransactionItem } from '../types.ts';
import { X, Check, Calendar, Tag, CreditCard, FileText, Repeat } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: AccountItem[];
  categories: CategoryItem[];
  editTransaction?: TransactionItem | null;
  editingTransaction?: TransactionItem | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  editTransaction,
  editingTransaction,
}) => {
  const activeTx = editTransaction || editingTransaction;
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [type, setType] = useState<'income' | 'expense'>(activeTx?.type || 'expense');
  const [amount, setAmount] = useState(activeTx?.amount || '');
  const [description, setDescription] = useState(activeTx?.description || '');
  const [categoryName, setCategoryName] = useState(activeTx?.categoryName || '');
  const [subcategory, setSubcategory] = useState(activeTx?.subcategory || '');
  const [accountId, setAccountId] = useState(activeTx?.accountId || accounts[0]?.id || '');
  const [date, setDate] = useState(activeTx?.date || new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState(activeTx?.notes || '');
  const [isRecurring, setIsRecurring] = useState(activeTx?.isRecurring || false);
  const [submitting, setSubmitting] = useState(false);

  // Sync when editTransaction changes
  React.useEffect(() => {
    if (activeTx) {
      setType(activeTx.type);
      setAmount(activeTx.amount);
      setDescription(activeTx.description);
      setCategoryName(activeTx.categoryName);
      setSubcategory(activeTx.subcategory || '');
      setAccountId(activeTx.accountId || accounts[0]?.id || '');
      setDate(activeTx.date);
      setNotes(activeTx.notes || '');
      setIsRecurring(activeTx.isRecurring || false);
    } else {
      setAmount('');
      setDescription('');
      const defaultCat = categories.find((c) => c.type === type)?.name || '';
      setCategoryName(defaultCat);
      setSubcategory('');
      setAccountId(accounts[0]?.id || '');
      setDate(new Date().toISOString().substring(0, 10));
      setNotes('');
      setIsRecurring(false);
    }
  }, [activeTx, isOpen]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount);
    if (!cleanAmount || cleanAmount <= 0) {
      showToast('Please enter a valid amount greater than 0', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please enter a description or merchant name', 'error');
      return;
    }
    if (!categoryName) {
      showToast('Please select a category', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        accountId: accountId || null,
        categoryName,
        subcategory: subcategory.trim() || null,
        date,
        description: description.trim(),
        amount: cleanAmount.toFixed(2),
        type,
        notes: notes.trim() || null,
        isRecurring,
      };

      let res;
      if (activeTx?.id) {
        res = await fetchWithAuth(`/api/transactions/${activeTx.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast(activeTx ? 'Transaction updated' : 'Transaction added successfully');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save transaction', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            {activeTx ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const firstExp = categories.find((c) => c.type === 'expense')?.name || '';
                setCategoryName(firstExp);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const firstInc = categories.find((c) => c.type === 'income')?.name || '';
                setCategoryName(firstInc);
              }}
              className={`py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Amount ({profile?.currency || 'CAD'})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Merchant</label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Grocery Store, Tech Corp Paycheck, Netflix"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <select
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="" disabled>Select Category</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Account</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="">(No specific account)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution || a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subcategory & Recurring */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subcategory (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Coffee, Taxi, Software"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div className="pt-4 sm:pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">Recurring Monthly</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Memo (Optional)</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{activeTx ? 'Update' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
