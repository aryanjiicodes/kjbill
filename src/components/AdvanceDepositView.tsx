import React, { useState } from 'react';
import { AdvanceDeposit, Customer, MetalRates, ShopSettings, PaymentMode } from '../types';
import { formatINR, formatGrams, numberToIndianWords } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Coins, Plus, Search, Printer, X, ShieldCheck, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  advances: AdvanceDeposit[];
  customers: Customer[];
  rates: MetalRates;
  settings: ShopSettings;
  currentStaffName: string;
  onRefresh: () => void;
}

export const AdvanceDepositView: React.FC<Props> = ({
  advances,
  customers,
  rates,
  settings,
  currentStaffName,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<AdvanceDeposit | null>(null);
  const [printLayout, setPrintLayout] = useState<'A4' | 'Card'>('A4');

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [amount, setAmount] = useState<number>(10000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [metalCategory, setMetalCategory] = useState<'Gold' | 'Silver' | 'General'>('Gold');
  const [purity, setPurity] = useState('22K');
  const [metalRate, setMetalRate] = useState<number>(rates.gold22k);
  const [transactionRef, setTransactionRef] = useState('');
  const [purpose, setPurpose] = useState('');

  // Calculate equivalent grams
  const equivalentGrams = metalRate > 0 && amount > 0 ? Math.round((amount / metalRate) * 1000) / 1000 : 0;

  const filteredAdvances = advances.filter((adv) => {
    return (
      adv.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adv.customerMobile.includes(searchTerm)
    );
  });

  const totalHeld = advances
    .filter((a) => a.status === 'Active' || a.status === 'Partially Redeemed')
    .reduce((s, a) => s + a.availableBalance, 0);

  const totalDepositedAll = advances.reduce((s, a) => s + a.amount, 0);
  const totalRedeemedAll = advances.reduce((s, a) => s + a.redeemedAmount, 0);

  const handleMetalCategoryChange = (cat: 'Gold' | 'Silver' | 'General') => {
    setMetalCategory(cat);
    if (cat === 'Gold') {
      setPurity('22K');
      setMetalRate(rates.gold22k);
    } else if (cat === 'Silver') {
      setPurity('Silver');
      setMetalRate(rates.silver999);
    } else {
      setPurity('N/A');
      setMetalRate(0);
    }
  };

  const handlePurityChange = (p: string) => {
    setPurity(p);
    if (metalCategory === 'Gold') {
      if (p === '24K') setMetalRate(rates.gold24k);
      else if (p === '22K') setMetalRate(rates.gold22k);
      else if (p === '18K') setMetalRate(rates.gold18k);
      else if (p === '14K') setMetalRate(rates.gold14k);
    } else if (metalCategory === 'Silver') {
      if (p === '999' || p === 'Silver') setMetalRate(rates.silver999);
      else if (p === '925') setMetalRate(rates.silver925);
    }
  };

  const handleSubmitAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer for the advance receipt.');
      return;
    }
    if (amount <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    const receiptNumber = StorageService.generateNextAdvanceReceiptNumber();
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newAdvance: AdvanceDeposit = {
      id: 'adv_' + Date.now(),
      receiptNumber,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerMobile: selectedCustomer.mobile,
      customerAddress: selectedCustomer.address,
      depositDate: today,
      depositTime: timeStr,
      amount,
      paymentMode,
      metalCategory,
      metalRateAtDeposit: metalRate,
      purity,
      equivalentGrams,
      redeemedAmount: 0,
      availableBalance: amount,
      transactionRef: transactionRef.trim() || undefined,
      purpose: purpose.trim() || undefined,
      staffName: currentStaffName,
      status: 'Active',
      redemptions: [],
    };

    StorageService.saveAdvance(newAdvance);
    onRefresh();
    setShowNewModal(false);
    setSelectedReceiptForPrint(newAdvance);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Advance Deposit Ledger
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Customer Advance Deposit Portal
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Record customer advance bookings, preserve permanent historical metal rates, and manage redemptions
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCustomer(null);
            setAmount(10000);
            setMetalRate(rates.gold22k);
            setShowNewModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Advance Deposit</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Current Advance Held
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-800">
            {formatINR(totalHeld)}
          </div>
          <div className="text-xs text-stone-500 mt-1">Available for future redemption</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Total Deposits To Date
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
            {formatINR(totalDepositedAll)}
          </div>
          <div className="text-xs text-stone-500 mt-1">{advances.length} total receipts recorded</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs font-semibold uppercase text-stone-500 mb-1">
            Total Amount Redeemed
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
            {formatINR(totalRedeemedAll)}
          </div>
          <div className="text-xs text-stone-500 mt-1">Adjusted against sales invoices</div>
        </div>
      </div>

      {/* Advance Register Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by receipt #, customer, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
            />
          </div>
          <span className="text-xs text-stone-500">Showing {filteredAdvances.length} receipts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 text-[11px]">
              <tr>
                <th className="py-3 px-3">Receipt #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Historical Rate</th>
                <th className="py-3 px-3 text-right">Equiv. Grams</th>
                <th className="py-3 px-3 text-right font-bold text-stone-900">Deposited</th>
                <th className="py-3 px-3 text-right">Redeemed</th>
                <th className="py-3 px-3 text-right font-bold text-amber-900">Available</th>
                <th className="py-3 px-2 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredAdvances.map((adv) => (
                <tr key={adv.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-stone-900">
                    {adv.receiptNumber}
                  </td>
                  <td className="py-3 px-3 text-stone-600">
                    <div>{adv.depositDate}</div>
                    <div className="text-[10px] text-stone-400">{adv.depositTime}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-900">{adv.customerName}</div>
                    <div className="text-[11px] text-stone-500 font-mono">{adv.customerMobile}</div>
                  </td>
                  <td className="py-3 px-3 font-medium">
                    {adv.metalCategory} ({adv.purity})
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                    {adv.metalRateAtDeposit > 0 ? `₹${adv.metalRateAtDeposit}/g` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-950 font-bold">
                    {adv.equivalentGrams ? `${adv.equivalentGrams.toFixed(3)} g` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-stone-900">
                    {formatINR(adv.amount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                    {formatINR(adv.redeemedAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-800 bg-emerald-50/40">
                    {formatINR(adv.availableBalance)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                        adv.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : adv.status === 'Partially Redeemed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {adv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedReceiptForPrint(adv)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                    >
                      Print Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Advance Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Record Customer Advance Deposit</h3>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} className="p-6 space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Select Customer *
                </label>
                {!selectedCustomer ? (
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Type name or mobile number..."
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                    />
                    {custSearch && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-stone-100">
                        {customers
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                              c.mobile.includes(custSearch)
                          )
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustSearch('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-amber-50 text-xs flex justify-between"
                            >
                              <span className="font-semibold text-stone-800">{c.name}</span>
                              <span className="text-stone-500 font-mono">{c.mobile}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{selectedCustomer.name}</span>
                      <span className="text-stone-500 ml-2 font-mono">({selectedCustomer.mobile})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-amber-700 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Deposit Amount & Payment Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Deposit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              {/* Metal Category & Historical Rate */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/40 space-y-3">
                <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Metal Rate Preservation
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Metal Category
                    </label>
                    <select
                      value={metalCategory}
                      onChange={(e) => handleMetalCategoryChange(e.target.value as any)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-medium"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="General">General (Cash Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Purity
                    </label>
                    <select
                      value={purity}
                      onChange={(e) => handlePurityChange(e.target.value)}
                      disabled={metalCategory === 'General'}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-bold disabled:opacity-40"
                    >
                      {metalCategory === 'Gold' ? (
                        <>
                          <option value="22K">22K (916)</option>
                          <option value="24K">24K</option>
                          <option value="18K">18K</option>
                          <option value="14K">14K</option>
                        </>
                      ) : (
                        <>
                          <option value="Silver">Silver</option>
                          <option value="925">925 Sterling</option>
                          <option value="999">999 Fine</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Metal Rate /g (₹)
                    </label>
                    <input
                      type="number"
                      value={metalRate || ''}
                      onChange={(e) => setMetalRate(parseFloat(e.target.value) || 0)}
                      disabled={metalCategory === 'General'}
                      className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right disabled:opacity-40"
                    />
                  </div>
                </div>

                {metalRate > 0 && (
                  <div className="bg-amber-100/60 border border-amber-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-amber-900 font-medium">
                      Equivalent Metal Quantity at This Stamped Rate:
                    </span>
                    <span className="font-mono font-bold text-amber-950 text-sm">
                      {equivalentGrams.toFixed(3)} grams
                    </span>
                  </div>
                )}
              </div>

              {/* Transaction Ref & Purpose */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Transaction / UPI Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/92847102"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Purpose / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Booking for Dhanteras necklace"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-colors"
                >
                  Save Advance & Print Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Receipt Print Modal (A4 & Compact Card Layouts) */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 print:p-0 print:bg-white print:fixed print:inset-0">
          {/* Top print control bar */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white p-2 rounded-xl shadow-xl border border-stone-200">
            <div className="flex bg-stone-100 p-0.5 rounded-lg text-xs font-semibold mr-2">
              <button
                onClick={() => setPrintLayout('A4')}
                className={`px-3 py-1 rounded-md ${
                  printLayout === 'A4' ? 'bg-amber-600 text-white' : 'text-stone-600'
                }`}
              >
                A4 Sheet
              </button>
              <button
                onClick={() => setPrintLayout('Card')}
                className={`px-3 py-1 rounded-md ${
                  printLayout === 'Card' ? 'bg-amber-600 text-white' : 'text-stone-600'
                }`}
              >
                Compact Card
              </button>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={() => setSelectedReceiptForPrint(null)}
              className="p-1.5 text-stone-400 hover:text-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Sheet */}
          <div
            className={`bg-white text-stone-900 p-8 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-6 mx-auto ${
              printLayout === 'A4' ? 'w-full max-w-[210mm] min-h-[200mm]' : 'w-full max-w-[148mm] min-h-[105mm]'
            }`}
          >
            {/* Header */}
            <div className="border-b-2 border-stone-800 pb-3 mb-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                Payment Acknowledgement Receipt (Customer Advance Deposit)
              </div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                {settings.businessName}
              </h1>
              <p className="text-xs text-stone-600">{settings.address}</p>
              <p className="text-xs text-stone-600">Contact: +91 {settings.mobile} · GSTIN: {settings.gstin}</p>
            </div>

            {/* Receipt Meta */}
            <div className="grid grid-cols-2 gap-4 border border-stone-300 p-3 rounded-xs mb-4 text-xs">
              <div>
                <span className="font-semibold text-stone-600">Receipt No: </span>
                <span className="font-mono font-bold text-stone-900">{selectedReceiptForPrint.receiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-stone-600">Date & Time: </span>
                <span className="font-medium">{selectedReceiptForPrint.depositDate} at {selectedReceiptForPrint.depositTime}</span>
              </div>
              <div>
                <span className="font-semibold text-stone-600">Customer: </span>
                <span className="font-bold text-stone-900">{selectedReceiptForPrint.customerName}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-stone-600">Contact: </span>
                <span className="font-mono">{selectedReceiptForPrint.customerMobile}</span>
              </div>
            </div>

            {/* Financial Details Table */}
            <div className="border border-stone-300 rounded-xs overflow-hidden mb-4 text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-300 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Payment Mode</th>
                    <th className="py-2 px-3 text-right">Metal Rate Stamped</th>
                    <th className="py-2 px-3 text-right">Equivalent Metal</th>
                    <th className="py-2 px-3 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-3 font-medium">
                      {selectedReceiptForPrint.metalCategory} Advance Booking
                      {selectedReceiptForPrint.purpose && (
                        <span className="block text-[11px] text-stone-500 italic">
                          ({selectedReceiptForPrint.purpose})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold">{selectedReceiptForPrint.paymentMode}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {selectedReceiptForPrint.metalRateAtDeposit > 0
                        ? `₹${selectedReceiptForPrint.metalRateAtDeposit}/g (${selectedReceiptForPrint.purity})`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-950">
                      {selectedReceiptForPrint.equivalentGrams
                        ? `${selectedReceiptForPrint.equivalentGrams.toFixed(3)} g`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-950 text-sm">
                      {formatINR(selectedReceiptForPrint.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount In Words */}
            <div className="border border-stone-300 rounded-xs p-2.5 mb-4 text-xs bg-stone-50/50">
              <span className="font-semibold text-stone-600">Amount in Words: </span>
              <span className="font-bold text-stone-900 italic">
                {numberToIndianWords(selectedReceiptForPrint.amount)}
              </span>
            </div>

            {/* Scheme & Acknowledgement Notice */}
            <div className="text-[10px] text-stone-500 space-y-1 border-t border-stone-200 pt-3 mb-6">
              <p>
                <strong>Legal Acknowledgement:</strong> This document is a payment receipt acknowledgement for advance money deposited towards future jewellery purchase and does not constitute a GST Tax Invoice. A final Tax Invoice will be issued upon delivery of goods.
              </p>
              <p>
                The stamped metal rate represents the agreed benchmark at the time of booking as per Kamakhya Jewellers advance scheme terms.
              </p>
            </div>

            {/* Signature Area */}
            <div className="flex justify-between items-end pt-4">
              <div className="text-center">
                <div className="w-36 border-b border-stone-400 mb-1"></div>
                <span className="text-[10px] text-stone-500 font-medium">Customer Signature</span>
              </div>

              <div className="text-center">
                <div className="font-serif italic text-base text-stone-800 mb-1">
                  {settings.ownerName}
                </div>
                <div className="w-44 border-t border-stone-400 pt-1 text-[11px] font-bold text-stone-800">
                  For {settings.businessName}
                </div>
                <div className="text-[10px] text-stone-500">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
