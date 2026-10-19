import React, { useState } from 'react';
import {
  Customer,
  Invoice,
  AdvanceDeposit,
  InstallmentPlan,
  JewelleryOrder,
  InventoryItem,
  MetalRates,
  ShopSettings,
} from '../types';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { NavTab } from './Header';
import {
  PlusCircle,
  FileText,
  UserPlus,
  Coins,
  Clock,
  Gem,
  Package,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Search,
} from 'lucide-react';

interface Props {
  invoices: Invoice[];
  customers: Customer[];
  advances: AdvanceDeposit[];
  installments: InstallmentPlan[];
  orders: JewelleryOrder[];
  inventory: InventoryItem[];
  rates: MetalRates;
  settings: ShopSettings;
  setActiveTab: (tab: NavTab) => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const Dashboard: React.FC<Props> = ({
  invoices,
  customers,
  advances,
  installments,
  orders,
  inventory,
  rates,
  settings,
  setActiveTab,
  onSelectInvoice,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter invoices based on dateFilter
  const filteredInvoices = invoices.filter((inv) => {
    if (dateFilter === 'all') return true;
    if (dateFilter === 'today') return inv.date === todayStr;
    const invDate = new Date(inv.date);
    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return invDate >= weekAgo;
    }
    if (dateFilter === 'month') {
      return (
        invDate.getMonth() === now.getMonth() &&
        invDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Calculate metrics
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalInvoicesCount = filteredInvoices.length;
  const moneyReceived = filteredInvoices.reduce((sum, inv) => sum + (inv.amountPaidNow || 0), 0);

  // Outstanding balances across all customers
  const totalOutstandingReceivables = customers.reduce(
    (sum, c) => sum + (c.outstandingBalance || 0),
    0
  );

  // Active Advance Deposits Held
  const totalAdvanceDepositsHeld = advances
    .filter((a) => a.status === 'Active' || a.status === 'Partially Redeemed')
    .reduce((sum, a) => sum + (a.availableBalance || 0), 0);

  // Pending Jewellery Orders
  const pendingOrders = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  // Active Installment Plans and collections this month
  const activeInstallmentPlans = installments.filter((i) => i.status === 'Active');
  const overdueInstallments = installments.filter((i) => i.status === 'Overdue');

  let totalInstallmentCollectedMonth = 0;
  installments.forEach((p) => {
    p.payments.forEach((pay) => {
      totalInstallmentCollectedMonth += pay.amount || 0;
    });
  });

  // Low stock inventory items (qty < 2)
  const lowStockItems = inventory.filter((item) => item.quantity <= 1 && item.inStock);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Welcome Banner & Quick Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-stone-900 text-stone-100 p-6 rounded-2xl border border-stone-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Shop Counter Terminal</span>
            <span aria-hidden="true">·</span>
            <span>New Ashok Nagar, Delhi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-50">
            {settings.businessName}
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">
            Proprietor: <span className="text-stone-200 font-semibold">{settings.ownerName}</span> · Active GST Billing & Counter Ledger
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center bg-stone-950/80 p-1 rounded-xl border border-stone-800">
          {(['today', 'week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                dateFilter === filter
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {filter === 'today'
                ? 'Today'
                : filter === 'week'
                ? 'This Week'
                : filter === 'month'
                ? 'This Month'
                : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('billing')}
          className="flex flex-col items-center justify-center p-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <FileText className="w-5 h-5 mb-1.5 text-amber-200" />
          <span className="text-xs font-bold text-center">New GST Bill</span>
          <span className="text-[10px] text-amber-200">A4 Tax Invoice</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className="flex flex-col items-center justify-center p-3.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Coins className="w-5 h-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold text-center">Receive Advance</span>
          <span className="text-[10px] text-stone-400">Lock Gold Rate</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className="flex flex-col items-center justify-center p-3.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
        >
          <UserPlus className="w-5 h-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold text-center">Add Customer</span>
          <span className="text-[10px] text-stone-400">View Ledgers</span>
        </button>

        <button
          onClick={() => setActiveTab('installments')}
          className="flex flex-col items-center justify-center p-3.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Receipt className="w-5 h-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold text-center">Installment Plan</span>
          <span className="text-[10px] text-stone-400">Bishi / Swarna</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className="flex flex-col items-center justify-center p-3.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
        >
          <Gem className="w-5 h-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold text-center">Jewellery Order</span>
          <span className="text-[10px] text-stone-400">Custom / Booklet</span>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className="flex flex-col items-center justify-center p-3.5 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
        >
          <TrendingUp className="w-5 h-5 mb-1.5 text-amber-400" />
          <span className="text-xs font-bold text-center">Daily Rates</span>
          <span className="text-[10px] text-stone-400">22K / 24K Gold</span>
        </button>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Sales ({dateFilter === 'today' ? 'Today' : dateFilter})</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {formatINR(totalSales)}
          </div>
          <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-stone-800">{totalInvoicesCount}</span>
            <span>invoices finalized</span>
          </div>
        </div>

        {/* Cash & Digital Received */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Money Received</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
            {formatINR(moneyReceived)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Cash, UPI & Bank collections
          </div>
        </div>

        {/* Customer Advances Held */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Advance Deposits Held</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-800">
            {formatINR(totalAdvanceDepositsHeld)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Customer liability for future jewellery
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Customer Balances Due</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-700">
            {formatINR(totalOutstandingReceivables)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Pending payments across all ledgers
          </div>
        </div>
      </div>

      {/* Secondary Status Cards: Orders, Installments & Low Stock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Orders */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 uppercase font-semibold">Active Orders</div>
            <div className="text-xl font-bold text-stone-900 mt-0.5">
              {pendingOrders.length} In Progress
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Custom bridal & booklet orders</div>
          </div>
          <button
            onClick={() => setActiveTab('orders')}
            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-lg"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Monthly Installment Collections */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 uppercase font-semibold">Installment Plans</div>
            <div className="text-xl font-bold text-stone-900 mt-0.5">
              {activeInstallmentPlans.length} Active Plans
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {formatINR(totalInstallmentCollectedMonth)} collected total
            </div>
          </div>
          <button
            onClick={() => setActiveTab('installments')}
            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-lg"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-500 uppercase font-semibold">Stock Alert</div>
            <div className={`text-xl font-bold mt-0.5 ${lowStockItems.length > 0 ? 'text-amber-700' : 'text-stone-900'}`}>
              {lowStockItems.length} Low Quantity
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">Items with 1 or 0 units remaining</div>
          </div>
          <button
            onClick={() => setActiveTab('inventory')}
            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-lg"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Recent GST Tax Invoices</h2>
            <p className="text-xs text-stone-500">Latest counter billing transactions</p>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
          >
            <span>View All ({invoices.length})</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold text-[11px] border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Net Wt</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Mode</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-stone-900">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    <div>{inv.date}</div>
                    <div className="text-[10px] text-stone-400">{inv.time}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-stone-900">{inv.customerName}</div>
                    <div className="text-[11px] text-stone-500">{inv.customerMobile}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {inv.items.length}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-800">
                    {formatGrams(inv.totalNetWeight)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 tabular-nums">
                    {formatINR(inv.grandTotal)}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-stone-700">
                    {inv.paymentMode}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] font-semibold text-emerald-800">
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                    >
                      Print A4
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
