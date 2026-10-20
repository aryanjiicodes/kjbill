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
import { supabase, isSupabaseConfigured } from './supabaseClient';

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

// Background sync helper to Supabase (safe & non-blocking)
async function syncToSupabase(table: string, payload: Record<string, any>) {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from(table).upsert(payload);
    if (error) {
      console.error(`Supabase sync notice on table ${table}:`, error.message, error.details);
    }
  } catch (err) {
    console.warn(`Supabase background sync notice for table ${table}:`, err);
  }
}

// Background delete helper to Supabase (safe & non-blocking)
async function deleteFromSupabase(table: string, id: string) {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Supabase delete notice on table ${table}:`, error.message);
    }
  } catch (err) {
    console.warn(`Supabase background delete error for table ${table}:`, err);
  }
}

export const StorageService = {
  // Initial cloud sync: loads from Supabase when available
  async initCloudSync(): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const [
        { data: remoteSettings },
        { data: remoteRates },
        { data: remoteCust },
        { data: remoteInvoices },
        { data: remoteAdvances },
        { data: remoteOrders },
        { data: remoteInventory },
      ] = await Promise.all([
        supabase.from('shop_settings').select('data').eq('id', 'default').maybeSingle(),
        supabase.from('metal_rates').select('data').eq('id', 'current').maybeSingle(),
        supabase.from('customers').select('*'),
        supabase.from('invoices').select('data'),
        supabase.from('advance_deposits').select('data'),
        supabase.from('jewellery_orders').select('data'),
        supabase.from('inventory_items').select('data'),
      ]);

      if (remoteSettings?.data && typeof remoteSettings.data === 'object' && remoteSettings.data.businessName) {
        setStored(STORAGE_KEYS.SETTINGS, { ...defaultSettings, ...remoteSettings.data });
      }
      if (remoteRates?.data && typeof remoteRates.data === 'object' && remoteRates.data.gold24k) {
        setStored(STORAGE_KEYS.RATES, { ...defaultRates, ...remoteRates.data });
      }
      if (remoteCust && remoteCust.length > 0) setStored(STORAGE_KEYS.CUSTOMERS, remoteCust);
      if (remoteInvoices && remoteInvoices.length > 0) setStored(STORAGE_KEYS.INVOICES, remoteInvoices.map((r: any) => r.data));
      if (remoteAdvances && remoteAdvances.length > 0) setStored(STORAGE_KEYS.ADVANCES, remoteAdvances.map((r: any) => r.data));
      if (remoteOrders && remoteOrders.length > 0) setStored(STORAGE_KEYS.ORDERS, remoteOrders.map((r: any) => r.data));
      if (remoteInventory && remoteInventory.length > 0) setStored(STORAGE_KEYS.INVENTORY, remoteInventory.map((r: any) => r.data));
    } catch (e) {
      console.warn('Supabase initial fetch skipped or offline, using local cache:', e);
    }
  },

  getSettings(): ShopSettings {
    const stored = getStored<ShopSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
    return { ...defaultSettings, ...stored };
  },

  saveSettings(settings: ShopSettings): void {
    setStored(STORAGE_KEYS.SETTINGS, settings);
    syncToSupabase('shop_settings', { id: 'default', data: settings });
  },

  getRates(): MetalRates {
    return getStored<MetalRates>(STORAGE_KEYS.RATES, defaultRates);
  },

  getRateHistory(): MetalRateHistoryEntry[] {
    return getStored<MetalRateHistoryEntry[]>(STORAGE_KEYS.RATE_HISTORY, defaultRateHistory);
  },

  saveRates(newRates: MetalRates, updatedBy: string): void {
    setStored(STORAGE_KEYS.RATES, newRates);
    syncToSupabase('metal_rates', { id: 'current', data: newRates });

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
    syncToSupabase('customers', customer);
    return customer;
  },

  deleteCustomer(id: string): boolean {
    const list = this.getCustomers().filter((c) => c.id !== id);
    setStored(STORAGE_KEYS.CUSTOMERS, list);
    deleteFromSupabase('customers', id);
    return true;
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

    // Sync to Supabase
    syncToSupabase('invoices', {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      date: invoice.date,
      time: invoice.time,
      customer_id: invoice.customerId,
      customer_name: invoice.customerName,
      customer_mobile: invoice.customerMobile,
      data: invoice,
    });

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
            syncToSupabase('advance_deposits', {
              id: adv.id,
              receipt_number: adv.receiptNumber,
              customer_id: adv.customerId,
              customer_name: adv.customerName,
              customer_mobile: adv.customerMobile,
              amount: adv.amount,
              available_balance: adv.availableBalance,
              data: adv,
            });
          }
        }
      }

      customers[custIndex] = cust;
      setStored(STORAGE_KEYS.CUSTOMERS, customers);
      syncToSupabase('customers', cust);
    }

    return invoice;
  },

  deleteInvoice(id: string): boolean {
    const list = this.getInvoices().filter((i) => i.id !== id);
    setStored(STORAGE_KEYS.INVOICES, list);
    deleteFromSupabase('invoices', id);
    return true;
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
        syncToSupabase('customers', customers[cIndex]);
      }
    }
    setStored(STORAGE_KEYS.ADVANCES, list);
    syncToSupabase('advance_deposits', {
      id: advance.id,
      receipt_number: advance.receiptNumber,
      customer_id: advance.customerId,
      customer_name: advance.customerName,
      customer_mobile: advance.customerMobile,
      amount: advance.amount,
      available_balance: advance.availableBalance,
      data: advance,
    });
    return advance;
  },

  deleteAdvance(id: string): boolean {
    const list = this.getAdvances().filter((a) => a.id !== id);
    setStored(STORAGE_KEYS.ADVANCES, list);
    deleteFromSupabase('advance_deposits', id);
    return true;
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
    syncToSupabase('installment_plans', {
      id: plan.id,
      plan_number: plan.planNumber,
      customer_id: plan.customerId,
      data: plan,
    });
    return plan;
  },

  deleteInstallmentPlan(id: string): boolean {
    const list = this.getInstallmentPlans().filter((p) => p.id !== id);
    setStored(STORAGE_KEYS.INSTALLMENTS, list);
    deleteFromSupabase('installment_plans', id);
    return true;
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
      const currentDue = new Date(plan.nextDueDate);
      if (!isNaN(currentDue.getTime())) {
        currentDue.setMonth(currentDue.getMonth() + 1);
        plan.nextDueDate = currentDue.toISOString().split('T')[0];
      }
    }

    list[index] = plan;
    setStored(STORAGE_KEYS.INSTALLMENTS, list);
    syncToSupabase('installment_plans', {
      id: plan.id,
      plan_number: plan.planNumber,
      customer_id: plan.customerId,
      data: plan,
    });

    // Update customer total payments
    const customers = this.getCustomers();
    const cIndex = customers.findIndex((c) => c.id === plan.customerId);
    if (cIndex >= 0) {
      customers[cIndex].totalPaymentsReceived = (customers[cIndex].totalPaymentsReceived || 0) + payment.amount;
      setStored(STORAGE_KEYS.CUSTOMERS, customers);
      syncToSupabase('customers', customers[cIndex]);
    }

    return plan;
  },

  deleteInstallmentPlan(id: string): boolean {
    const list = this.getInstallmentPlans().filter((p) => p.id !== id);
    setStored(STORAGE_KEYS.INSTALLMENTS, list);
    deleteFromSupabase('installment_plans', id);
    return true;
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
    syncToSupabase('jewellery_orders', {
      id: order.id,
      order_number: order.orderNumber,
      customer_id: order.customerId,
      data: order,
    });
    return order;
  },

  deleteOrder(id: string): boolean {
    const list = this.getOrders().filter((o) => o.id !== id);
    setStored(STORAGE_KEYS.ORDERS, list);
    deleteFromSupabase('jewellery_orders', id);
    return true;
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
    syncToSupabase('jewellery_orders', {
      id: list[index].id,
      order_number: list[index].orderNumber,
      customer_id: list[index].customerId,
      data: list[index],
    });
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
    syncToSupabase('inventory_items', {
      id: item.id,
      tag_number: item.tagNumber,
      data: item,
    });
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

  async testConnection(): Promise<{ ok: boolean; message: string; code?: string }> {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase credentials not configured in environment.' };
    }
    try {
      // Test read
      const { error: readErr } = await supabase.from('shop_settings').select('id').limit(1);
      if (readErr) {
        return { ok: false, message: `Read failed: ${readErr.message}`, code: readErr.code };
      }
      // Test write
      const testObj = { id: 'default', data: this.getSettings() };
      const { error: writeErr } = await supabase.from('shop_settings').upsert(testObj);
      if (writeErr) {
        if (writeErr.code === '42501') {
          return {
            ok: false,
            message: 'Row-Level Security (RLS) is blocking writes. Please run the SQL command in Supabase to disable RLS or allow anon access.',
            code: '42501'
          };
        }
        return { ok: false, message: `Write failed: ${writeErr.message}`, code: writeErr.code };
      }
      return { ok: true, message: 'Connected to Supabase! Read and write verified successfully.' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Connection test failed.' };
    }
  },

  async syncAllToCloud(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase not configured' };
    }
    try {
      const settings = this.getSettings();
      const rates = this.getRates();
      const customers = this.getCustomers();
      const invoices = this.getInvoices();
      const advances = this.getAdvances();
      const orders = this.getOrders();
      const inventory = this.getInventory();

      const { error: sErr } = await supabase.from('shop_settings').upsert({ id: 'default', data: settings });
      if (sErr) throw sErr;

      await supabase.from('metal_rates').upsert({ id: 'current', data: rates });

      if (customers.length > 0) {
        await supabase.from('customers').upsert(customers);
      }
      if (invoices.length > 0) {
        await supabase.from('invoices').upsert(
          invoices.map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoiceNumber,
            date: inv.date,
            time: inv.time,
            customer_id: inv.customerId,
            customer_name: inv.customerName,
            customer_mobile: inv.customerMobile,
            data: inv,
          }))
        );
      }
      if (advances.length > 0) {
        await supabase.from('advance_deposits').upsert(
          advances.map((adv) => ({
            id: adv.id,
            receipt_number: adv.receiptNumber,
            customer_id: adv.customerId,
            customer_name: adv.customerName,
            customer_mobile: adv.customerMobile,
            amount: adv.amount,
            available_balance: adv.availableBalance,
            data: adv,
          }))
        );
      }
      if (orders.length > 0) {
        await supabase.from('jewellery_orders').upsert(
          orders.map((ord) => ({
            id: ord.id,
            order_number: ord.orderNumber,
            customer_id: ord.customerId,
            data: ord,
          }))
        );
      }
      if (inventory.length > 0) {
        await supabase.from('inventory_items').upsert(
          inventory.map((item) => ({
            id: item.id,
            tag_number: item.tagNumber,
            data: item,
          }))
        );
      }

      return { success: true, message: 'All local data successfully synced to Supabase Cloud!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Sync failed.' };
    }
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
