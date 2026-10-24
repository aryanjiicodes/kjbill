import React, { useState, useEffect } from 'react';
import {
  Customer,
  Invoice,
  AdvanceDeposit,
  InstallmentPlan,
  JewelleryOrder,
  InventoryItem,
  MetalRates,
  MetalRateHistoryEntry,
  ShopSettings,
  UserRole,
} from './types';
import { StorageService } from './services/storage';
import { openWhatsAppInvoice } from './utils/whatsapp';
import { Header, NavTab } from './components/Header';
import { PinModal } from './components/PinModal';
import { AuthLockScreen } from './components/AuthLockScreen';
import { Dashboard } from './components/Dashboard';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicesList } from './components/InvoicesList';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { CustomersView } from './components/CustomersView';
import { AdvanceDepositView } from './components/AdvanceDepositView';
import { InstallmentsView } from './components/InstallmentsView';
import { JewelleryOrdersView } from './components/JewelleryOrdersView';
import { InventoryView } from './components/InventoryView';
import { SettingsView } from './components/SettingsView';
import { fetchLiveBullionRates } from './services/goldApi';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    const remembered = localStorage.getItem('kj_unlocked_device');
    const session = sessionStorage.getItem('kj_unlocked_session');
    return Boolean(remembered || session);
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const role = (localStorage.getItem('kj_unlocked_device') || sessionStorage.getItem('kj_unlocked_session')) as UserRole;
    return role === 'Staff' ? 'Staff' : 'Owner';
  });
  const [showPinModal, setShowPinModal] = useState(false);

  // Core Data States
  const [settings, setSettings] = useState<ShopSettings>(StorageService.getSettings());
  const [rates, setRates] = useState<MetalRates>(StorageService.getRates());
  const [rateHistory, setRateHistory] = useState<MetalRateHistoryEntry[]>(StorageService.getRateHistory());
  const [customers, setCustomers] = useState<Customer[]>(StorageService.getCustomers());
  const [invoices, setInvoices] = useState<Invoice[]>(StorageService.getInvoices());
  const [advances, setAdvances] = useState<AdvanceDeposit[]>(StorageService.getAdvances());
  const [installments, setInstallments] = useState<InstallmentPlan[]>(StorageService.getInstallmentPlans());
  const [orders, setOrders] = useState<JewelleryOrder[]>(StorageService.getOrders());
  const [inventory, setInventory] = useState<InventoryItem[]>(StorageService.getInventory());
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isSyncingRates, setIsSyncingRates] = useState(false);

  useEffect(() => {
    // Initial fetch from Supabase Cloud
    StorageService.initCloudSync().then(() => {
      refreshAllData();
      // Auto-sync live bullion rates from custom-gold-api if in API mode
      const savedRates = StorageService.getRates();
      if (savedRates.rateMode !== 'manual') {
        handleSyncRatesFromApi();
      }
    });
  }, []);

  const handleSyncRatesFromApi = async (isBackground = false) => {
    if (isSyncingRates) return;

    const current = StorageService.getRates();
    if (isBackground && current.rateMode === 'manual') return;

    // In background auto-call, skip if already refreshed recently
    const intervalMinutes = current.autoSyncIntervalMinutes || 1;
    if (isBackground && current.updatedAt) {
      const elapsedMs = Date.now() - new Date(current.updatedAt).getTime();
      if (!isNaN(elapsedMs) && elapsedMs < (intervalMinutes * 60 * 1000) - 15000) {
        return;
      }
    }

    setIsSyncingRates(true);
    try {
      const live = await fetchLiveBullionRates(current.apiSource || 'default');
      const previousRates = {
        gold24k: current.gold24k !== live.gold24k ? current.gold24k : current.previousRates?.gold24k,
        gold22k: current.gold22k !== live.gold22k ? current.gold22k : current.previousRates?.gold22k,
        gold18k: current.gold18k !== live.gold18k ? current.gold18k : current.previousRates?.gold18k,
        gold14k: current.gold14k !== live.gold14k ? current.gold14k : current.previousRates?.gold14k,
        silver999: current.silver999 !== live.silver999 ? current.silver999 : current.previousRates?.silver999,
        silver925: current.silver925 !== live.silver925 ? current.silver925 : current.previousRates?.silver925,
      };

      const updatedRates: MetalRates = {
        ...current,
        gold24k: live.gold24k,
        gold22k: live.gold22k,
        gold18k: live.gold18k,
        gold14k: live.gold14k,
        silver999: live.silver999,
        silver925: live.silver925,
        updatedAt: live.timestamp,
        updatedBy: `Bullion API (${live.provider})`,
        rateMode: 'api',
        previousRates,
      };
      StorageService.saveRates(updatedRates, `Bullion API (${live.provider})`);
      setRates(updatedRates);
      setRateHistory(StorageService.getRateHistory());
    } catch (err) {
      console.warn('Live Bullion API sync notice:', err);
    } finally {
      setIsSyncingRates(false);
    }
  };

  // Background recurring timer (every 1 minute) with safe rate-limiting
  useEffect(() => {
    const intervalMinutes = rates.autoSyncIntervalMinutes || 1;
    if (rates.rateMode === 'manual' || intervalMinutes <= 0) return;

    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleSyncRatesFromApi(true);
      }
    }, intervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncRatesFromApi(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [rates.autoSyncIntervalMinutes, rates.rateMode, rates.apiSource]);

  const refreshAllData = () => {
    setSettings(StorageService.getSettings());
    setRates(StorageService.getRates());
    setRateHistory(StorageService.getRateHistory());
    setCustomers(StorageService.getCustomers());
    setInvoices(StorageService.getInvoices());
    setAdvances(StorageService.getAdvances());
    setInstallments(StorageService.getInstallmentPlans());
    setOrders(StorageService.getOrders());
    setInventory(StorageService.getInventory());
  };

  const currentStaffName =
    currentRole === 'Owner'
      ? settings.ownerName || 'DHANANJAY VERMA'
      : 'Counter Staff';

  const handleSaveInvoice = (
    invoice: Invoice,
    printImmediately: boolean,
    sendWhatsAppImmediately?: boolean,
    whatsappMobile?: string
  ) => {
    StorageService.saveInvoice(invoice);
    refreshAllData();
    if (printImmediately) {
      setPrintInvoice(invoice);
    }
    if (sendWhatsAppImmediately) {
      // Open print modal first (so user can download PDF to attach)
      setPrintInvoice(invoice);
      // Then open WhatsApp with the text message
      setTimeout(() => {
        openWhatsAppInvoice(invoice, settings, whatsappMobile);
      }, 300);
    }
    setActiveTab('invoices');
  };

  const handleUnlock = (role: UserRole, remember: boolean) => {
    setCurrentRole(role);
    setIsUnlocked(true);
    sessionStorage.setItem('kj_unlocked_session', role);
    if (remember) {
      localStorage.setItem('kj_unlocked_device', role);
    } else {
      localStorage.removeItem('kj_unlocked_device');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('kj_unlocked_session');
    localStorage.removeItem('kj_unlocked_device');
  };

  const handleConvertToInvoice = (order: JewelleryOrder) => {
    setActiveTab('billing');
  };

  if (!isUnlocked) {
    return <AuthLockScreen settings={settings} onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans flex flex-col selection:bg-amber-500/20 selection:text-amber-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        onOpenPinModal={() => setShowPinModal(true)}
        settings={settings}
        rates={rates}
        onNewInvoice={() => setActiveTab('billing')}
        onLock={handleLock}
        onSyncRates={handleSyncRatesFromApi}
        isSyncingRates={isSyncingRates}
      />

      {/* Main Content Area (Hidden during bill printing so dashboard never prints) */}
      <main className={`flex-1 pb-16 ${printInvoice ? 'print:hidden' : ''}`}>
        {activeTab === 'dashboard' && (
          <Dashboard
            invoices={invoices}
            customers={customers}
            advances={advances}
            installments={installments}
            orders={orders}
            inventory={inventory}
            rates={rates}
            settings={settings}
            setActiveTab={setActiveTab}
            onSelectInvoice={(inv) => setPrintInvoice(inv)}
          />
        )}

        {activeTab === 'billing' && (
          <InvoiceForm
            rates={rates}
            settings={settings}
            customers={customers}
            onSaveInvoice={handleSaveInvoice}
            onCancel={() => setActiveTab('dashboard')}
            currentStaffName={currentStaffName}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesList
            invoices={invoices}
            onSelectInvoice={(inv) => setPrintInvoice(inv)}
            onCreateNew={() => setActiveTab('billing')}
            settings={settings}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            invoices={invoices}
            advances={advances}
            installments={installments}
            onRefresh={refreshAllData}
            onSelectInvoice={(inv) => setPrintInvoice(inv)}
          />
        )}

        {activeTab === 'advances' && (
          <AdvanceDepositView
            advances={advances}
            customers={customers}
            rates={rates}
            settings={settings}
            currentStaffName={currentStaffName}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'installments' && (
          <InstallmentsView
            installments={installments}
            customers={customers}
            settings={settings}
            currentStaffName={currentStaffName}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'orders' && (
          <JewelleryOrdersView
            orders={orders}
            customers={customers}
            settings={settings}
            rates={rates}
            currentStaffName={currentStaffName}
            onRefresh={refreshAllData}
            onConvertToInvoice={handleConvertToInvoice}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            rates={rates}
            settings={settings}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            rates={rates}
            rateHistory={rateHistory}
            onRefresh={refreshAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-6 text-center text-xs text-stone-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-stone-800">{settings.businessName}</span> · Proprietor: {settings.ownerName} · New Ashok Nagar, Delhi
          </div>
          <div>
            Fast Counter Billing & Account Ledger · GST Ready
          </div>
        </div>
      </footer>

      {/* PIN Switch Modal */}
      {showPinModal && (
        <PinModal
          currentRole={currentRole}
          settings={settings}
          onSelectRole={(role) => setCurrentRole(role)}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* Invoice A4 Print Modal */}
      {printInvoice && (
        <InvoicePrintModal
          invoice={printInvoice}
          settings={settings}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}
