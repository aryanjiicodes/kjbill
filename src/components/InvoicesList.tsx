import React, { useState } from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { Search, Printer, FileText, ArrowUpDown, Filter, Download, MessageCircle, Trash2 } from 'lucide-react';
import { openWhatsAppInvoice } from '../utils/whatsapp';
import { StorageService } from '../services/storage';

interface Props {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  onCreateNew: () => void;
  settings: ShopSettings;
  onRefresh: () => void;
}

export const InvoicesList: React.FC<Props> = ({ invoices, onSelectInvoice, onCreateNew, settings, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partially Paid' | 'Unpaid'>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerMobile.includes(searchTerm);

    const matchesStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;

    let matchesDate = true;
    if (dateFrom && inv.date < dateFrom) matchesDate = false;
    if (dateTo && inv.date > dateTo) matchesDate = false;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalFilteredSales = filtered.reduce((s, i) => s + (i.grandTotal || 0), 0);
  const totalFilteredWeight = filtered.reduce((s, i) => s + (i.totalNetWeight || 0), 0);
  const totalFilteredGst = filtered.reduce((s, i) => s + (i.totalGst || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            GST Sales Register
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            All Invoices & Tax Bills
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Permanent ledger of all finalized and printed invoices for Kamakhya Jewellers
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          + Create New Invoice
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer, or Mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-medium"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid / Credit</option>
          </select>
        </div>

        <div className="sm:col-span-4 flex items-center gap-2 text-xs">
          <span className="text-stone-500 shrink-0">Dates:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
          />
          <span className="text-stone-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg"
          />
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center text-xs">
          <span className="text-stone-600 font-medium">Invoices Matched:</span>
          <span className="font-mono font-bold text-stone-900">{filtered.length} bills</span>
        </div>
        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center text-xs">
          <span className="text-stone-600 font-medium">Total Net Weight:</span>
          <span className="font-mono font-bold text-amber-900">{formatGrams(totalFilteredWeight)}</span>
        </div>
        <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl flex justify-between items-center text-xs">
          <span className="text-stone-600 font-medium">Total Billed:</span>
          <span className="font-mono font-bold text-stone-950 text-sm">{formatINR(totalFilteredSales)}</span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 text-[11px]">
              <tr>
                <th className="py-3 px-3">Invoice No</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer Details</th>
                <th className="py-3 px-2 text-center">Items</th>
                <th className="py-3 px-3 text-right">Net Wt</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">GST (3%)</th>
                <th className="py-3 px-3 text-right font-bold text-stone-900">Grand Total</th>
                <th className="py-3 px-2 text-center">Mode</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length > 0 ? (
                filtered.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-stone-600">
                      <div>{inv.date}</div>
                      <div className="text-[10px] text-stone-400">{inv.time}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{inv.customerName}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{inv.customerMobile}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-semibold">
                      {inv.items.length}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-800">
                      {inv.totalNetWeight.toFixed(3)} g
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                      {inv.totalTaxableValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                      {inv.totalGst.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-stone-950 text-sm">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-stone-700">
                      {inv.paymentMode}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openWhatsAppInvoice(inv, settings)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1"
                          title={`Send bill directly to ${inv.customerName} on WhatsApp`}
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors flex items-center gap-1"
                          title="View / Print A4 Tax Invoice & Save PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print A4</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber} for ${inv.customerName}? This will permanently remove it from your records.`)) {
                              StorageService.deleteInvoice(inv.id);
                              onRefresh();
                            }
                          }}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100 ml-1"
                          title="Delete this invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-stone-400">
                    No invoices match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
