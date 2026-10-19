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
import { Dashboard } from './components/Dashboard';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicesList } from './components/InvoicesList';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { CustomersView } from './components/CustomersView';
import { AdvanceDepositView } from './components/AdvanceDepositView';
import { InstallmentsView } from './components/InstallmentsView';
import { JewelleryOrdersView } from './components/JewelleryOrdersView';
import { InventoryView } from './components/InventoryView';
import { MetalRatesView } from './components/MetalRatesView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Owner');
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

  useEffect(() => {
    // Initial fetch from Supabase Cloud
    StorageService.initCloudSync().then(() => {
      refreshAllData();
    });
  }, []);

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

  const handleConvertToInvoice = (order: JewelleryOrder) => {
    setActiveTab('billing');
  };

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
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
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

        {activeTab === 'rates' && (
          <MetalRatesView
            rates={rates}
            rateHistory={rateHistory}
            currentStaffName={currentStaffName}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView settings={settings} onRefresh={refreshAllData} />
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
