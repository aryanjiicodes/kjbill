import React, { useState, useEffect } from 'react';
import { ShopSettings, MetalRates, MetalRateHistoryEntry } from '../types';
import { StorageService } from '../services/storage';
import { fetchLiveBullionRates, getRateTrend } from '../services/goldApi';
import { Settings, Save, Download, Upload, ShieldCheck, KeyRound, Building2, Database, RefreshCw, AlertTriangle, CheckCircle, CheckCircle2, X, TrendingUp, Globe, Sparkles, Trash2, RotateCcw, AlertOctagon } from 'lucide-react';

interface Props {
  settings: ShopSettings;
  rates?: MetalRates;
  rateHistory?: MetalRateHistoryEntry[];
  onRefresh: () => void;
}

export const SettingsView: React.FC<Props> = ({ settings, rates, onRefresh }) => {
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });

  // Metal Rates States (Bullion API or Manual)
  const currentRates = rates || StorageService.getRates();
  const [rateMode, setRateMode] = useState<'api' | 'manual'>(currentRates.rateMode || 'api');
  const [apiSource, setApiSource] = useState<'default' | 'ibja'>(currentRates.apiSource || 'default');
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState<number>(currentRates.autoSyncIntervalMinutes || 1);
  const [gold24k, setGold24k] = useState<number>(currentRates.gold24k || 14920);
  const [gold22k, setGold22k] = useState<number>(currentRates.gold22k || 13677);
  const [gold18k, setGold18k] = useState<number>(currentRates.gold18k || 11190);
  const [gold14k, setGold14k] = useState<number>(currentRates.gold14k || 8703);
  const [silver999, setSilver999] = useState<number>(currentRates.silver999 || 208);
  const [silver925, setSilver925] = useState<number>(currentRates.silver925 || 192);

  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [rateNotice, setRateNotice] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (settings && settings.businessName) {
      setFormData({ ...settings });
    }
  }, [settings]);

  useEffect(() => {
    if (rates) {
      setRateMode(rates.rateMode || 'api');
      setApiSource(rates.apiSource || 'default');
      setAutoSyncIntervalMinutes(rates.autoSyncIntervalMinutes || 1);
      setGold24k(rates.gold24k);
      setGold22k(rates.gold22k);
      setGold18k(rates.gold18k);
      setGold14k(rates.gold14k);
      setSilver999(rates.silver999);
      setSilver925(rates.silver925);
    }
  }, [rates]);

  const handleFetchApiRates = async () => {
    setIsFetchingRates(true);
    setRateNotice(null);
    setRateError(null);
    try {
      const res = await fetchLiveBullionRates(apiSource);
      setGold24k(res.gold24k);
      setGold22k(res.gold22k);
      setGold18k(res.gold18k);
      setGold14k(res.gold14k);
      setSilver999(res.silver999);
      setSilver925(res.silver925);
      setRateNotice(`Live rates fetched successfully from ${res.source}!`);

      const updatedRates: MetalRates = {
        ...(rates || StorageService.getRates()),
        gold24k: res.gold24k,
        gold22k: res.gold22k,
        gold18k: res.gold18k,
        gold14k: res.gold14k,
        silver999: res.silver999,
        silver925: res.silver925,
        rateMode: 'api',
        apiSource,
        autoSyncIntervalMinutes,
        updatedAt: res.timestamp,
        updatedBy: `Bullion API (${res.provider})`,
      };
      StorageService.saveRates(updatedRates, `Bullion API (${res.provider})`);
      onRefresh();
    } catch (err: any) {
      setRateError(err.message || 'Could not connect to custom-gold-api. You can enter rates manually below.');
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleAutoCalcGold = (val24k: number) => {
    setGold24k(val24k);
    if (val24k > 0) {
      setGold22k(Math.round(val24k * 0.916));
      setGold18k(Math.round(val24k * 0.75));
      setGold14k(Math.round(val24k * (14 / 24)));
    }
  };
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
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

  const [resetModal, setResetModal] = useState<'transactions' | 'factory' | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  useEffect(() => {
    if (showSaveModal) {
      const timer = setTimeout(() => setShowSaveModal(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [showSaveModal]);

  const handleConfirmReset = async () => {
    if (!resetModal) return;
    setIsResetting(true);
    try {
      if (resetModal === 'transactions') {
        const res = await StorageService.resetTransactions(true);
        onRefresh();
        setResetNotice(res.message);
      } else {
        const res = await StorageService.fullFactoryReset(true);
        onRefresh();
        setResetNotice(res.message);
      }
    } catch (err: any) {
      alert(`Reset error: ${err.message || 'Failed to complete reset'}`);
    } finally {
      setIsResetting(false);
      setResetModal(null);
    }
  };

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
    const sanitizedForm = {
      ...formData,
      accountName: formData.accountName ? formData.accountName.replace(/kamkhya/i, 'KAMAKHYA') : 'KAMAKHYA JEWELLERS',
    };
    StorageService.saveSettings(sanitizedForm);

    const updatedRates: MetalRates = {
      ...(rates || StorageService.getRates()),
      gold24k,
      gold22k,
      gold18k,
      gold14k,
      silver999,
      silver925,
      rateMode,
      apiSource,
      autoSyncIntervalMinutes,
      updatedAt: new Date().toISOString(),
      updatedBy: rateMode === 'api' ? 'Bullion API' : formData.ownerName || 'Manual Entry',
    };
    StorageService.saveRates(updatedRates, rateMode === 'api' ? 'Bullion API' : formData.ownerName || 'Manual Entry');

    onRefresh();
    setSavedSuccess(true);
    setShowSaveModal(true);
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

        {/* 2. Gold & Silver Metal Rates (Live API or Manual Entry) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                  2. Gold & Silver Metal Rates (Live Bullion API or Manual)
                </h2>
                <span className="text-[11px] text-stone-500">
                  Select whether counter billing rates are fetched automatically from custom-gold-api or entered manually.
                </span>
              </div>
            </div>

            {/* Mode Toggle Switch */}
            <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRateMode('api')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  rateMode === 'api'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Bullion API</span>
              </button>
              <button
                type="button"
                onClick={() => setRateMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  rateMode === 'manual'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>✍️ Add Manually</span>
              </button>
            </div>
          </div>

          {/* If API Mode */}
          {rateMode === 'api' && (
            <div className="space-y-4 bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        API Source:
                      </span>
                      <select
                        value={apiSource}
                        onChange={(e) => setApiSource(e.target.value as any)}
                        className="px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-stone-800 focus:outline-none"
                      >
                        <option value="default">All India Bullion (Surat - Smart API)</option>
                        <option value="ibja">Official IBJA (ibjarates.com)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Auto-Sync:
                      </span>
                      <select
                        value={autoSyncIntervalMinutes}
                        onChange={(e) => setAutoSyncIntervalMinutes(parseInt(e.target.value) || 1)}
                        className="px-2.5 py-1 text-xs bg-white border border-emerald-300 rounded-lg font-medium text-stone-800 focus:outline-none"
                      >
                        <option value="1">Every 1 Minute (Recommended for Live Showroom)</option>
                        <option value="2">Every 2 Minutes</option>
                        <option value="5">Every 5 Minutes</option>
                        <option value="10">Every 10 Minutes</option>
                        <option value="0">Disabled (Manual Only)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-mono">
                    Endpoint: https://custom-gold-api-pu4h.onrender.com/{apiSource === 'ibja' ? 'gold/ibja' : 'gold'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFetchApiRates}
                  disabled={isFetchingRates}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRates ? 'animate-spin' : ''}`} />
                  <span>{isFetchingRates ? 'Fetching Bullion API...' : 'Fetch Latest Rates Now'}</span>
                </button>
              </div>

              {/* Rate-limit Safe Protection Notice */}
              <div className="text-[11px] text-emerald-900 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300/80 flex items-center gap-1.5">
                <span className="text-xs">🛡️</span>
                <span>
                  <strong>Safe Auto-Poll Protection Active:</strong> Calls the live API every {autoSyncIntervalMinutes > 0 ? `${autoSyncIntervalMinutes} minutes` : 'manual check'} only when your showroom tab is active. Prevents rate-limits so your server and billing stay fast and smooth.
                </span>
              </div>

              {rateNotice && (
                <div className="bg-emerald-100 text-emerald-900 text-xs px-3 py-2 rounded-lg border border-emerald-300 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{rateNotice}</span>
                </div>
              )}

              {rateError && (
                <div className="bg-rose-100 text-rose-900 text-xs px-3 py-2 rounded-lg border border-rose-300 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{rateError}</span>
                </div>
              )}

              {/* Live Preview Cards with Up / Down Emojis (Standard Per 10g for Gold, Per Kg for Silver) */}
              {(() => {
                const trend24k = getRateTrend(gold24k, rates?.previousRates?.gold24k);
                const trend22k = getRateTrend(gold22k, rates?.previousRates?.gold22k);
                const trend18k = getRateTrend(gold18k, rates?.previousRates?.gold18k);
                const trendSilver = getRateTrend(silver999, rates?.previousRates?.silver999);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">Gold 24K (Pure)</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${trend24k.bgClass} ${trend24k.borderClass}`}>
                          {trend24k.emoji} {trend24k.diff > 0 ? `+₹${Math.round(trend24k.diff * 10)}/10g` : ''}
                        </span>
                      </div>
                      <span className="text-base font-bold font-mono text-amber-950">₹{(gold24k * 10).toLocaleString('en-IN')}/10g</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold24k.toFixed(1)}/g</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-amber-300 bg-amber-50/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-amber-800 font-semibold uppercase">Gold 22K (916)</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${trend22k.bgClass} ${trend22k.borderClass}`}>
                          {trend22k.emoji} {trend22k.diff > 0 ? `+₹${Math.round(trend22k.diff * 10)}/10g` : ''}
                        </span>
                      </div>
                      <span className="text-base font-bold font-mono text-amber-900">₹{(gold22k * 10).toLocaleString('en-IN')}/10g</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold22k.toFixed(1)}/g</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">Gold 18K (750)</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${trend18k.bgClass} ${trend18k.borderClass}`}>
                          {trend18k.emoji} {trend18k.diff > 0 ? `+₹${Math.round(trend18k.diff * 10)}/10g` : ''}
                        </span>
                      </div>
                      <span className="text-base font-bold font-mono text-stone-800">₹{(gold18k * 10).toLocaleString('en-IN')}/10g</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold18k.toFixed(1)}/g</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">Silver 999 (Pure)</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${trendSilver.bgClass} ${trendSilver.borderClass}`}>
                          {trendSilver.emoji} {trendSilver.diff > 0 ? `+₹${Math.round(trendSilver.diff * 1000)}/kg` : ''}
                        </span>
                      </div>
                      <span className="text-base font-bold font-mono text-slate-800">₹{Math.round(silver999 * 1000).toLocaleString('en-IN')}/kg</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">₹{silver999.toFixed(2)}/g</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* If Manual Mode (Standard Gold Per 10g, Silver Per Kg) */}
          {rateMode === 'manual' && (
            <div className="space-y-4 bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  Custom Manual Metal Rates (Standard ₹ / 10g Gold & ₹ / kg Silver)
                </span>
                <span className="text-[11px] text-stone-500">
                  Type 24K per 10g rate to auto-calculate other purities
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Gold 24K (Pure 999) - ₹ / 10g *
                  </label>
                  <input
                    type="number"
                    value={Math.round(gold24k * 10)}
                    onChange={(e) => {
                      const val10g = parseFloat(e.target.value) || 0;
                      handleAutoCalcGold(Math.round((val10g / 10) * 100) / 100);
                    }}
                    placeholder="e.g. 149200"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-amber-950"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold24k.toFixed(1)} / gram</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Gold 22K (Hallmark 916) - ₹ / 10g *
                  </label>
                  <input
                    type="number"
                    value={Math.round(gold22k * 10)}
                    onChange={(e) => {
                      const val10g = parseFloat(e.target.value) || 0;
                      setGold22k(Math.round((val10g / 10) * 100) / 100);
                    }}
                    placeholder="e.g. 136700"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-amber-900"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold22k.toFixed(1)} / gram</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Gold 18K (Hallmark 750) - ₹ / 10g
                  </label>
                  <input
                    type="number"
                    value={Math.round(gold18k * 10)}
                    onChange={(e) => {
                      const val10g = parseFloat(e.target.value) || 0;
                      setGold18k(Math.round((val10g / 10) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold18k.toFixed(1)} / gram</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Gold 14K (Economy 585) - ₹ / 10g
                  </label>
                  <input
                    type="number"
                    value={Math.round(gold14k * 10)}
                    onChange={(e) => {
                      const val10g = parseFloat(e.target.value) || 0;
                      setGold14k(Math.round((val10g / 10) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{gold14k.toFixed(1)} / gram</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Silver 999 (Pure) - ₹ / kg *
                  </label>
                  <input
                    type="number"
                    value={Math.round(silver999 * 1000)}
                    onChange={(e) => {
                      const valKg = parseFloat(e.target.value) || 0;
                      setSilver999(Math.round((valKg / 1000) * 100) / 100);
                    }}
                    placeholder="e.g. 208600"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-slate-800"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{silver999.toFixed(2)} / gram</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Silver 925 (Sterling) - ₹ / kg
                  </label>
                  <input
                    type="number"
                    value={Math.round(silver925 * 1000)}
                    onChange={(e) => {
                      const valKg = parseFloat(e.target.value) || 0;
                      setSilver925(Math.round((valKg / 1000) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">₹{silver925.toFixed(2)} / gram</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Bank Details & Scan to Pay QR */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              3. Bank Account Details (Printed on Invoices & Scan-to-Pay QR)
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

      {/* 4. Danger Zone: Reset Business Data */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 pb-2">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
              Danger Zone: Reset Showroom Data
            </h2>
          </div>
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            Irreversible Action
          </span>
        </div>

        <p className="text-xs text-stone-600">
          Clean up test data and reset transaction records (all tax invoices, customers, advance receipts, monthly installment schemes, orders, and stock). You can choose to keep your shop configuration (names, phone, bank account, and GSTIN) or perform a full factory reset.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setResetModal('transactions')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Transactions (Keep Shop Settings)</span>
          </button>

          <button
            type="button"
            onClick={() => setResetModal('factory')}
            className="px-4 py-2.5 bg-stone-100 hover:bg-rose-50 text-rose-800 hover:text-rose-900 font-bold text-xs rounded-xl flex items-center gap-2 border border-rose-300 transition-colors"
          >
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Full Factory Reset (Wipe Everything)</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset Data */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-stone-900">
                {resetModal === 'transactions'
                  ? 'Reset All Transaction Records?'
                  : 'Full Factory Reset Everything?'}
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                {resetModal === 'transactions'
                  ? 'This will permanently delete all finalized GST invoices, customer ledgers, advance bookings, monthly installment schemes, orders, and inventory. Your showroom details, address, and bank accounts will be safely preserved.'
                  : 'WARNING: This will completely wipe all showroom data, including shop settings, rates, security PINs, customers, invoices, and cloud database records.'}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm you want to proceed:</span>
              </div>
              <p className="text-[11px] text-rose-800">
                This action is immediate and cannot be recovered unless you previously saved a JSON backup.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModal(null)}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Yes, Delete & Reset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Notice Modal */}
      {resetNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Database Reset Complete!</h3>
              <p className="text-xs text-stone-600 mt-1">{resetNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setResetNotice(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              OK, Continue
            </button>
          </div>
        </div>
      )}
      {/* Settings Saved Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-6 text-center space-y-4 relative">
            <button
              onClick={() => setShowSaveModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-serif font-bold text-stone-900">
                Settings Saved Successfully!
              </h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Your shop details, GST rates, bank accounts, and invoice terms have been updated locally and synced to your cloud database.
              </p>
            </div>

            <div className="bg-stone-50 rounded-xl p-3.5 text-left text-xs space-y-2 border border-stone-200">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Showroom Name:</span>
                <span className="font-bold text-stone-900">{formData.businessName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Owner / Signatory:</span>
                <span className="font-semibold text-stone-800">{formData.ownerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">GSTIN:</span>
                <span className="font-mono font-bold text-stone-800">{formData.gstin || 'Not Configured'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Contact Phone:</span>
                <span className="font-mono font-semibold text-stone-800">+91 {formData.mobile}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Done / Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
