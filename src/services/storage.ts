import {
  Customer,
  MetalRates,
  MetalRateHistoryEntry,
  Invoice,
  AdvanceDeposit,
  InstallmentPlan,
  InstallmentPayment,
  JewelleryOrder,
  InventoryItem,
  ShopSettings,
  OrderStatus,
} from '../types';
import {
  defaultSettings,
  defaultRates,
  defaultRateHistory,
  defaultCustomers,
  defaultInvoices,
  defaultAdvances,
  defaultInstallmentPlans,
  defaultOrders,
  defaultInventory,
} from './mockData';

const STORAGE_KEYS = {
  SETTINGS: 'kamakhya_settings',
  RATES: 'kamakhya_rates',
  RATE_HISTORY: 'kamakhya_rate_history',
  CUSTOMERS: 'kamakhya_customers',
  INVOICES: 'kamakhya_invoices',
  ADVANCES: 'kamakhya_advances',
  INSTALLMENTS: 'kamakhya_installments',
  ORDERS: 'kamakhya_orders',
  INVENTORY: 'kamakhya_inventory',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export const StorageService = {
  getSettings(): ShopSettings {
    return getStored<ShopSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
  },

  saveSettings(settings: ShopSettings): void {
    setStored(STORAGE_KEYS.SETTINGS, settings);
  },

  getRates(): MetalRates {
    return getStored<MetalRates>(STORAGE_KEYS.RATES, defaultRates);
  },

  getRateHistory(): MetalRateHistoryEntry[] {
    return getStored<MetalRateHistoryEntry[]>(STORAGE_KEYS.RATE_HISTORY, defaultRateHistory);
  },

  saveRates(newRates: MetalRates, updatedBy: string): void {
    setStored(STORAGE_KEYS.RATES, newRates);
    const history = this.getRateHistory();
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newEntries: MetalRateHistoryEntry[] = [
      {
        id: 'rh_' + Date.now() + '_22k',
        date: todayStr,
        time: timeStr,
        metalType: 'Gold',
        purity: '22K',
        ratePerGram: newRates.gold22k,
        updatedBy,
      },
      {
        id: 'rh_' + Date.now() + '_24k',
        date: todayStr,
        time: timeStr,
        metalType: 'Gold',
        purity: '24K',
        ratePerGram: newRates.gold24k,
        updatedBy,
      },
      {
        id: 'rh_' + Date.now() + '_925',
        date: todayStr,
        time: timeStr,
        metalType: 'Silver',
        purity: '925',
        ratePerGram: newRates.silver925,
        updatedBy,
      },
    ];

    setStored(STORAGE_KEYS.RATE_HISTORY, [...newEntries, ...history]);
  },

  getCustomers(): Customer[] {
    return getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, defaultCustomers);
  },

  saveCustomer(customer: Customer): Customer {
    const list = this.getCustomers();
    const index = list.findIndex((c) => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.unshift(customer);
    }
    setStored(STORAGE_KEYS.CUSTOMERS, list);
    return customer;
  },

  getInvoices(): Invoice[] {
    return getStored<Invoice[]>(STORAGE_KEYS.INVOICES, defaultInvoices);
  },

  saveInvoice(invoice: Invoice): Invoice {
    const invoices = this.getInvoices();
    const existingIndex = invoices.findIndex((i) => i.id === invoice.id);

    if (existingIndex >= 0) {
      invoices[existingIndex] = invoice;
    } else {
      invoices.unshift(invoice);
    }
    setStored(STORAGE_KEYS.INVOICES, invoices);

    // Update customer stats
    const customers = this.getCustomers();
    const custIndex = customers.findIndex((c) => c.id === invoice.customerId);
    if (custIndex >= 0) {
      const cust = customers[custIndex];
      cust.totalPurchases = (cust.totalPurchases || 0) + invoice.grandTotal;
      cust.totalPaymentsReceived = (cust.totalPaymentsReceived || 0) + invoice.amountPaidNow;
      cust.outstandingBalance = (cust.outstandingBalance || 0) + invoice.remainingBalance;

      // Handle advance deduction
      if (invoice.advanceAdjusted > 0) {
        cust.availableAdvanceBalance = Math.max(0, (cust.availableAdvanceBalance || 0) - invoice.advanceAdjusted);

        // Record in advance deposit if linked
        if (invoice.advanceReceiptId) {
          const advances = this.getAdvances();
          const advIndex = advances.findIndex((a) => a.id === invoice.advanceReceiptId || a.receiptNumber === invoice.advanceReceiptId);
          if (advIndex >= 0) {
            const adv = advances[advIndex];
            adv.redeemedAmount = (adv.redeemedAmount || 0) + invoice.advanceAdjusted;
            adv.availableBalance = Math.max(0, adv.amount - adv.redeemedAmount);
            adv.status = adv.availableBalance <= 0 ? 'Fully Redeemed' : 'Partially Redeemed';
            adv.redemptions.push({
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.advanceAdjusted,
              date: invoice.date,
            });
            setStored(STORAGE_KEYS.ADVANCES, advances);
          }
        }
      }

      customers[custIndex] = cust;
      setStored(STORAGE_KEYS.CUSTOMERS, customers);
    }

    return invoice;
  },

  getAdvances(): AdvanceDeposit[] {
    return getStored<AdvanceDeposit[]>(STORAGE_KEYS.ADVANCES, defaultAdvances);
  },

  saveAdvance(advance: AdvanceDeposit): AdvanceDeposit {
    const list = this.getAdvances();
    const index = list.findIndex((a) => a.id === advance.id);
    if (index >= 0) {
      list[index] = advance;
    } else {
      list.unshift(advance);
      // Increment customer's available advance balance
      const customers = this.getCustomers();
      const cIndex = customers.findIndex((c) => c.id === advance.customerId);
      if (cIndex >= 0) {
        customers[cIndex].availableAdvanceBalance = (customers[cIndex].availableAdvanceBalance || 0) + advance.amount;
        customers[cIndex].totalPaymentsReceived = (customers[cIndex].totalPaymentsReceived || 0) + advance.amount;
        setStored(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }
    setStored(STORAGE_KEYS.ADVANCES, list);
    return advance;
  },

  getInstallmentPlans(): InstallmentPlan[] {
    return getStored<InstallmentPlan[]>(STORAGE_KEYS.INSTALLMENTS, defaultInstallmentPlans);
  },

  saveInstallmentPlan(plan: InstallmentPlan): InstallmentPlan {
    const list = this.getInstallmentPlans();
    const index = list.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      list[index] = plan;
    } else {
      list.unshift(plan);
    }
    setStored(STORAGE_KEYS.INSTALLMENTS, list);
    return plan;
  },

  recordInstallmentPayment(planId: string, payment: InstallmentPayment): InstallmentPlan | null {
    const list = this.getInstallmentPlans();
    const index = list.findIndex((p) => p.id === planId);
    if (index < 0) return null;

    const plan = list[index];
    plan.payments.push(payment);
    plan.totalPaid = (plan.totalPaid || 0) + payment.amount;
    plan.remainingAmount = Math.max(0, plan.totalAgreedAmount - plan.totalPaid);

    if (plan.remainingAmount <= 0) {
      plan.status = 'Completed';
    } else {
      // Advance next due date by 1 month
      const currentDue = new Date(plan.nextDueDate);
      if (!isNaN(currentDue.getTime())) {
        currentDue.setMonth(currentDue.getMonth() + 1);
        plan.nextDueDate = currentDue.toISOString().split('T')[0];
      }
    }

    list[index] = plan;
    setStored(STORAGE_KEYS.INSTALLMENTS, list);

    // Update customer total payments
    const customers = this.getCustomers();
    const cIndex = customers.findIndex((c) => c.id === plan.customerId);
    if (cIndex >= 0) {
      customers[cIndex].totalPaymentsReceived = (customers[cIndex].totalPaymentsReceived || 0) + payment.amount;
      setStored(STORAGE_KEYS.CUSTOMERS, customers);
    }

    return plan;
  },

  getOrders(): JewelleryOrder[] {
    return getStored<JewelleryOrder[]>(STORAGE_KEYS.ORDERS, defaultOrders);
  },

  saveOrder(order: JewelleryOrder): JewelleryOrder {
    const list = this.getOrders();
    const index = list.findIndex((o) => o.id === order.id);
    if (index >= 0) {
      list[index] = order;
    } else {
      list.unshift(order);
    }
    setStored(STORAGE_KEYS.ORDERS, list);
    return order;
  },

  updateOrderStatus(orderId: string, status: OrderStatus, notes?: string): JewelleryOrder | null {
    const list = this.getOrders();
    const index = list.findIndex((o) => o.id === orderId);
    if (index < 0) return null;

    list[index].status = status;
    if (notes) {
      list[index].notes = (list[index].notes ? list[index].notes + ' | ' : '') + notes;
    }
    setStored(STORAGE_KEYS.ORDERS, list);
    return list[index];
  },

  getInventory(): InventoryItem[] {
    return getStored<InventoryItem[]>(STORAGE_KEYS.INVENTORY, defaultInventory);
  },

  saveInventoryItem(item: InventoryItem): InventoryItem {
    const list = this.getInventory();
    const index = list.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }
    setStored(STORAGE_KEYS.INVENTORY, list);
    return item;
  },

  generateNextInvoiceNumber(): string {
    const settings = this.getSettings();
    const invoices = this.getInvoices();
    const count = invoices.length + 1;
    const prefix = settings.invoicePrefix || 'KJ';
    const fy = settings.financialYear || '2026-27';
    return `${prefix}/${fy}/${String(count).padStart(3, '0')}`;
  },

  generateNextAdvanceReceiptNumber(): string {
    const settings = this.getSettings();
    const advances = this.getAdvances();
    const count = advances.length + 1;
    const prefix = settings.invoicePrefix || 'KJ';
    return `${prefix}/ADV/${String(count).padStart(3, '0')}`;
  },

  generateNextInstallmentReceiptNumber(): string {
    const plans = this.getInstallmentPlans();
    let totalPayments = 0;
    plans.forEach((p) => {
      totalPayments += p.payments.length;
    });
    return `INS-${String(totalPayments + 1).padStart(3, '0')}`;
  },

  generateNextOrderNumber(): string {
    const settings = this.getSettings();
    const orders = this.getOrders();
    const count = orders.length + 1;
    const prefix = settings.invoicePrefix || 'KJ';
    return `${prefix}/ORD/${String(count).padStart(3, '0')}`;
  },

  resetAll(): void {
    localStorage.clear();
  },

  exportBackup(): string {
    const dump = {
      settings: this.getSettings(),
      rates: this.getRates(),
      rateHistory: this.getRateHistory(),
      customers: this.getCustomers(),
      invoices: this.getInvoices(),
      advances: this.getAdvances(),
      installments: this.getInstallmentPlans(),
      orders: this.getOrders(),
      inventory: this.getInventory(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(dump, null, 2);
  },

  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) setStored(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.rates) setStored(STORAGE_KEYS.RATES, data.rates);
      if (data.rateHistory) setStored(STORAGE_KEYS.RATE_HISTORY, data.rateHistory);
      if (data.customers) setStored(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.invoices) setStored(STORAGE_KEYS.INVOICES, data.invoices);
      if (data.advances) setStored(STORAGE_KEYS.ADVANCES, data.advances);
      if (data.installments) setStored(STORAGE_KEYS.INSTALLMENTS, data.installments);
      if (data.orders) setStored(STORAGE_KEYS.ORDERS, data.orders);
      if (data.inventory) setStored(STORAGE_KEYS.INVENTORY, data.inventory);
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  },
};
