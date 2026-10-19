import React, { useState } from 'react';
import { Customer, Invoice, AdvanceDeposit, InstallmentPlan } from '../types';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Search, UserPlus, Phone, MapPin, Printer, ArrowRight, FileText, AlertCircle, History } from 'lucide-react';

interface Props {
  customers: Customer[];
  invoices: Invoice[];
  advances: AdvanceDeposit[];
  installments: InstallmentPlan[];
  onRefresh: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export const CustomersView: React.FC<Props> = ({
  customers,
  invoices,
  advances,
  installments,
  onRefresh,
  onSelectInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('110096');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;

  // Transactions for active customer
  const custInvoices = invoices.filter((i) => i.customerId === activeCustomer?.id);
  const custAdvances = advances.filter((a) => a.customerId === activeCustomer?.id);
  const custInstallments = installments.filter((ins) => ins.customerId === activeCustomer?.id);

  const checkDuplicateMobile = (mob: string) => {
    setMobile(mob);
    if (mob.length >= 10) {
      const exists = customers.find((c) => c.mobile === mob);
      if (exists) {
        setDuplicateWarning(`Customer "${exists.name}" (${exists.id}) already exists with this phone number.`);
      } else {
        setDuplicateWarning('');
      }
    } else {
      setDuplicateWarning('');
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;

    const newCust: Customer = {
      id: 'CUST-' + (customers.length + 101),
      name: name.trim(),
      mobile: mobile.trim(),
      altMobile: altMobile.trim() || undefined,
      address: address.trim() || 'Delhi',
      state: 'Delhi',
      stateCode: '07',
      pincode: pincode.trim(),
      gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
      totalPurchases: 0,
      totalPaymentsReceived: 0,
      outstandingBalance: 0,
      availableAdvanceBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    };

    StorageService.saveCustomer(newCust);
    onRefresh();
    setSelectedCustomerId(newCust.id);
    setShowAddModal(false);
    setName('');
    setMobile('');
    setAltMobile('');
    setAddress('');
    setGstin('');
    setNotes('');
    setDuplicateWarning('');
  };

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Client Directory & Ledgers
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Customer Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Accounts, transaction history, purchases, and advances held
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Main Two-Column View: Customer List + Detail Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer Directory (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-stone-200">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, phone, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto divide-y divide-stone-100">
            {filteredCustomers.map((cust) => {
              const isSelected = activeCustomer?.id === cust.id;
              return (
                <button
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full p-3.5 text-left transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-amber-50/70 border-l-4 border-amber-600' : 'hover:bg-stone-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-stone-900 text-xs">{cust.name}</div>
                    <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400" />
                      <span>{cust.mobile}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-stone-800">
                      {formatINR(cust.totalPurchases)}
                    </div>
                    {cust.availableAdvanceBalance > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        Adv: {formatINR(cust.availableAdvanceBalance)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Profile & Full Ledger (8 cols) */}
        {activeCustomer ? (
          <div className="lg:col-span-8 space-y-4">
            {/* Customer Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-stone-900">
                      {activeCustomer.name}
                    </h2>
                    <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                      {activeCustomer.id}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {activeCustomer.mobile}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {activeCustomer.address}, {activeCustomer.state} - {activeCustomer.pincode}
                    </span>
                    {activeCustomer.gstin && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-stone-800 font-mono">GSTIN: {activeCustomer.gstin}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handlePrintLedger}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors print:hidden"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Total Purchases</div>
                  <div className="text-base font-bold font-mono text-stone-900 mt-0.5">
                    {formatINR(activeCustomer.totalPurchases)}
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Payments Received</div>
                  <div className="text-base font-bold font-mono text-emerald-800 mt-0.5">
                    {formatINR(activeCustomer.totalPaymentsReceived)}
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Available Advance</div>
                  <div className="text-base font-bold font-mono text-amber-800 mt-0.5">
                    {formatINR(activeCustomer.availableAdvanceBalance)}
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-semibold uppercase">Balance Due</div>
                  <div className="text-base font-bold font-mono text-rose-700 mt-0.5">
                    {formatINR(activeCustomer.outstandingBalance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoices History */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Invoice History ({custInvoices.length})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Invoice No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Net Wt</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {custInvoices.length > 0 ? (
                      custInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-stone-600">{inv.date}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatGrams(inv.totalNetWeight)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatINR(inv.totalTaxableValue)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-950">
                            {formatINR(inv.grandTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm">
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => onSelectInvoice(inv)}
                              className="text-xs font-semibold text-amber-700 hover:underline"
                            >
                              View Bill
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-xs text-stone-400">
                          No invoices recorded for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advance Deposits Ledger */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Advance Deposits & Redemptions ({custAdvances.length})
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Historical Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Deposited</th>
                      <th className="py-2.5 px-3 text-right">Redeemed</th>
                      <th className="py-2.5 px-3 text-right font-bold text-stone-900">Available</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {custAdvances.length > 0 ? (
                      custAdvances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-900">{adv.receiptNumber}</td>
                          <td className="py-2.5 px-3 text-stone-600">{adv.depositDate}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                            ₹{adv.metalRateAtDeposit}/g ({adv.purity || '22K'})
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                            {formatINR(adv.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                            {formatINR(adv.redeemedAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/50">
                            {formatINR(adv.availableBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-stone-700">
                              {adv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-xs text-stone-400">
                          No advance deposits for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-400 text-sm">
            Select a customer from the left to view profile and ledger.
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Customer Profile</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Primary Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9818144011"
                  value={mobile}
                  onChange={(e) => checkDuplicateMobile(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                />
                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 text-amber-700 text-[11px] mt-1 bg-amber-50 p-2 rounded-md">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Alternate Mobile (Optional)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="e.g. 9811223344"
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Street Address & Locality
                </label>
                <input
                  type="text"
                  placeholder="e.g. A-44, New Ashok Nagar"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="07AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Preferences / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Likes antique 22k jewellery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Save Customer Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
