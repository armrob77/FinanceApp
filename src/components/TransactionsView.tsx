import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { AccountItem, CategoryItem, TransactionItem } from '../types.ts';
import { formatCurrency, formatDate } from '../utils/format.ts';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CreditCard,
  ArrowUpDown,
  Repeat,
  X,
  FileSpreadsheet,
  Check,
  AlertCircle,
} from 'lucide-react';

interface TransactionsViewProps {
  accounts: AccountItem[];
  categories: CategoryItem[];
  onOpenAddTransaction: () => void;
  onEditTransaction: (tx: TransactionItem) => void;
  onRefreshData: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  accounts,
  categories,
  onOpenAddTransaction,
  onEditTransaction,
  onRefreshData,
}) => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  // CSV Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    date: 0,
    description: 1,
    amount: 2,
    category: 3,
    type: 4,
    account: 5,
  });
  const [importing, setImporting] = useState(false);

  const currency = profile?.currency || 'CAD';

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedAccount && selectedAccount !== 'all') params.set('accountId', selectedAccount);
      if (selectedType && selectedType !== 'all') params.set('type', selectedType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));

      const res = await fetchWithAuth(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, selectedCategory, selectedAccount, selectedType, startDate, endDate, sortBy, sortOrder, page]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Transaction deleted');
        fetchTransactions();
        onRefreshData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete transaction', 'error');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Subcategory', 'Description', 'Amount', 'Account', 'Notes', 'Recurring'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      `"${t.categoryName.replace(/"/g, '""')}"`,
      `"${(t.subcategory || '').replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      `"${(accounts.find((a) => a.id === t.accountId)?.name || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.isRecurring ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wealthpulse_transactions_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded');
  };

  // CSV File upload parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        showToast('CSV file is empty or missing data rows', 'error');
        return;
      }

      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const parsedHeaders = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map(parseCSVLine);

      setCsvHeaders(parsedHeaders);
      setCsvRows(dataRows);

      // Auto-guess column mapping
      const newMap = { ...mapping };
      parsedHeaders.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('date')) newMap.date = idx;
        else if (lower.includes('desc') || lower.includes('payee') || lower.includes('name')) newMap.description = idx;
        else if (lower.includes('amount') || lower.includes('value') || lower.includes('cost')) newMap.amount = idx;
        else if (lower.includes('cat')) newMap.category = idx;
        else if (lower.includes('type')) newMap.type = idx;
        else if (lower.includes('acc')) newMap.account = idx;
      });
      setMapping(newMap);
      setImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Submit CSV batch import
  const handleBatchImport = async () => {
    try {
      setImporting(true);
      const validTxs: any[] = [];
      const defaultAccount = accounts[0]?.id || null;

      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const dateRaw = row[mapping.date]?.trim();
        const descRaw = row[mapping.description]?.trim();
        const amtRaw = row[mapping.amount]?.replace(/[^0-9.-]+/g, '');
        const catRaw = row[mapping.category]?.trim() || 'Uncategorized';
        const typeRaw = row[mapping.type]?.toLowerCase()?.includes('inc') ? 'income' : 'expense';

        if (!dateRaw || !descRaw || !amtRaw || isNaN(parseFloat(amtRaw))) {
          continue; // skip invalid rows
        }

        // normalize date to YYYY-MM-DD
        let formattedDate = dateRaw;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          const parsedD = new Date(dateRaw);
          if (!isNaN(parsedD.getTime())) {
            formattedDate = parsedD.toISOString().substring(0, 10);
          } else {
            formattedDate = new Date().toISOString().substring(0, 10);
          }
        }

        validTxs.push({
          date: formattedDate,
          description: descRaw,
          amount: Math.abs(parseFloat(amtRaw)).toFixed(2),
          categoryName: catRaw,
          type: typeRaw,
          accountId: defaultAccount,
        });
      }

      if (validTxs.length === 0) {
        showToast('No valid transactions found to import', 'error');
        return;
      }

      const res = await fetchWithAuth('/api/transactions/batch', {
        method: 'POST',
        body: JSON.stringify(validTxs),
      });

      if (res.ok) {
        const json = await res.json();
        showToast(`Successfully imported ${json.count} transactions`);
        setImportModalOpen(false);
        fetchTransactions();
        onRefreshData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to import CSV', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error during batch import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Add custom category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetchWithAuth('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName.trim(), type: newCatType }),
      });
      if (res.ok) {
        showToast('Category created');
        setNewCatName('');
        setCategoryModalOpen(false);
        onRefreshData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-xs text-slate-500">
            {totalCount} total entries recorded across all accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import CSV input */}
          <label className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Categories Manager */}
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Categories</span>
          </button>

          {/* Add Transaction */}
          <button
            onClick={onOpenAddTransaction}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <Tag className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account filter */}
          <div className="relative">
            <CreditCard className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setPage(0);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => {
                setSelectedType('all');
                setPage(0);
              }}
              className={`py-1.5 rounded-md text-center font-semibold transition-all cursor-pointer ${
                selectedType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setSelectedType('income');
                setPage(0);
              }}
              className={`py-1.5 rounded-md text-center font-semibold transition-all cursor-pointer ${
                selectedType === 'income'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
            <button
              onClick={() => {
                setSelectedType('expense');
                setPage(0);
              }}
              className={`py-1.5 rounded-md text-center font-semibold transition-all cursor-pointer ${
                selectedType === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Date range filter and sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date range:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-900 text-xs shadow-xs focus:outline-none focus:border-indigo-500"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-900 text-xs shadow-xs focus:outline-none focus:border-indigo-500"
            />
            {(startDate || endDate || search || selectedCategory !== 'all' || selectedAccount !== 'all' || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedAccount('all');
                  setSelectedType('all');
                  setPage(0);
                }}
                className="text-indigo-600 hover:text-indigo-700 font-semibold underline ml-2 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                sortBy === 'date'
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Date</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('amount');
                  setSortOrder('desc');
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                sortBy === 'amount'
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Amount</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactions match your current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <span>{tx.description}</span>
                          {tx.isRecurring && (
                            <span title="Recurring monthly transaction">
                              <Repeat className="w-3 h-3 text-indigo-600 shrink-0" />
                            </span>
                          )}
                        </div>
                        {tx.notes && <div className="text-[11px] text-slate-400 mt-0.5">{tx.notes}</div>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {tx.categoryName}
                        </span>
                        {tx.subcategory && (
                          <span className="text-[11px] text-slate-400 ml-1.5">{tx.subcategory}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {acc ? acc.name : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap font-mono">
                        <span className={isIncome ? 'text-emerald-600' : 'text-slate-900'}>
                          {isIncome ? '+' : '-'}{formatCurrency(parseFloat(tx.amount) || 0, currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 shadow-xs font-medium cursor-pointer"
              >
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                className="px-3 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 shadow-xs font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal with Column Mapping */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-800">Import CSV Transactions</h2>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600">
                Found <strong>{csvRows.length}</strong> data rows. Map the columns from your CSV file to match WealthPulse fields:
              </p>

              {/* Mapping Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Date Column *</label>
                  <select
                    value={mapping.date}
                    onChange={(e) => setMapping({ ...mapping, date: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>Column {i + 1}: {h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Description / Payee *</label>
                  <select
                    value={mapping.description}
                    onChange={(e) => setMapping({ ...mapping, description: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>Column {i + 1}: {h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Amount Column *</label>
                  <select
                    value={mapping.amount}
                    onChange={(e) => setMapping({ ...mapping, amount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>Column {i + 1}: {h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Category Column</label>
                  <select
                    value={mapping.category}
                    onChange={(e) => setMapping({ ...mapping, category: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 shadow-xs focus:outline-none focus:border-indigo-500"
                  >
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>Column {i + 1}: {h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Preview (First 4 rows with current mapping)
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {csvRows.slice(0, 4).map((r, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-slate-500">{r[mapping.date] || '—'}</td>
                          <td className="p-2.5 font-medium">{r[mapping.description] || '—'}</td>
                          <td className="p-2.5 font-mono text-emerald-600 font-semibold">{r[mapping.amount] || '—'}</td>
                          <td className="p-2.5 text-slate-600">{r[mapping.category] || 'General'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchImport}
                disabled={importing}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{importing ? 'Importing...' : `Import ${csvRows.length} Transactions`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Manage Categories</h2>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create category form */}
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Gadgets, Freelance"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setNewCatType('expense')}
                  className={`py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    newCatType === 'expense'
                      ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewCatType('income')}
                  className={`py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    newCatType === 'income'
                      ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Income
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Add Category
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Existing Categories ({categories.length})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span className="text-slate-800 font-medium">{c.name}</span>
                      {c.isCustom && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">Custom</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
