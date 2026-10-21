import React, { useState, useEffect } from 'react';
import { InstallmentPlan, InstallmentPayment, Customer, ShopSettings, PaymentMode } from '../types';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';
import { StorageService } from '../services/storage';
import { Receipt, Plus, Search, Printer, X, CheckCircle2, Calendar, User, Clock, Trash2 } from 'lucide-react';

import mainLogoImg from '../assets/images/kamakhya_main_logo.png';
import bisLogoImg from '../assets/images/bis_hallmark_logo.png';
import watermarkImg from '../assets/images/watermark.png';
import signatureImg from '../assets/images/authorized_signature.png';

interface Props {
  installments: InstallmentPlan[];
  customers: Customer[];
  settings: ShopSettings;
  currentStaffName: string;
  onRefresh: () => void;
}

export const InstallmentsView: React.FC<Props> = ({
  installments,
  customers,
  settings,
  currentStaffName,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [activePlanForPayment, setActivePlanForPayment] = useState<InstallmentPlan | null>(null);
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<{
    plan: InstallmentPlan;
    payment?: InstallmentPayment;
  } | null>(null);

  useEffect(() => {
    if (selectedSlipForPrint) {
      document.body.classList.add('has-print-modal');
    } else {
      document.body.classList.remove('has-print-modal');
    }
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, [selectedSlipForPrint]);

  // New Plan form states
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [schemeName, setSchemeName] = useState('Swarna Bachat 11-Month Gold Scheme');
  const [totalAmount, setTotalAmount] = useState<number>(55000);
  const [installmentsCount, setInstallmentsCount] = useState<number>(11);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(5000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Record Payment form states
  const [payAmount, setPayAmount] = useState<number>(5000);
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [payRef, setPayRef] = useState('');

  const filteredPlans = installments.filter(
    (p) =>
      p.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerMobile.includes(searchTerm)
  );

  const handleTotalAmountChange = (val: number) => {
    setTotalAmount(val);
    if (installmentsCount > 0) {
      setMonthlyAmount(Math.round(val / installmentsCount));
    }
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) {
      alert('Please select a customer for this installment plan.');
      return;
    }

    const planNumber = `KJ/SBY/26-${String(installments.length + 1).padStart(2, '0')}`;
    const nextDue = new Date(startDate);
    nextDue.setMonth(nextDue.getMonth() + 1);

    const newPlan: InstallmentPlan = {
      id: 'plan_' + Date.now(),
      planNumber,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerMobile: selectedCust.mobile,
      schemeName,
      totalAgreedAmount: totalAmount,
      installmentsCount,
      monthlyAmount,
      startDate,
      nextDueDate: nextDue.toISOString().split('T')[0],
      totalPaid: 0,
      remainingAmount: totalAmount,
      status: 'Active',
      terms: `Monthly installment of ₹${monthlyAmount} for ${installmentsCount} months.`,
      payments: [],
    };

    StorageService.saveInstallmentPlan(newPlan);
    onRefresh();
    setShowNewPlanModal(false);
    setSelectedSlipForPrint({ plan: newPlan });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanForPayment) return;

    const receiptNumber = StorageService.generateNextInstallmentReceiptNumber();
    const today = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newPayment: InstallmentPayment = {
      id: 'pay_' + Date.now(),
      receiptNumber,
      date: today,
      time: timeStr,
      amount: payAmount,
      paymentMode: payMode,
      transactionRef: payRef.trim() || undefined,
      staffName: currentStaffName,
    };

    const updated = StorageService.recordInstallmentPayment(activePlanForPayment.id, newPayment);
    onRefresh();
    setActivePlanForPayment(null);
    if (updated) {
      setSelectedSlipForPrint({ plan: updated, payment: newPayment });
    }
  };

  return (
    <>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 ${selectedSlipForPrint ? 'print:hidden' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Swarna Bachat & Monthly Schemes
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Monthly Installment & Gold Scheme Portal
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage customer installment plans, collections passbooks, and printable payment slips
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedCust(null);
            setShowNewPlanModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Installment Plan</span>
        </button>
      </div>

      {/* Plans List and Passbook Cards */}
      <div className="space-y-4">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search plan #, customer name, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
            />
          </div>
          <span className="text-xs text-stone-500">{filteredPlans.length} plans enrolled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.map((plan) => {
            const progress = Math.min(100, Math.round((plan.totalPaid / plan.totalAgreedAmount) * 100));
            return (
              <div
                key={plan.id}
                className="group bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 font-mono">
                        {plan.planNumber}
                      </span>
                      <h3 className="font-bold text-stone-900 text-base">{plan.customerName}</h3>
                      <div className="text-xs text-stone-500 font-mono">{plan.customerMobile}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          plan.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {plan.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete installment scheme ${plan.planNumber} for ${plan.customerName}?`)) {
                            StorageService.deleteInstallmentPlan(plan.id);
                            onRefresh();
                          }
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Delete this installment plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-stone-700 mb-2">
                    {plan.schemeName}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-stone-600 font-mono">
                      <span>Paid: {formatINR(plan.totalPaid)}</span>
                      <span>Target: {formatINR(plan.totalAgreedAmount)}</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-400">
                      <span>{plan.payments.length} of {plan.installmentsCount} installments</span>
                      <span className="font-bold text-stone-700">{progress}% Completed</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl text-xs mb-4">
                    <div>
                      <span className="text-stone-500 block text-[10px]">Monthly Due:</span>
                      <span className="font-mono font-bold text-stone-900">
                        {formatINR(plan.monthlyAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block text-[10px]">Next Due Date:</span>
                      <span className="font-mono font-bold text-amber-900">
                        {plan.nextDueDate}
                      </span>
                    </div>
                  </div>

                  {/* Payment History mini table */}
                  {plan.payments.length > 0 && (
                    <div className="border border-stone-200 rounded-lg overflow-hidden mb-3">
                      <div className="bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase text-stone-600">
                        Recent Installments Paid
                      </div>
                      <div className="divide-y divide-stone-100 text-[11px] max-h-28 overflow-y-auto">
                        {plan.payments.slice(-3).reverse().map((pay) => (
                          <div key={pay.id} className="px-3 py-1.5 flex justify-between items-center">
                            <div>
                              <span className="font-mono text-stone-500 mr-2">{pay.receiptNumber}</span>
                              <span className="text-stone-700">{pay.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-900">{formatINR(pay.amount)}</span>
                              <button
                                onClick={() => setSelectedSlipForPrint({ plan, payment: pay })}
                                className="text-amber-700 hover:underline text-[10px]"
                              >
                                Slip
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 mt-2">
                  {plan.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePlanForPayment(plan);
                        setPayAmount(plan.monthlyAmount);
                      }}
                      className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                    >
                      + Record Payment
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSlipForPrint({ plan, payment: plan.payments[plan.payments.length - 1] })}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    title="Print Swarna Bachat Passbook Card"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Passbook Card</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Plan Modal */}
      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Enroll New Monthly Installment Scheme</h3>
              <button onClick={() => setShowNewPlanModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Select Customer *</label>
                {!selectedCust ? (
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Type name or phone..."
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
                                setSelectedCust(c);
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
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{selectedCust.name}</span>
                      <span className="text-stone-500 ml-2 font-mono">({selectedCust.mobile})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCust(null)}
                      className="text-amber-700 font-semibold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Scheme Name</label>
                <input
                  type="text"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Total Agreed (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Months / Tenor</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={installmentsCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 1;
                      setInstallmentsCount(count);
                      setMonthlyAmount(Math.round(totalAmount / count));
                    }}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-center"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Monthly (₹)</label>
                  <input
                    type="number"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-right"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowNewPlanModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Create Plan & Open Passbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {activePlanForPayment && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Installment Payment</h3>
              <button onClick={() => setActivePlanForPayment(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-900">{activePlanForPayment.customerName}</div>
                <div className="text-stone-500 font-mono">{activePlanForPayment.planNumber}</div>
                <div className="mt-1 flex justify-between text-stone-700 font-mono">
                  <span>Balance: {formatINR(activePlanForPayment.remainingAmount)}</span>
                  <span>Due: {activePlanForPayment.nextDueDate}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={activePlanForPayment.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">Reference / UTR #</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/391024"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActivePlanForPayment(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Save & Print Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Printable Swarna Bachat Passbook Card Modal (3-Column Passbook Table) */}
      {selectedSlipForPrint && (
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
            .no-scrollbar::-webkit-scrollbar {
              display: none !important;
              width: 0px !important;
            }
            .no-scrollbar {
              -ms-overflow-style: none !important;
              scrollbar-width: none !important;
            }
          `}</style>

          {/* Floating Print Action Bar */}
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-xl border border-stone-200">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Passbook Card (A4)</span>
            </button>
            <button
              onClick={() => setSelectedSlipForPrint(null)}
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

            <div className="relative z-10 flex flex-col justify-between h-full flex-1">
              <div>
                {/* Header with safe vertical spacing for Hindi text */}
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

                    {/* Center: Shop Details & Scheme Badge */}
                    <div className="text-center flex-1 px-2">
                      <div className="mb-1">
                        <span className="inline-block bg-amber-100 text-amber-950 border border-amber-400/80 font-bold px-3 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-xs">
                          ★ SWARNA BACHAT MONTHLY SAVINGS PASSBOOK ★
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

                {/* Customer & Scheme Required Money Summary */}
                <div className="grid grid-cols-12 gap-3 border border-stone-300 p-2.5 rounded-xs mb-3 text-xs bg-white/60 print:bg-transparent">
                  <div className="col-span-7 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-stone-500 font-semibold text-[10.5px]">Passbook / Scheme No:</span>
                      <span className="font-mono font-extrabold text-amber-950 text-xs">{selectedSlipForPrint.plan.planNumber}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-stone-500 font-semibold text-[10.5px]">Customer Name:</span>
                      <span className="font-bold text-stone-900 text-sm">{selectedSlipForPrint.plan.customerName}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-stone-500 font-semibold text-[10.5px]">Mobile No:</span>
                      <span className="font-mono text-stone-800 font-medium">+91 {selectedSlipForPrint.plan.customerMobile}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-stone-500 font-semibold text-[10.5px]">Scheme Name:</span>
                      <span className="font-semibold text-stone-800">{selectedSlipForPrint.plan.schemeName}</span>
                    </div>
                  </div>

                  <div className="col-span-5 border-l border-stone-200 pl-3 flex flex-col justify-center space-y-1.5 text-right">
                    <div>
                      <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider block">Monthly Installment</span>
                      <span className="font-mono font-extrabold text-amber-900 text-base">
                        {formatINR(selectedSlipForPrint.plan.monthlyAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px] border-t border-stone-200 pt-1">
                      <span className="text-stone-600">Total Scheme Target:</span>
                      <span className="font-mono font-bold text-stone-900">{formatINR(selectedSlipForPrint.plan.totalAgreedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-stone-600">Tenure / Duration:</span>
                      <span className="font-bold text-stone-800">{selectedSlipForPrint.plan.installmentsCount} Months</span>
                    </div>
                  </div>
                </div>

                {/* 3-Column Passbook Table (Date, Installment, Sign) for manual or recorded entries */}
                <div className="border border-stone-300 rounded-xs overflow-hidden mb-3 text-xs bg-white/70 print:bg-transparent">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3 w-[35%] border-r border-stone-300">दिनांक / Date</th>
                        <th className="py-2 px-3 w-[35%] text-right border-r border-stone-300">किस्त राशि / Installment (₹)</th>
                        <th className="py-2 px-3 w-[30%] text-center">हस्ताक्षर / Sign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-[11px]">
                      {Array.from({ length: Math.max(selectedSlipForPrint.plan.installmentsCount || 11, 11) }).map((_, index) => {
                        const payment = selectedSlipForPrint.plan.payments[index];
                        const isPaid = !!payment;
                        const installmentNum = index + 1;

                        return (
                          <tr
                            key={index}
                            className={`h-9 ${isPaid ? 'bg-amber-50/20' : 'hover:bg-stone-50/30'}`}
                          >
                            {/* Column 1: Date */}
                            <td className="py-1.5 px-3 border-r border-stone-300 align-middle">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-500 font-mono">
                                  M-{installmentNum.toString().padStart(2, '0')}:
                                </span>
                                {isPaid ? (
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-stone-900">{payment.date}</span>
                                    {payment.receiptNumber && (
                                      <span className="text-[9px] text-stone-400 block font-mono">#{payment.receiptNumber}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400 font-mono tracking-widest text-[11px]">
                                    ____ / ____ / 202___
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 2: Installment Amount (₹) */}
                            <td className="py-1.5 px-3 text-right border-r border-stone-300 font-mono align-middle">
                              {isPaid ? (
                                <div>
                                  <span className="font-bold text-stone-950 text-xs">{formatINR(payment.amount)}</span>
                                  <span className="text-[9px] text-emerald-700 block font-sans font-semibold">({payment.paymentMode})</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-stone-400 text-[10px] font-sans">₹</span>
                                  <span className="text-stone-700 font-semibold">{formatINR(selectedSlipForPrint.plan.monthlyAmount).replace('₹', '')}</span>
                                </div>
                              )}
                            </td>

                            {/* Column 3: Sign */}
                            <td className="py-1.5 px-3 text-center align-middle">
                              {isPaid ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-[9.5px] font-semibold text-emerald-800">✓ Received & Signed</span>
                                  <span className="text-[8.5px] text-stone-400">{payment.staffName || 'Showroom Desk'}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-0.5">
                                  <div className="w-24 border-b border-stone-300"></div>
                                  <span className="text-[8px] text-stone-400 mt-0.5">Counter Sign</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Totals Summary Row */}
                      <tr className="bg-stone-100/90 font-bold border-t-2 border-stone-300 text-stone-900 text-xs">
                        <td className="py-2 px-3 border-r border-stone-300 uppercase tracking-wider text-[10px]">
                          Total Deposited :
                        </td>
                        <td className="py-2 px-3 text-right border-r border-stone-300 font-mono text-emerald-800 font-extrabold text-sm">
                          {formatINR(selectedSlipForPrint.plan.totalPaid)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] text-stone-600">
                          {selectedSlipForPrint.plan.payments.length} / {selectedSlipForPrint.plan.installmentsCount} Paid
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Passbook Terms & Instructions */}
                <div className="text-[9.5px] text-stone-600 space-y-0.5 border-t border-stone-200 pt-2.5 leading-tight">
                  <div className="text-[9.5px] font-bold text-stone-800 uppercase tracking-wider mb-0.5">
                    Declaration & Showroom Terms (नियम व शर्तें):
                  </div>
                  <p>
                    1. कृपया प्रत्येक मासिक किस्त जमा करते समय यह पासबुक कार्ड काउंटर पर अवश्य प्रस्तुत करें। (Kindly present this passbook card at showroom counter for every monthly deposit.)
                  </p>
                  <p>
                    2. मासिक किस्त नियत तिथि पर या उससे पूर्व जमा करें। (Monthly installment must be deposited on or before the due date.)
                  </p>
                  <p>
                    3. योजना पूर्ण होने पर कुल संचित राशि के समतुल्य 916 हॉलमार्क आभूषण प्राप्त करें। (Upon completion of scheme tenure, the full accumulated amount is redeemable towards purchase of certified BIS 916 hallmarked jewellery.)
                  </p>
                  <p>
                    4. Subject to local showroom jurisdiction only. E. & O.E.
                  </p>
                </div>
              </div>

              {/* Signatures Footer matching main bill */}
              <div className="grid grid-cols-12 gap-3 pt-2.5 border-t border-stone-300 mt-auto">
                <div className="col-span-6 flex flex-col justify-end">
                  <div className="w-44 border-b border-stone-400 mb-1"></div>
                  <span className="text-[10px] text-stone-500 font-medium">Customer Signature / धारक के हस्ताक्षर</span>
                </div>

                <div className="col-span-6 text-center flex flex-col justify-end items-center">
                  <div className="h-12 flex items-end justify-center mb-0.5">
                    <img
                      src={signatureImg}
                      alt="Authorised Signatory"
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                  <div className="w-48 border-t border-stone-400 pt-0.5 text-[11px] font-bold text-stone-800">
                    For {settings.businessName}
                  </div>
                  <div className="text-[9.5px] text-stone-500">Authorised Signatory / अधिकृत हस्ताक्षर</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
