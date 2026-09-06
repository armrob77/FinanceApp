import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { formatCurrency, formatDate, formatPercent } from '../utils/format.ts';
import {
  FileBarChart,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CheckCircle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { fetchWithAuth, profile } = useAuth();
  const { showToast } = useToast();

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const currency = profile?.currency || report?.currency || 'CAD';

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/reports?start=${startDate}&end=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  // Presets
  const setPreset = (preset: 'ytd' | '30d' | '90d' | 'last_year') => {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    setEndDate(todayStr);

    if (preset === 'ytd') {
      setStartDate(`${today.getFullYear()}-01-01`);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().substring(0, 10));
    } else if (preset === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().substring(0, 10));
    } else if (preset === 'last_year') {
      setStartDate(`${today.getFullYear() - 1}-01-01`);
      setEndDate(`${today.getFullYear() - 1}-12-31`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const lines = [
      `Financial Report (${startDate} to ${endDate})`,
      `Generated on ${new Date().toLocaleDateString()}`,
      '',
      `Total Income,${report.totalIncome}`,
      `Total Expenses,${report.totalExpenses}`,
      `Net Cash Flow,${report.netCashFlow}`,
      `Savings Rate,${report.savingsRate}%`,
      `Current Net Worth,${report.netWorth}`,
      '',
      'Income Breakdown by Category:',
      'Category,Amount,Percentage',
      ...(report.incomeByCategory || []).map((c: any) => `"${c.name}",${c.amount},${c.percentage}%`),
      '',
      'Expense Breakdown by Category:',
      'Category,Amount,Percentage',
      ...(report.expensesByCategory || []).map((c: any) => `"${c.name}",${c.amount},${c.percentage}%`),
      '',
      'Largest Recorded Expenses:',
      'Date,Description,Category,Amount',
      ...(report.largestExpenses || []).map((e: any) => `${e.date},"${e.description}","${e.categoryName}",${e.amount}`),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `financial_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500">
            Comprehensive audit of cash flow, category distributions, savings, and wealth creation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-white" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector & Presets */}
      <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Reporting Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs shadow-2xs focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs shadow-2xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setPreset('ytd')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              YTD
            </button>
            <button
              onClick={() => setPreset('30d')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setPreset('90d')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setPreset('last_year')}
              className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Last Year
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Generating report...</div>
      ) : !report ? (
        <div className="py-16 text-center text-slate-400 text-xs">No data for selected period.</div>
      ) : (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Inflows</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(report.totalIncome, currency)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Outflows</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {formatCurrency(report.totalExpenses, currency)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Net Cash Flow</div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  report.netCashFlow >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(report.netCashFlow, currency)}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4.5 rounded-xl shadow-sm">
              <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Period Savings Rate</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {formatPercent(report.savingsRate)}
              </div>
            </div>
          </div>

          {/* Income and Expenses Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Income by Category</h2>
              {report.incomeByCategory.length === 0 ? (
                <div className="text-slate-400 text-xs py-4">No income recorded in this timeframe.</div>
              ) : (
                <div className="space-y-2">
                  {report.incomeByCategory.map((c: any) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-700 font-medium">{c.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold font-mono">
                          {formatCurrency(c.amount, currency)}
                        </span>
                        <span className="text-slate-500 ml-2">({c.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Expenses by Category</h2>
              {report.expensesByCategory.length === 0 ? (
                <div className="text-slate-400 text-xs py-4">No expenses recorded in this timeframe.</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {report.expensesByCategory.map((c: any) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-slate-700 font-medium">{c.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-900 font-bold font-mono">
                          {formatCurrency(c.amount, currency)}
                        </span>
                        <span className="text-slate-500 ml-2">({c.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Largest Outflows */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Top 10 Largest Expenses in Period</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.largestExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">No expenses recorded.</td>
                    </tr>
                  ) : (
                    report.largestExpenses.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(t.date)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{t.description}</td>
                        <td className="py-2.5 px-3 text-slate-600">{t.categoryName}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(parseFloat(t.amount) || 0, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
