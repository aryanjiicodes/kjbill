import React, { useState, useEffect } from 'react';
import { AdvanceDeposit, Customer, MetalRates, ShopSettings, PaymentMode } from '../types';
import { formatINR, formatGrams, numberToIndianWords } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Coins, Plus, Search, Printer, X, ShieldCheck, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

import mainLogoImg from '../assets/images/kamakhya_main_logo.png';
import bisLogoImg from '../assets/images/bis_hallmark_logo.png';
import watermarkImg from '../assets/images/watermark.png';
import signatureImg from '../assets/images/authorized_signature.png';

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

  useEffect(() => {
    if (selectedReceiptForPrint) {
      document.body.classList.add('has-print-modal');
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [selectedReceiptForPrint]);

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
    <>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 ${selectedReceiptForPrint ? 'print:hidden' : ''}`}>
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
                <tr key={adv.id} className="group hover:bg-amber-50/30 transition-colors">
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
                    {adv.metalRateAtDeposit > 0 ? (
                      adv.metalCategory === 'Silver'
                        ? `₹${Math.round(adv.metalRateAtDeposit * 1000).toLocaleString('en-IN')}/kg`
                        : `₹${Math.round(adv.metalRateAtDeposit * 10).toLocaleString('en-IN')}/10g`
                    ) : '—'}
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
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedReceiptForPrint(adv)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Slip</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete advance receipt ${adv.receiptNumber} for ${adv.customerName}?`)) {
                            StorageService.deleteAdvance(adv.id);
                            onRefresh();
                          }
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete this advance receipt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
      </div>

      {/* Advance Receipt Print Modal (Styled matching the main Tax Bill) */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 print:static print:block print:w-full print:h-auto print:bg-white print:p-0 print:m-0">
          <style>{`
            @media print {
              html, body {
                overflow: visible !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
              }
              ::-webkit-scrollbar {
                display: none !important;
                width: 0px !important;
                height: 0px !important;
              }
              @page {
                size: A4 portrait;
                margin: 5mm 5mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          {/* Top print control bar */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-xl border border-stone-200">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Receipt</span>
            </button>
            <button
              onClick={() => setSelectedReceiptForPrint(null)}
              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Sheet */}
          <div
            className="w-full max-w-[210mm] min-h-[285mm] h-[285mm] print:h-[283mm] print:min-h-0 print:max-h-[283mm] bg-white text-stone-900 p-6 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-2.5 mx-auto relative overflow-hidden text-[11px] leading-tight flex flex-col justify-between"
            style={{
              boxSizing: 'border-box',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img
                src={watermarkImg}
                alt="Watermark"
                className="w-[400px] max-w-[75%] opacity-[0.16] select-none object-contain print:opacity-[0.16]"
              />
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col justify-between h-full flex-1">
              <div>
                {/* Header */}
                <div className="border-b-2 border-stone-800 pb-2.5 mb-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Main Brand Logo (Gold Round KJ Emblem) */}
                    <div className="w-[125px] sm:w-[135px] shrink-0 flex flex-col items-center justify-center">
                      <img
                        src={mainLogoImg}
                        alt="KAMAKHYA JEWELLERS"
                        className="h-[88px] w-[88px] object-contain drop-shadow-xs"
                      />
                      <span className="text-[8.5px] font-extrabold text-amber-950 uppercase tracking-widest mt-1">ESTB. 2006</span>
                    </div>

                    {/* Center: Shop Details & GSTIN */}
                    <div className="text-center flex-1 px-2">
                      <div className="mb-1">
                        <span className="inline-block bg-amber-100 text-amber-950 border border-amber-400/80 font-bold px-3 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-xs">
                          ★ CUSTOMER ADVANCE DEPOSIT ACKNOWLEDGEMENT ★
                        </span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-wider text-stone-900 mt-0.5 mb-0.5 uppercase">
                        KAMAKHYA JEWELLERS
                      </h1>
                      <div className="text-[11.5px] font-serif text-amber-950 font-bold mb-0.5">
                        कामाख्या ज्वैलर्स (छपरा-सिवान वाले)
                      </div>
                      <p className="text-[10.5px] text-stone-600 max-w-md mx-auto leading-normal">
                        {settings.address}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-[10px] text-stone-700 mt-0.5">
                        <span>Ph: +91 {settings.mobile}</span>
                        {settings.email && <span>· {settings.email}</span>}
                      </div>
                      <div className="text-[11px] font-bold text-stone-900 mt-0.5">
                        GSTIN: {settings.gstin || '07AAACK1234F1Z8'}
                      </div>
                    </div>

                    {/* Right: BIS Hallmark Logo */}
                    <div className="w-[125px] sm:w-[135px] shrink-0 flex flex-col items-center justify-center text-center">
                      <img
                        src={bisLogoImg}
                        alt="BIS Hallmark"
                        className="h-[78px] w-auto max-w-[110px] object-contain"
                      />
                      <span className="text-[8.5px] font-extrabold text-blue-900 tracking-wider mt-1 uppercase">
                        BIS 916 Hallmark
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receipt Meta */}
                <div className="grid grid-cols-2 gap-3 border border-stone-300 p-2.5 rounded-xs mb-3 text-xs bg-white/50 print:bg-transparent">
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
                    <span className="font-mono font-bold">{selectedReceiptForPrint.customerMobile}</span>
                  </div>
                </div>

                {/* Financial Details Table */}
                <div className="border border-stone-300 rounded-xs overflow-hidden mb-3 text-xs bg-white/50 print:bg-transparent">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-300 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Payment Mode</th>
                        <th className="py-2 px-3 text-right">Metal Rate Stamped</th>
                        <th className="py-2 px-3 text-right">Equivalent Metal Wt</th>
                        <th className="py-2 px-3 text-right">Amount Deposited</th>
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
                          {selectedReceiptForPrint.metalRateAtDeposit > 0 ? (
                            selectedReceiptForPrint.metalCategory === 'Silver'
                              ? `₹${Math.round(selectedReceiptForPrint.metalRateAtDeposit * 1000).toLocaleString('en-IN')}/kg (${selectedReceiptForPrint.purity})`
                              : `₹${Math.round(selectedReceiptForPrint.metalRateAtDeposit * 10).toLocaleString('en-IN')}/10g (${selectedReceiptForPrint.purity})`
                          ) : '—'}
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
                <div className="border border-stone-300 rounded-xs p-2.5 mb-3 text-xs bg-stone-50/60 print:bg-transparent">
                  <span className="font-semibold text-stone-600">Amount in Words: </span>
                  <span className="font-bold text-stone-900 italic">
                    {numberToIndianWords(selectedReceiptForPrint.amount)}
                  </span>
                </div>

                {/* Declarations & Showroom Terms */}
                <div className="text-[9.5px] text-stone-600 space-y-0.5 border-t border-stone-200 pt-2.5 leading-tight">
                  <div className="text-[9.5px] font-bold text-stone-800 uppercase tracking-wider mb-0.5">
                    Declaration & Showroom Terms:
                  </div>
                  <ul className="list-disc pl-3 space-y-0.5">
                    <li>This document is a formal payment acknowledgement for advance money deposited towards jewellery order/booking and does not constitute a final GST Tax Invoice.</li>
                    <li>Final Tax Invoice will be issued upon delivery and final reconciliation of the jewellery ornaments.</li>
                    <li>The stamped metal rate represents the agreed benchmark at the time of booking as per showroom advance scheme terms.</li>
                    <li>Subject to local showroom jurisdiction only. E. & O.E.</li>
                  </ul>
                </div>
              </div>

              {/* Signatures Area matching main bill */}
              <div className="grid grid-cols-12 gap-3 pt-3 border-t border-stone-300 mt-auto">
                <div className="col-span-6 flex flex-col justify-end">
                  <div className="w-44 border-b border-stone-400 mb-1"></div>
                  <span className="text-[10px] text-stone-500 font-medium">Customer Signature / Acknowledged</span>
                </div>

                <div className="col-span-6 text-center flex flex-col justify-end items-center">
                  <div className="h-14 flex items-end justify-center mb-0.5">
                    <img
                      src={signatureImg}
                      alt="Authorised Signatory"
                      className="max-h-14 w-auto object-contain"
                    />
                  </div>
                  <div className="w-48 border-t border-stone-400 pt-0.5 text-[11px] font-bold text-stone-800">
                    For {settings.businessName}
                  </div>
                  <div className="text-[9.5px] text-stone-500">Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
