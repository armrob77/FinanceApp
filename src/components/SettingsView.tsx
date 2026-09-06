import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Eye,
  EyeOff,
  Bell,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Globe,
  Sliders,
} from 'lucide-react';

interface SettingsViewProps {
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshAll }) => {
  const { user, profile, updateProfile, fetchWithAuth } = useAuth();
  const { showToast } = useToast();

  const [currency, setCurrency] = useState(profile?.currency || 'CAD');
  const [dateFormat, setDateFormat] = useState(profile?.dateFormat || 'YYYY-MM-DD');
  const [threshold, setThreshold] = useState(profile?.budgetAlertThreshold || 80);
  const [hideBalances, setHideBalances] = useState(profile?.hideBalances || false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile({
        currency,
        dateFormat,
        budgetAlertThreshold: Number(threshold),
        hideBalances,
      });
      showToast('Settings and preferences saved');
      onRefreshAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!window.confirm('Populate your account with realistic demo data (accounts, transactions, budgets, investments)? Existing data will be preserved.')) {
      return;
    }
    try {
      setSeeding(true);
      const res = await fetchWithAuth('/api/seed-demo', { method: 'POST' });
      if (res.ok) {
        showToast('Demo data seeded successfully!');
        onRefreshAll();
      } else {
        showToast('Failed to seed demo data', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error seeding demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearData = async () => {
    const confirmation = window.prompt(
      'Type "RESET" to confirm purging all your financial transactions, accounts, budgets, and investments:'
    );
    if (confirmation !== 'RESET') return;

    try {
      const res = await fetchWithAuth('/api/user/clear-data', { method: 'POST' });
      if (res.ok) {
        showToast('All financial data purged');
        onRefreshAll();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clear data', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-slate-500">
          Manage currency, privacy display options, and database management
        </p>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Localization & Formatting */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Currency & Regional Format</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Primary Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs shadow-2xs focus:outline-none focus:border-indigo-500"
              >
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                All dashboards, charts, and net worth reports will normalize to this currency.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs shadow-2xs focus:outline-none focus:border-indigo-500"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (UK/CA)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Budgeting & Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Budget Notifications & Thresholds</span>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Warning Threshold Alert: <strong className="text-indigo-600">{threshold}%</strong>
              </label>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full max-w-md accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Highlight budgets in amber when monthly category spending exceeds {threshold}% of limit.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Screen Mode */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Privacy & Public Screen Masking</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-900">Mask Account & Portfolio Balances</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                Obscures exact dollar figures on public screens or coffee shops
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHideBalances(!hideBalances)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                hideBalances
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{hideBalances ? 'Masked' : 'Visible'}</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Database & Data Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Cloud SQL Database & Infrastructure</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Database Engine</div>
              <div className="text-slate-500">Google Cloud SQL (PostgreSQL)</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Connected
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Authentication Service</div>
              <div className="text-slate-500">Firebase Auth & JWT Verification</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active
            </span>
          </div>
        </div>

        {/* Data Seeding & Purge Actions */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Seeding...' : 'Load Realistic Demo Dataset'}</span>
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold px-4 py-2 rounded-lg border border-rose-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge / Reset All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
