import React from 'react';
import { UserRole, ShopSettings, MetalRates } from '../types';
import { Plus, ShieldCheck, User, Sparkles, TrendingUp, Lock } from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'billing'
  | 'invoices'
  | 'customers'
  | 'advances'
  | 'installments'
  | 'orders'
  | 'inventory'
  | 'rates'
  | 'settings';

interface Props {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentRole: UserRole;
  onOpenPinModal: () => void;
  settings: ShopSettings;
  rates: MetalRates;
  onNewInvoice: () => void;
  onLock: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  currentRole,
  onOpenPinModal,
  settings,
  rates,
  onNewInvoice,
  onLock,
}) => {
  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'billing', label: 'New Invoice' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'customers', label: 'Customers' },
    { id: 'advances', label: 'Advance Portal' },
    { id: 'installments', label: 'Installments' },
    { id: 'orders', label: 'Orders' },
    { id: 'inventory', label: 'Stock' },
    { id: 'rates', label: 'Daily Rates' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 print:hidden shadow-md">
      {/* Rate Ticker Bar */}
      <div className="bg-stone-950/90 border-b border-stone-800/80 px-4 py-1 text-xs text-stone-300 flex items-center justify-between overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold tracking-wide">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>TODAY'S DELHI RATES:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Gold 24K:</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">₹{rates.gold24k}/g</span>
          </div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Gold 22K (916):</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">₹{rates.gold22k}/g</span>
          </div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Gold 18K:</span>
            <span className="font-mono font-bold text-stone-200 tabular-nums">₹{rates.gold18k}/g</span>
          </div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Silver 999:</span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">₹{rates.silver999}/g</span>
          </div>
          <span className="text-stone-700">·</span>
          <div className="flex items-center gap-1">
            <span className="text-stone-400">Silver 925:</span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">₹{rates.silver925}/g</span>
          </div>
        </div>

        <div className="text-[11px] text-stone-400 hidden md:block">
          Owner: <span className="text-stone-200 font-semibold">{settings.ownerName}</span> · Mob: {settings.mobile}
        </div>
      </div>

      {/* Main Top Bar (Strict 3-zone contract) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Single text wordmark with brand emblem */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 text-left group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-lg group-hover:border-amber-400 transition-colors">
            KJ
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-wide text-amber-100 whitespace-nowrap group-hover:text-amber-300 transition-colors">
              {settings.businessName}
            </span>
            <span className="text-[10px] tracking-widest text-amber-400/80 uppercase font-medium">
              Delhi · Hallmark Atelier
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (Single-line, horizontal scroll on mobile) */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Counter PIN Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenPinModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
              currentRole === 'Owner'
                ? 'bg-amber-950/60 text-amber-200 border-amber-600/40 hover:bg-amber-900/60'
                : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
            }`}
            title="Click to Switch Role via PIN"
          >
            {currentRole === 'Owner' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>{currentRole === 'Owner' ? 'Dhananjay Verma' : 'Counter Staff'}</span>
          </button>

          <button
            onClick={onNewInvoice}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg whitespace-nowrap shrink-0 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Bill</span>
          </button>

          <button
            onClick={onLock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-rose-950 hover:border-rose-700/60 text-stone-400 hover:text-rose-300 border border-stone-700 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
            title="Lock Website / Sign Out"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>
    </header>
  );
};
