import React, { useState, useEffect } from 'react';
import { ShopSettings } from '../types';
import { StorageService } from '../services/storage';
import { Settings, Save, Download, Upload, ShieldCheck, KeyRound, Building2, Database, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  settings: ShopSettings;
  onRefresh: () => void;
}

export const SettingsView: React.FC<Props> = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });

  useEffect(() => {
    if (settings && settings.businessName) {
      setFormData({ ...settings });
    }
  }, [settings]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ testing: boolean; result: { ok: boolean; message: string; code?: string } | null }>({
    testing: false,
    result: null,
  });
  const [syncStatus, setSyncStatus] = useState<{ syncing: boolean; message: string | null }>({
    syncing: false,
    message: null,
  });

  const handleTestDatabase = async () => {
    setDbStatus({ testing: true, result: null });
    const res = await StorageService.testConnection();
    setDbStatus({ testing: false, result: res });
  };

  const handleSyncToCloud = async () => {
    setSyncStatus({ syncing: true, message: null });
    const res = await StorageService.syncAllToCloud();
    setSyncStatus({ syncing: false, message: res.message });
    setTimeout(() => setSyncStatus((prev) => ({ ...prev, message: null })), 5000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData);
    onRefresh();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const backupJson = StorageService.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kamakhya_jewellers_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportBackup = () => {
    if (!importText.trim()) return;
    const success = StorageService.importBackup(importText);
    if (success) {
      alert('Backup imported successfully! Reloading...');
      window.location.reload();
    } else {
      alert('Failed to parse backup JSON. Please check file format.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Business Profile & System Setup
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Showroom Settings & GST Configuration
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure Kamakhya Jewellers shop branding, GSTIN, bank details, UPI scan QR, and counter PINs
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-300">
            Settings Saved Successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Shop Profile & Branding */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              1. Shop Profile & Official Legal Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Business / Showroom Name *
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Proprietor / Owner Name *
              </label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Registered Showroom Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Contact Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                GSTIN (Goods and Services Tax Identification Number)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="07AAACK1234F1Z8"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none uppercase"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Printed on all GST invoices. Leave placeholder or add active number.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Logo URL / Asset Path
              </label>
              <input
                type="text"
                value={formData.logoUrl || ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Bank Details & Scan to Pay QR */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              2. Bank Account Details (Printed on Invoices & Scan-to-Pay QR)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Account Beneficiary Name *
              </label>
              <input
                type="text"
                required
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-semibold uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Bank Account Number *
              </label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Shop UPI VPA ID (For Instant Counter QR Code Generation) *
              </label>
              <input
                type="text"
                required
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                placeholder="9818144011@okbizaxis"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none text-amber-900"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Customers can scan the dynamic QR on the bill with Google Pay, PhonePe, or Paytm to pay exact bill totals.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Counter PIN Access */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              3. Counter PIN Switch Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Owner PIN (Dhananjay Verma) *
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={formData.ownerPin}
                onChange={(e) => setFormData({ ...formData, ownerPin: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Default: 1234
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Counter Staff PIN *
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={formData.staffPin}
                onChange={(e) => setFormData({ ...formData, staffPin: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Default: 0000
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between bg-stone-900 p-4 rounded-xl text-white">
          <span className="text-xs text-stone-300">
            Changes will take effect immediately across all future billing transactions.
          </span>
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Cloud Database Sync & Diagnostics */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Cloud Database (Supabase) Connection
            </h2>
          </div>
          <span className="text-xs font-mono text-stone-500">
            https://tlxyazpkbalumggwdnrg.supabase.co
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Your invoices, customer records, and security PINs are synced to Supabase Cloud so all devices (mobile, counter PC, tablet) stay in sync in real time.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestDatabase}
            disabled={dbStatus.testing}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${dbStatus.testing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{dbStatus.testing ? 'Testing Connection...' : 'Test Database Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncToCloud}
            disabled={syncStatus.syncing}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>{syncStatus.syncing ? 'Syncing...' : 'Upload All Local Data to Cloud'}</span>
          </button>
        </div>

        {syncStatus.message && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
            {syncStatus.message}
          </div>
        )}

        {dbStatus.result && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              dbStatus.result.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {dbStatus.result.ok ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Database Connected Successfully!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Database Connection Issue</span>
                </>
              )}
            </div>
            <p className="font-mono text-xs">{dbStatus.result.message}</p>
            {dbStatus.result.code === '42501' && (
              <div className="mt-2 p-3 bg-white/80 rounded-lg border border-rose-300 font-sans text-stone-800 space-y-1.5">
                <p className="font-bold text-rose-900">How to Fix in 30 Seconds:</p>
                <p>In your Supabase Dashboard, go to <strong>SQL Editor</strong> and run:</p>
                <pre className="bg-stone-900 text-amber-300 p-2 rounded text-[11px] overflow-x-auto font-mono">
                  ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;
                </pre>
                <p className="text-[11px] text-stone-600">
                  (Or run the complete RLS unlock script provided in the assistant chat).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backup & Data Export Section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Data Backup & Offline Export
            </h2>
          </div>
        </div>

        <p className="text-xs text-stone-600">
          Export full showroom records (customers, invoices, advances, monthly plans, inventory, and metal rate audit history) as a standalone JSON backup file.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Business Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import / Restore Backup</span>
          </button>
        </div>

        {showImport && (
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-300 space-y-2">
            <label className="text-xs font-bold text-stone-800 block">
              Paste Backup JSON Content:
            </label>
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON content here..."
              className="w-full p-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none"
            />
            <button
              type="button"
              onClick={handleImportBackup}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Confirm Restore Database
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
