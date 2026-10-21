import React, { useState, useEffect } from 'react';
import {
  Customer,
  Invoice,
  InvoiceItem,
  MetalRates,
  PaymentMode,
  PaymentStatus,
  ShopSettings,
  MetalType,
  MakingChargeType,
} from '../types';
import { calculateItemRow, calculateInvoiceSummary } from '../utils/calculations';
import { formatINR, formatGrams } from '../utils/numberToWords';
import { generateUpiQrDataUrl } from '../utils/qrCode';
import { generateWhatsAppInvoiceMessage } from '../utils/whatsapp';
import { StorageService } from '../services/storage';
import {
  Plus,
  Trash2,
  Search,
  UserPlus,
  Coins,
  CheckCircle2,
  Printer,
  Sparkles,
  AlertCircle,
  FileCheck,
  LayoutGrid,
  Table as TableIcon,
  Gem,
  Scale,
  MessageCircle,
  RotateCcw,
  Receipt,
  Send,
  Eye,
  Check,
} from 'lucide-react';

interface Props {
  rates: MetalRates;
  settings: ShopSettings;
  customers: Customer[];
  onSaveInvoice: (
    invoice: Invoice,
    printImmediately: boolean,
    sendWhatsAppImmediately?: boolean,
    whatsappMobile?: string
  ) => void;
  onCancel: () => void;
  currentStaffName: string;
}

export const InvoiceForm: React.FC<Props> = ({
  rates,
  settings,
  customers,
  onSaveInvoice,
  onCancel,
  currentStaffName,
}) => {
  // Customer selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // WhatsApp billing destination
  const [whatsappMobile, setWhatsappMobile] = useState('');
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  // Customer recipient & GST Rule 46 compliance states
  const [custNameInput, setCustNameInput] = useState('');
  const [custAddressInput, setCustAddressInput] = useState('');
  const [custPincodeInput, setCustPincodeInput] = useState('110096');
  const [custPanInput, setCustPanInput] = useState('');
  const [custDeliveryAddressInput, setCustDeliveryAddressInput] = useState('');

  // New inline customer form fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGstin, setNewCustGstin] = useState('');

  // Invoice meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInterState, setIsInterState] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState('');

  // View mode for line items: 'cards' (spacious counter view with large textboxes) vs 'table' (wide grid)
  const [itemViewMode, setItemViewMode] = useState<'cards' | 'table'>('cards');

  // Split payment state
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitBank, setSplitBank] = useState(0);

  // Advance adjustment from registered customer ledger
  const [applyAdvance, setApplyAdvance] = useState(false);
  const [advanceAdjustAmount, setAdvanceAdjustAmount] = useState(0);

  // Direct advance / cash pre-payment (works for walk-in and any customer)
  const [applyDirectAdvance, setApplyDirectAdvance] = useState(false);
  const [directAdvanceAmount, setDirectAdvanceAmount] = useState<number>(0);

  // Old Gold Return / Exchange state (पुरानी सोने की वापसी)
  const [applyOldGold, setApplyOldGold] = useState(false);
  const [oldGoldMode, setOldGoldMode] = useState<'lumpsum' | 'calculated'>('lumpsum');
  const [oldGoldAmount, setOldGoldAmount] = useState<number>(0);
  const [oldGoldDesc, setOldGoldDesc] = useState('Old Gold Return / Exchange');
  const [oldGoldPurity, setOldGoldPurity] = useState<string>('22K');
  const [oldGoldGrossWeight, setOldGoldGrossWeight] = useState<number>(0);
  const [oldGoldDeductionPercent, setOldGoldDeductionPercent] = useState<number>(0); // melting/tunch loss %
  const [oldGoldRatePerGram, setOldGoldRatePerGram] = useState<number>(rates.gold22k);

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Payment now
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [paidManuallyEdited, setPaidManuallyEdited] = useState(false);

  // Initialize Invoice number and initial row
  useEffect(() => {
    const nextNum = StorageService.generateNextInvoiceNumber();
    setInvoiceNumber(nextNum);

    // Initial item row with professional description & voluntary BIS HUID trust badge
    const defaultItem = calculateItemRow({
      productName: '22K Gold Handcrafted Ring with Ruby',
      itemCode: 'KJ-RNG-01',
      huid: 'KJ916A',
      metalType: 'Gold',
      purity: '22K',
      hsnCode: '711319',
      grossWeight: 10,
      stoneWeight: 0,
      stoneRate: 0,
      stoneCharges: 0,
      ratePerGram: rates.gold22k,
      makingChargeType: 'per_gram',
      makingChargeRate: 200,
      gstRate: 3,
    });
    setItems([defaultItem]);
  }, [rates]);

  // Customer search filtering
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch) ||
      c.id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsWalkIn(false);
    setCustomerSearch('');
    setWhatsappMobile(cust.mobile);
    setCustNameInput(cust.name);
    setCustAddressInput(cust.address);
    setCustPincodeInput(cust.pincode || '110096');
    setCustPanInput(cust.pan || '');
    setCustDeliveryAddressInput(cust.address);
    // Check if customer has advance
    if (cust.availableAdvanceBalance > 0) {
      setApplyAdvance(true);
      setAdvanceAdjustAmount(cust.availableAdvanceBalance);
    } else {
      setApplyAdvance(false);
      setAdvanceAdjustAmount(0);
    }
  };

  const handleSetWalkIn = () => {
    setIsWalkIn(true);
    setSelectedCustomer(null);
    setWhatsappMobile('9818144011');
    setCustNameInput('Counter Walk-in Customer');
    setCustAddressInput('Showroom Counter Handover, New Delhi');
    setCustPincodeInput('110096');
    setCustPanInput('');
    setCustDeliveryAddressInput('Showroom Counter Handover');
    setApplyAdvance(false);
    setAdvanceAdjustAmount(0);
  };

  const handleCreateCustomerInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile) return;

    const newCust: Customer = {
      id: 'CUST-' + Date.now().toString().slice(-4),
      name: newCustName.trim(),
      mobile: newCustMobile.trim(),
      address: newCustAddress.trim() || 'New Delhi',
      state: 'Delhi',
      stateCode: '07',
      pincode: '110096',
      gstin: newCustGstin.trim() || undefined,
      totalPurchases: 0,
      totalPaymentsReceived: 0,
      outstandingBalance: 0,
      availableAdvanceBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    StorageService.saveCustomer(newCust);
    setSelectedCustomer(newCust);
    setWhatsappMobile(newCust.mobile);
    setCustNameInput(newCust.name);
    setCustAddressInput(newCust.address);
    setCustPincodeInput(newCust.pincode || '110096');
    setCustPanInput('');
    setCustDeliveryAddressInput(newCust.address);
    setIsWalkIn(false);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setNewCustGstin('');
  };

  // Auto-calculate old gold return value when weight, deduction, or rate changes
  useEffect(() => {
    if (oldGoldMode === 'calculated') {
      const gWt = Number(oldGoldGrossWeight) || 0;
      const ded = Number(oldGoldDeductionPercent) || 0;
      const netWt = Math.max(0, gWt * (1 - ded / 100));
      const val = Math.round(netWt * (Number(oldGoldRatePerGram) || 0));
      setOldGoldAmount(Math.max(0, val));
    }
  }, [oldGoldMode, oldGoldGrossWeight, oldGoldDeductionPercent, oldGoldRatePerGram]);

  // Update default old gold rate if purity changes
  const handleOldGoldPurityChange = (purity: string) => {
    setOldGoldPurity(purity);
    if (purity === '24K') setOldGoldRatePerGram(rates.gold24k);
    else if (purity === '22K') setOldGoldRatePerGram(rates.gold22k);
    else if (purity === '18K') setOldGoldRatePerGram(rates.gold18k);
    else if (purity === '14K') setOldGoldRatePerGram(rates.gold14k);
    else if (purity === 'Silver' || purity === '999 Silver') setOldGoldRatePerGram(rates.silver999);
    else if (purity === '925 Silver') setOldGoldRatePerGram(rates.silver925);
  };

  // Item modification helpers
  const handleItemChange = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const merged = { ...current, ...updates };

      // If metal type changed, auto-set correct default purity for the new metal
      if (updates.metalType && updates.metalType !== current.metalType) {
        if (updates.metalType === 'Gold') {
          merged.purity = '22K';
          merged.ratePerGram = rates.gold22k;
          merged.hsnCode = '711319';
        } else if (updates.metalType === 'Silver') {
          merged.purity = updates.purity || 'Silver';
          merged.ratePerGram = rates.silver999;
          merged.hsnCode = '711311';
        } else if (updates.metalType === 'Platinum') {
          merged.purity = 'Pt 950';
          merged.ratePerGram = rates.platinum;
          merged.hsnCode = '711319';
        } else {
          merged.purity = 'Standard';
          merged.hsnCode = '711790';
        }
      }

      // If purity changed (without metal type change), update rate accordingly
      if (updates.purity && !updates.metalType) {
        const m = current.metalType;
        const p = updates.purity;
        if (m === 'Gold') {
          if (p === '24K') merged.ratePerGram = rates.gold24k;
          else if (p === '22K') merged.ratePerGram = rates.gold22k;
          else if (p === '18K') merged.ratePerGram = rates.gold18k;
          else if (p === '14K') merged.ratePerGram = rates.gold14k;
          merged.hsnCode = '711319';
        } else if (m === 'Silver') {
          if (p === '999') merged.ratePerGram = rates.silver999;
          else if (p === '925') merged.ratePerGram = rates.silver925;
          else if (p === 'Silver') merged.ratePerGram = rates.silver999;
          else merged.ratePerGram = rates.silver925;
          merged.hsnCode = '711311';
        }
      }

      // If stoneRate or stoneWeight changed, recompute stoneCharges if stoneCharges was not manually overridden
      if (updates.stoneRate !== undefined || updates.stoneWeight !== undefined) {
        const sWt = updates.stoneWeight !== undefined ? Number(updates.stoneWeight) : current.stoneWeight;
        const sRt = updates.stoneRate !== undefined ? Number(updates.stoneRate) : (current.stoneRate || 0);
        if (sRt > 0 && sWt > 0) {
          merged.stoneCharges = Math.round((sWt * sRt) * 100) / 100;
        }
      }

      copy[index] = calculateItemRow(merged);
      return copy;
    });
  };

  const handleAddItem = () => {
    const newItem = calculateItemRow({
      productName: '',
      metalType: 'Gold',
      purity: '22K',
      hsnCode: '711319',
      grossWeight: 0,
      stoneWeight: 0,
      stoneRate: 0,
      stoneCharges: 0,
      ratePerGram: rates.gold22k,
      makingChargeType: 'per_gram',
      makingChargeRate: 200,
      gstRate: 3,
    });
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const effectiveAdvanceAdjust =
    (applyAdvance ? Math.min(advanceAdjustAmount, selectedCustomer?.availableAdvanceBalance || 0) : 0) +
    (applyDirectAdvance ? Math.max(0, Number(directAdvanceAmount) || 0) : 0);

  const effectiveOldGold = applyOldGold ? Math.max(0, Number(oldGoldAmount) || 0) : 0;

  const summary = calculateInvoiceSummary(
    items,
    isInterState,
    effectiveAdvanceAdjust,
    amountPaidNow,
    effectiveOldGold
  );

  // Sync amountPaidNow if not manually edited
  useEffect(() => {
    if (!paidManuallyEdited) {
      setAmountPaidNow(summary.netPayable);
    }
  }, [summary.netPayable, paidManuallyEdited]);

  // Handle finalize invoice
  const handleFinalize = async (
    printImmediately: boolean,
    sendWhatsAppImmediately: boolean = false
  ) => {
    if (!selectedCustomer && !isWalkIn) {
      alert('Please select a customer or choose Counter Walk-in.');
      return;
    }

    if (items.length === 0 || summary.grandTotal <= 0) {
      alert('Please add valid jewellery items to the invoice.');
      return;
    }

    const customerName = (custNameInput && custNameInput.trim())
      || (selectedCustomer ? selectedCustomer.name : 'Counter Walk-in Customer');
    const customerMobile = selectedCustomer ? selectedCustomer.mobile : (whatsappMobile || '9818144011');
    const customerAddress = (custAddressInput && custAddressInput.trim())
      || (selectedCustomer ? selectedCustomer.address : 'Showroom Counter Handover, New Delhi');
    const customerState = selectedCustomer ? selectedCustomer.state : (isInterState ? 'Outside Delhi' : 'Delhi');
    const customerStateCode = selectedCustomer ? selectedCustomer.stateCode : (isInterState ? '99' : '07');
    const customerGstin = selectedCustomer ? selectedCustomer.gstin : undefined;
    const customerPincode = (custPincodeInput && custPincodeInput.trim()) || (selectedCustomer ? selectedCustomer.pincode : '110096');
    const customerPan = (custPanInput && custPanInput.trim().toUpperCase()) || undefined;
    const deliveryAddress = (custDeliveryAddressInput && custDeliveryAddressInput.trim()) || customerAddress;

    // Generate dynamic UPI QR Code Data URL
    const qrDataUrl = await generateUpiQrDataUrl(
      settings.upiId,
      settings.businessName,
      summary.remainingBalance > 0 ? summary.remainingBalance : (summary.netPayable > 0 ? summary.netPayable : summary.grandTotal),
      invoiceNumber
    );

    const currentTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const paymentStatus: PaymentStatus =
      summary.remainingBalance <= 0
        ? 'Paid'
        : amountPaidNow > 0
        ? 'Partially Paid'
        : 'Unpaid';

    let advanceReceiptId: string | undefined = undefined;
    if (applyAdvance && advanceAdjustAmount > 0 && selectedCustomer) {
      const advances = StorageService.getAdvances().filter(
        (a) => a.customerId === selectedCustomer.id && a.availableBalance > 0
      );
      if (advances.length > 0) {
        advanceReceiptId = advances[0].id;
      }
    }

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber,
      date: invoiceDate,
      time: currentTime,
      customerId: selectedCustomer ? selectedCustomer.id : 'WALK_IN',
      customerName,
      customerMobile,
      customerAddress,
      customerState,
      customerStateCode,
      customerPincode,
      customerPan,
      customerGstin,
      deliveryAddress,
      isInterState,
      items,
      totalGrossWeight: summary.totalGrossWeight,
      totalStoneWeight: summary.totalStoneWeight,
      totalNetWeight: summary.totalNetWeight,
      totalTaxableValue: summary.totalTaxableValue,
      cgst: summary.cgst,
      sgst: summary.sgst,
      igst: summary.igst,
      totalGst: summary.totalGst,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      oldGoldAmount: effectiveOldGold > 0 ? effectiveOldGold : undefined,
      oldGoldExchange: effectiveOldGold > 0 ? {
        description: oldGoldMode === 'calculated' && oldGoldGrossWeight > 0
          ? (oldGoldDesc || 'Old Gold Return / Exchange')
          : (oldGoldDesc && oldGoldDesc !== 'Old Gold Return / Exchange' ? oldGoldDesc : 'Trade-in Credit / Adjustment Voucher'),
        grossWeight: oldGoldMode === 'calculated' ? (Number(oldGoldGrossWeight) || 0) : 0,
        purity: oldGoldMode === 'calculated' && oldGoldGrossWeight > 0 ? oldGoldPurity : 'N/A',
        deductionPercent: oldGoldMode === 'calculated' ? (Number(oldGoldDeductionPercent) || 0) : 0,
        netWeight: oldGoldMode === 'calculated' && oldGoldGrossWeight > 0
          ? Math.round(((Number(oldGoldGrossWeight) || 0) * (1 - (Number(oldGoldDeductionPercent) || 0) / 100)) * 1000) / 1000
          : 0,
        ratePerGram: oldGoldMode === 'calculated' && oldGoldGrossWeight > 0 ? (Number(oldGoldRatePerGram) || 0) : 0,
        totalValue: effectiveOldGold,
      } : undefined,
      advanceAdjusted: effectiveAdvanceAdjust,
      advanceReceiptId,
      netPayable: summary.netPayable,
      amountPaidNow,
      remainingBalance: summary.remainingBalance,
      paymentMode: isSplitPayment ? 'Split' : paymentMode,
      paymentBreakdown: isSplitPayment
        ? { cash: splitCash, upi: splitUpi, card: splitCard, bank: splitBank }
        : undefined,
      paymentStatus,
      status: 'Finalized',
      notes,
      createdByStaff: currentStaffName,
      bankDetails: {
        bankName: settings.bankName,
        accountName: (settings.accountName || 'KAMAKHYA JEWELLERS').replace(/kamkhya/i, 'KAMAKHYA'),
        accountNumber: settings.accountNumber,
        ifscCode: settings.ifscCode,
        upiId: settings.upiId,
      },
      qrCodeDataUrl: qrDataUrl,
    };

    onSaveInvoice(newInvoice, printImmediately, sendWhatsAppImmediately, (whatsappMobile || customerMobile));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner & Invoice Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <span>Counter Billing Terminal</span>
            <span aria-hidden="true">·</span>
            <span>A4 GST Tax Invoice</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Create Jewellery GST Invoice
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
            <span className="text-xs font-semibold text-stone-500">Invoice No:</span>
            <span className="font-mono font-bold text-stone-900 text-sm">{invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
            <span className="text-xs font-semibold text-stone-500">Date:</span>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="text-xs font-bold text-stone-900 bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Customer Selection Card */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              1. Customer Details & Billed To
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetWalkIn}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                isWalkIn
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Walk-in Customer
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          </div>
        </div>

        {/* Customer Search & Selected Info */}
        {!isWalkIn && (
          <div className="space-y-3">
            {!selectedCustomer ? (
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search customer by name, mobile (e.g. 9988776655), or ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                />

                {customerSearch.trim() && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-stone-100">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full px-4 py-2.5 text-left hover:bg-amber-50/50 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-stone-900 text-sm">{c.name}</div>
                            <div className="text-xs text-stone-500">{c.mobile} · {c.address}</div>
                          </div>
                          <div className="text-right">
                            {c.availableAdvanceBalance > 0 && (
                              <span className="text-[11px] font-bold text-emerald-700 block">
                                Advance: {formatINR(c.availableAdvanceBalance)}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400">{c.id}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-stone-500">
                        No customer found matching "{customerSearch}". Click "New Customer" to create.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-base">{selectedCustomer.name}</span>
                    <span className="text-xs text-stone-500 font-mono">({selectedCustomer.id})</span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    <span>Mobile: {selectedCustomer.mobile}</span>
                    <span className="mx-2 text-stone-300">·</span>
                    <span>Address: {selectedCustomer.address}</span>
                    {selectedCustomer.gstin && (
                      <>
                        <span className="mx-2 text-stone-300">·</span>
                        <span className="font-bold text-stone-800">GSTIN: {selectedCustomer.gstin}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedCustomer.availableAdvanceBalance > 0 && (
                    <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-300">
                      Available Advance: {formatINR(selectedCustomer.availableAdvanceBalance)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 underline"
                  >
                    Change Customer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isWalkIn && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-600 flex items-center justify-between">
            <span>Billing as <strong>Counter Walk-in Customer</strong>. (Address: New Delhi, Intra-state GST)</span>
            <button
              type="button"
              onClick={() => setIsWalkIn(false)}
              className="text-amber-700 font-semibold hover:underline"
            >
              Select Regular Customer
            </button>
          </div>
        )}

        {/* Recipient Details for GST Rule 46 Compliance */}
        <div className="p-3.5 bg-stone-50/90 rounded-xl border border-stone-200 text-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-stone-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                Invoice Recipient Details (GST Rule 46 Compliant)
              </span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9.5px] font-bold px-2 py-0.5 rounded">
                Required for bills ≥ ₹50,000
              </span>
            </div>
            <span className="text-[10px] text-stone-500">
              Ensure accurate customer name, street address, state & delivery destination
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Recipient / Customer Name *
              </label>
              <input
                type="text"
                value={custNameInput}
                onChange={(e) => setCustNameInput(e.target.value)}
                placeholder="Full Customer / Organisation Name"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-semibold focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Full Street / Locality Address *
              </label>
              <input
                type="text"
                value={custAddressInput}
                onChange={(e) => setCustAddressInput(e.target.value)}
                placeholder="e.g. 78, Karol Bagh, Ajmal Khan Road, New Delhi"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Pincode
              </label>
              <input
                type="text"
                value={custPincodeInput}
                onChange={(e) => setCustPincodeInput(e.target.value)}
                placeholder="110096"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Customer PAN (For High-Value Bills ≥ ₹2 Lakhs)
              </label>
              <input
                type="text"
                maxLength={10}
                value={custPanInput}
                onChange={(e) => setCustPanInput(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-mono uppercase focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="sm:col-span-8">
              <label className="text-[11px] font-bold text-stone-700 block mb-1">
                Delivery / Handover Destination (Shipped To)
              </label>
              <input
                type="text"
                value={custDeliveryAddressInput}
                onChange={(e) => setCustDeliveryAddressInput(e.target.value)}
                placeholder="Showroom Counter Handover or customer delivery address"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>
        </div>

        {/* Place of supply toggle */}
        <div className="flex items-center gap-4 text-xs pt-1">
          <span className="font-semibold text-stone-700">Place of Supply:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={!isInterState}
              onChange={() => setIsInterState(false)}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span>Delhi (Intra-State: 1.5% CGST + 1.5% SGST)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              checked={isInterState}
              onChange={() => setIsInterState(true)}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span>Outside Delhi (Inter-State: 3.0% IGST)</span>
          </label>
        </div>
      </div>

      {/* 2. Jewellery Items Section with Clear, Un-Clustered Textboxes and Stone Rate */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                2. Jewellery Items, Stone Rates & Weight Breakdown
              </h2>
              <span className="text-[11px] text-stone-500">
                Spacious textboxes with clear numbers, live stone rates, making charges, and net weights
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Counter Cards vs Wide Table */}
            <div className="flex bg-stone-200/80 p-0.5 rounded-lg text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setItemViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  itemViewMode === 'cards'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Spacious Counter Cards - Highly Recommended for easy reading without clustered numbers"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                <span>Spacious Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setItemViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  itemViewMode === 'table'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-stone-600" />
                <span>Wide Table</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* View Mode A: Spacious Counter Cards (Solves clustering completely!) */}
        {itemViewMode === 'cards' ? (
          <div className="p-4 sm:p-5 space-y-4 bg-stone-50/30">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs hover:border-amber-400 transition-all space-y-4"
              >
                {/* Item Header Row */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-stone-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Jewellery Item Specification
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase font-semibold block">Line Item Total</span>
                      <span className="text-base font-bold font-mono text-amber-950">
                        {formatINR(item.lineTotal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid Section 1: Item Name, Tag, BIS HUID, Metal, Purity & HSN */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Product Name / Description *
                    </label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => handleItemChange(idx, { productName: e.target.value })}
                      placeholder="e.g. 22K Gold Handcrafted Ring with Ruby"
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Tag / Item Code
                    </label>
                    <input
                      type="text"
                      value={item.itemCode || ''}
                      onChange={(e) => handleItemChange(idx, { itemCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. KJ-RNG-01"
                      className="w-full px-2.5 py-2 text-xs font-mono font-semibold bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-600 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-amber-950 block mb-1 flex items-center justify-between">
                      <span>BIS HUID</span>
                      <span className="text-[9.5px] font-normal text-amber-700">6-Char</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={item.huid || ''}
                      onChange={(e) => handleItemChange(idx, { huid: e.target.value.toUpperCase() })}
                      placeholder="e.g. KJ916A"
                      className="w-full px-2.5 py-2 text-xs font-mono font-bold text-amber-900 bg-amber-50/50 border border-amber-300 rounded-lg focus:outline-none focus:border-amber-600 uppercase"
                      title="Voluntary 6-character alphanumeric BIS Hallmark Unique Identification code"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-stone-700 block mb-1">Metal</label>
                    <select
                      value={item.metalType}
                      onChange={(e) =>
                        handleItemChange(idx, { metalType: e.target.value as MetalType })
                      }
                      className="w-full px-2 py-2 text-xs bg-white border border-stone-300 rounded-lg font-medium focus:outline-none"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700 block mb-1">Purity (Fineness)</label>
                    <select
                      value={item.purity}
                      onChange={(e) => handleItemChange(idx, { purity: e.target.value })}
                      className="w-full px-2 py-2 text-xs bg-white border border-stone-300 rounded-lg font-bold focus:outline-none text-stone-900"
                    >
                      {item.metalType === 'Gold' ? (
                        <>
                          <option value="22K">22K (916 Fineness)</option>
                          <option value="24K">24K (999 Pure)</option>
                          <option value="18K">18K (750 Fineness)</option>
                          <option value="14K">14K (585 Fineness)</option>
                        </>
                      ) : item.metalType === 'Silver' ? (
                        <>
                          <option value="Silver">Silver (Standard)</option>
                          <option value="925">925 (Sterling)</option>
                          <option value="999">999 (Fine Silver)</option>
                          <option value="800">800 (Silver)</option>
                        </>
                      ) : item.metalType === 'Platinum' ? (
                        <option value="Pt 950">Pt 950</option>
                      ) : (
                        <option value="Standard">Standard</option>
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-xs font-bold text-stone-700 block mb-1">HSN</label>
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) => handleItemChange(idx, { hsnCode: e.target.value })}
                      className="w-full px-1.5 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg text-center font-semibold"
                    />
                  </div>
                </div>

                {/* Grid Section 2: Metal Weights & Gold Rate (Spacious, Roomy Inputs - Never Clustered!) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-amber-50/30 rounded-xl border border-amber-200/60 items-center">
                  <div>
                    <label className="text-xs font-bold text-stone-800 block mb-1">
                      Gross Weight (g) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.grossWeight || ''}
                      onChange={(e) =>
                        handleItemChange(idx, { grossWeight: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.000"
                      className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-lg text-right focus:outline-none focus:border-amber-600 shadow-xs"
                    />
                    <span className="text-[10px] text-stone-500 mt-0.5 block">Total scale weight</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-800 block mb-1">
                      Stone Weight (g)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.stoneWeight || ''}
                      onChange={(e) =>
                        handleItemChange(idx, { stoneWeight: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.000"
                      className="w-full px-3 py-2 text-sm font-mono font-medium bg-white border border-stone-300 rounded-lg text-right focus:outline-none focus:border-amber-600 shadow-xs"
                    />
                    <span className="text-[10px] text-stone-500 mt-0.5 block">Deducted from gross</span>
                  </div>

                  <div className="bg-amber-100/70 p-2.5 rounded-lg border border-amber-300/80">
                    <span className="text-[11px] font-bold uppercase text-amber-900 block">
                      Net Metal Weight:
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-950 block mt-0.5 tabular-nums">
                      {formatGrams(item.netWeight)}
                    </span>
                    <span className="text-[10px] text-amber-800">Gross − Stone</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-800 block mb-1">
                      {item.metalType === 'Silver' ? 'Silver Rate (₹ / g)' : 'Gold Rate (₹ / g)'} *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.ratePerGram || ''}
                      onChange={(e) =>
                        handleItemChange(idx, { ratePerGram: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-stone-300 rounded-lg text-right focus:outline-none focus:border-amber-600 shadow-xs"
                    />
                    <span className="text-[10px] text-amber-900 font-semibold mt-0.5 block">
                      {item.metalType === 'Silver'
                        ? `= ₹${Math.round((item.ratePerGram || 0) * 1000).toLocaleString('en-IN')} / kg`
                        : `= ₹${Math.round((item.ratePerGram || 0) * 10).toLocaleString('en-IN')} / 10g`}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[11px] font-semibold text-stone-500 block">
                      Pure Metal Value:
                    </span>
                    <span className="text-sm font-bold font-mono text-stone-900 block mt-0.5 tabular-nums">
                      {formatINR(item.metalValue)}
                    </span>
                    <span className="text-[10px] text-stone-500">Net Wt × Rate</span>
                  </div>
                </div>

                {/* Grid Section 3: STONE DETAILS & STONE RATE SECTION (New Feature requested by user!) */}
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                    <Gem className="w-3.5 h-3.5 text-amber-600" />
                    <span>Stone Details & Stone Rate / Charges</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Stone Type / Description
                      </label>
                      <input
                        type="text"
                        value={item.stoneDescription || ''}
                        onChange={(e) => handleItemChange(idx, { stoneDescription: e.target.value })}
                        placeholder="e.g. Certified Ruby / Kundan / CZ / Polki"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-xs font-bold text-stone-800 block mb-1">
                        Stone Rate (₹ / Gram or Carat)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.stoneRate || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { stoneRate: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="e.g. 500"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-xs font-bold text-stone-800 block mb-1">
                        Total Stone Charges (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.stoneCharges || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { stoneCharges: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-500 mt-0.5 block">
                        Auto-calculated (Stone Wt × Stone Rate) or manual
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Section 4: Making Charges, Other Charges & Tax Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <div className="w-28">
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Making Type
                      </label>
                      <select
                        value={item.makingChargeType}
                        onChange={(e) =>
                          handleItemChange(idx, {
                            makingChargeType: e.target.value as MakingChargeType,
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs bg-white border border-stone-300 rounded-lg font-semibold"
                      >
                        <option value="per_gram">₹ per gram</option>
                        <option value="fixed">Fixed ₹</option>
                        <option value="percent">% of Gold</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="text-xs font-bold text-stone-700 block mb-1">
                        Making Rate ({item.makingChargeType === 'percent' ? '%' : '₹'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.makingChargeRate || ''}
                        onChange={(e) =>
                          handleItemChange(idx, {
                            makingChargeRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="200"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Other Charges (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.otherCharges || ''}
                      onChange={(e) =>
                        handleItemChange(idx, { otherCharges: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-right"
                      title="Certification, Hallmarking, or Rhodium plating charges"
                    />
                  </div>

                  <div className="sm:col-span-2 bg-stone-50 p-2 rounded-lg border border-stone-200 text-xs">
                    <span className="text-stone-500 block text-[10px]">Making Charges:</span>
                    <span className="font-mono font-bold text-stone-900 block mt-0.5">
                      {formatINR(item.makingCharges)}
                    </span>
                  </div>

                  <div className="sm:col-span-2 bg-stone-50 p-2 rounded-lg border border-stone-200 text-xs">
                    <span className="text-stone-500 block text-[10px]">Taxable Value:</span>
                    <span className="font-mono font-bold text-stone-900 block mt-0.5">
                      {formatINR(item.taxableValue)}
                    </span>
                  </div>

                  <div className="sm:col-span-2 bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs">
                    <span className="text-amber-800 block text-[10px]">GST (3%):</span>
                    <span className="font-mono font-bold text-amber-950 block mt-0.5">
                      {formatINR(item.gstAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* View Mode B: Spacious Wide Table with Roomy Inputs */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-100/90 text-stone-700 font-semibold border-b border-stone-200 text-[11px]">
                <tr>
                  <th className="py-3 px-2 text-center w-8">#</th>
                  <th className="py-3 px-3 min-w-[180px]">Product Description</th>
                  <th className="py-3 px-2 min-w-[90px]">Metal</th>
                  <th className="py-3 px-2 min-w-[90px]">Purity</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Gross Wt (g)</th>
                  <th className="py-3 px-3 min-w-[100px] text-right">Stone (g)</th>
                  <th className="py-3 px-3 min-w-[110px] text-right font-bold text-amber-950 bg-amber-50/50">Net Wt (g)</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Rate /g (₹)</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Stone Rate (₹)</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Stone Chg (₹)</th>
                  <th className="py-3 px-3 min-w-[120px] text-right">Making Chg</th>
                  <th className="py-3 px-3 min-w-[95px] text-right">Other (₹)</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Taxable (₹)</th>
                  <th className="py-3 px-2 min-w-[70px] text-center">GST%</th>
                  <th className="py-3 px-3 min-w-[120px] text-right font-bold text-stone-900">Total (₹)</th>
                  <th className="py-3 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                    <td className="py-3 px-2 text-center font-mono text-stone-400 text-xs">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, { productName: e.target.value })}
                        placeholder="e.g. 22K Gold Handcrafted Ring with Ruby"
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-semibold focus:outline-none focus:border-amber-600"
                      />
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <input
                          type="text"
                          value={item.itemCode || ''}
                          onChange={(e) => handleItemChange(idx, { itemCode: e.target.value.toUpperCase() })}
                          placeholder="Tag / SKU #"
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-50 border border-stone-200 rounded focus:outline-none uppercase"
                        />
                        <input
                          type="text"
                          maxLength={6}
                          value={item.huid || ''}
                          onChange={(e) => handleItemChange(idx, { huid: e.target.value.toUpperCase() })}
                          placeholder="BIS HUID"
                          className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded focus:outline-none uppercase"
                          title="Voluntary BIS Hallmark Unique ID"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-2">
                      <select
                        value={item.metalType}
                        onChange={(e) =>
                          handleItemChange(idx, { metalType: e.target.value as MetalType })
                        }
                        className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-md text-xs focus:outline-none"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>

                    <td className="py-3 px-2">
                      <select
                        value={item.purity}
                        onChange={(e) => handleItemChange(idx, { purity: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-md text-xs font-bold focus:outline-none"
                      >
                        {item.metalType === 'Gold' ? (
                          <>
                            <option value="22K">22K (916)</option>
                            <option value="24K">24K (999)</option>
                            <option value="18K">18K (750)</option>
                            <option value="14K">14K (585)</option>
                          </>
                        ) : item.metalType === 'Silver' ? (
                          <>
                            <option value="Silver">Silver (Std)</option>
                            <option value="925">925 (Sterling)</option>
                            <option value="999">999 (Fine)</option>
                            <option value="800">800 (Silver)</option>
                          </>
                        ) : item.metalType === 'Platinum' ? (
                          <option value="Pt 950">Pt 950</option>
                        ) : (
                          <option value="Standard">Standard</option>
                        )}
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.grossWeight || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { grossWeight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono font-bold focus:outline-none focus:border-amber-600"
                      />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.stoneWeight || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { stoneWeight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-950 bg-amber-50/50">
                      {item.netWeight.toFixed(3)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={item.ratePerGram || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { ratePerGram: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono font-bold"
                      />
                      <span className="text-[9px] text-amber-900 block font-sans font-semibold mt-0.5 whitespace-nowrap">
                        {item.metalType === 'Silver'
                          ? `₹${Math.round((item.ratePerGram || 0) * 1000).toLocaleString('en-IN')}/kg`
                          : `₹${Math.round((item.ratePerGram || 0) * 10).toLocaleString('en-IN')}/10g`}
                      </span>
                    </td>

                    {/* Stone Rate */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="1"
                        placeholder="₹/g"
                        value={item.stoneRate || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { stoneRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono"
                      />
                    </td>

                    {/* Stone Charges */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.stoneCharges.toFixed(2)}
                    </td>

                    {/* Making Charges */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={item.makingChargeRate || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { makingChargeRate: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="200"
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono"
                      />
                    </td>

                    {/* Other Charges */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.otherCharges || ''}
                        onChange={(e) =>
                          handleItemChange(idx, { otherCharges: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-right bg-white border border-stone-300 rounded-md text-xs font-mono"
                      />
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {item.taxableValue.toFixed(2)}
                    </td>

                    <td className="py-3 px-2 text-center text-stone-600 font-semibold">
                      {item.gstRate}%
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-950">
                      {item.lineTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        className="text-stone-400 hover:text-rose-600 disabled:opacity-30 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary Footer */}
        <div className="bg-stone-100 p-4 border-t-2 border-stone-300 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-stone-900">
          <div className="flex items-center gap-6">
            <span>Gross: <strong className="font-mono text-sm">{summary.totalGrossWeight.toFixed(3)}g</strong></span>
            <span>Stone: <strong className="font-mono text-sm">{summary.totalStoneWeight.toFixed(3)}g</strong></span>
            <span className="text-amber-950">Net Metal: <strong className="font-mono text-base">{summary.totalNetWeight.toFixed(3)}g</strong></span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span>Taxable: <strong className="font-mono">{formatINR(summary.totalTaxableValue)}</strong></span>
            <span>GST (3%): <strong className="font-mono">{formatINR(summary.totalGst)}</strong></span>
            <span className="text-base text-amber-950">
              Total: <strong className="font-mono text-lg">{formatINR(summary.grandTotal)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Payment & Settlement Card with Old Gold & Advance Deductions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        {/* Left Col: Old Gold, Advance, Payment Mode & WhatsApp */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                3. Payment Settlement, Old Gold & Advance Deductions
              </h3>
              <p className="text-[11px] text-stone-500">
                Directly subtract Old Gold return value and customer advance payments from the total bill
              </p>
            </div>
          </div>

          {/* 3A: Old Gold Return / Exchange Section (पुरानी सोने की वापसी) */}
          <div className={`rounded-xl border transition-all p-4 ${
            applyOldGold
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/10'
              : 'bg-stone-50/60 border-stone-200'
          }`}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyOldGold}
                  onChange={(e) => setApplyOldGold(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-stone-900">
                    Old Gold Return / Exchange (पुरानी सोने की वापसी)
                  </span>
                </div>
              </label>
              {applyOldGold && (
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Deducting: - {formatINR(effectiveOldGold)}
                </span>
              )}
            </div>

            {applyOldGold && (
              <div className="mt-3.5 pt-3 border-t border-amber-200/80 space-y-3">
                {/* Mode Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-stone-600">Valuation Method:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOldGoldMode('calculated');
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                      oldGoldMode === 'calculated'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Calculate by Weight & Karat (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOldGoldMode('lumpsum');
                      setOldGoldGrossWeight(0);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                      oldGoldMode === 'lumpsum'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    Direct Trade-in Credit / Discount (₹)
                  </button>
                </div>

                {/* If Lump-sum / Direct Trade-in Mode */}
                {oldGoldMode === 'lumpsum' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-stone-200">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Credit / Deduction Description
                      </label>
                      <input
                        type="text"
                        value={oldGoldDesc}
                        onChange={(e) => setOldGoldDesc(e.target.value)}
                        placeholder="e.g. Trade-in Credit / Festive Voucher / Exchange Adjustment"
                        className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-md focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-rose-800 block mb-1">
                        Direct Credit Amount (₹) to Deduct *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={oldGoldAmount || ''}
                        onChange={(e) => setOldGoldAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="e.g. 5600"
                        className="w-full px-3 py-1.5 text-sm font-mono font-bold text-rose-700 bg-rose-50/50 border border-rose-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* If Calculated by Weight & Karat */
                  <div className="bg-white p-3 rounded-lg border border-stone-200 space-y-2.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="col-span-2">
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={oldGoldDesc}
                          onChange={(e) => setOldGoldDesc(e.target.value)}
                          placeholder="e.g. 22K Old Jewellery"
                          className="w-full px-2 py-1 text-xs bg-stone-50 border border-stone-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Purity
                        </label>
                        <select
                          value={oldGoldPurity}
                          onChange={(e) => handleOldGoldPurityChange(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-stone-300 rounded-md font-bold"
                        >
                          <option value="22K">22K Gold</option>
                          <option value="24K">24K Gold</option>
                          <option value="18K">18K Gold</option>
                          <option value="14K">14K Gold</option>
                          <option value="Silver">Silver</option>
                          <option value="999 Silver">999 Fine Silver</option>
                          <option value="925 Silver">925 Sterling Silver</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-stone-700 block mb-1">
                          Gross Weight (g) *
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={oldGoldGrossWeight || ''}
                          onChange={(e) => setOldGoldGrossWeight(parseFloat(e.target.value) || 0)}
                          placeholder="0.000"
                          className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-stone-300 rounded-md text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Melting / Loss %
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={oldGoldDeductionPercent || ''}
                          onChange={(e) => setOldGoldDeductionPercent(parseFloat(e.target.value) || 0)}
                          placeholder="0 %"
                          className="w-full px-2 py-1 text-xs font-mono bg-white border border-stone-300 rounded-md text-right"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Exchange Rate (₹/g)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={oldGoldRatePerGram || ''}
                          onChange={(e) => setOldGoldRatePerGram(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs font-mono font-bold bg-white border border-stone-300 rounded-md text-right"
                        />
                        <span className="text-[9.5px] text-amber-900 block font-sans font-semibold mt-0.5">
                          {oldGoldPurity.includes('Silver')
                            ? `= ₹${Math.round((oldGoldRatePerGram || 0) * 1000).toLocaleString('en-IN')} / kg`
                            : `= ₹${Math.round((oldGoldRatePerGram || 0) * 10).toLocaleString('en-IN')} / 10g`}
                        </span>
                      </div>

                      <div className="bg-amber-50/70 p-2 rounded-md border border-amber-200 text-right">
                        <span className="text-[10px] text-amber-800 font-semibold block">Calculated Value:</span>
                        <span className="text-xs font-mono font-extrabold text-amber-950 block mt-0.5">
                          {formatINR(oldGoldAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3B: Advance / Pre-paid Amount Section (अग्रिम राशि / पेशगी कटौती) */}
          <div className="bg-stone-50/60 border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-stone-900">
                Customer Advance / Pre-Payment Deductions (अग्रिम राशि कटौती)
              </span>
            </div>

            {/* Registered Customer Ledger Advance */}
            {selectedCustomer && selectedCustomer.availableAdvanceBalance > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900">
                    <input
                      type="checkbox"
                      checked={applyAdvance}
                      onChange={(e) => setApplyAdvance(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span>Redeem from Registered Customer Advance Balance</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    Ledger Available: {formatINR(selectedCustomer.availableAdvanceBalance)}
                  </span>
                </div>

                {applyAdvance && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-emerald-800 font-medium">Adjust Amount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      max={selectedCustomer.availableAdvanceBalance}
                      value={advanceAdjustAmount}
                      onChange={(e) =>
                        setAdvanceAdjustAmount(
                          Math.min(
                            selectedCustomer.availableAdvanceBalance,
                            parseFloat(e.target.value) || 0
                          )
                        )
                      }
                      className="w-36 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-md text-stone-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAdvanceAdjustAmount(selectedCustomer.availableAdvanceBalance)}
                      className="text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900"
                    >
                      Use Full Balance
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Advance / Cash or UPI Paid Earlier (works for walk-in or any customer) */}
            <div className={`p-3 rounded-lg border transition-all ${
              applyDirectAdvance ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={applyDirectAdvance}
                    onChange={(e) => setApplyDirectAdvance(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <span>Subtract Counter Advance / Cash Received in Advance</span>
                </label>
                {applyDirectAdvance && directAdvanceAmount > 0 && (
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    - {formatINR(directAdvanceAmount)}
                  </span>
                )}
              </div>

              {applyDirectAdvance && (
                <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center gap-3">
                  <span className="text-xs text-stone-700">Advance Amount Given (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={directAdvanceAmount || ''}
                    onChange={(e) => setDirectAdvanceAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 10000"
                    className="w-40 px-3 py-1.5 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-md text-stone-900 focus:outline-none"
                  />
                  <span className="text-[11px] text-stone-500">
                    Directly subtracted from the Grand Total
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3C: Primary Payment Method Selector */}
          <div>
            <div className="text-xs font-bold text-stone-700 mb-2">Primary Payment Settlement Method</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Cash', 'UPI', 'Bank Transfer', 'Card'] as PaymentMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPaymentMode(mode);
                    setIsSplitPayment(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    paymentMode === mode && !isSplitPayment
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1">
              Invoice Notes / Special Remarks (Optional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. BIS Hallmarking stamped, warranty 1 yr, ring resized to 14"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none"
            />
          </div>

          {/* 3D: Customer WhatsApp Delivery Integration */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  Send Digital Tax Bill Directly on WhatsApp
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Instant Delivery
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
              <div className="flex-1 flex items-center bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-bold text-stone-400 mr-1.5">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={whatsappMobile}
                  onChange={(e) => setWhatsappMobile(e.target.value)}
                  placeholder="Customer 10-digit WhatsApp Number"
                  className="w-full text-xs font-mono font-bold text-stone-900 bg-transparent focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowWhatsAppPreview(true)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview WhatsApp Message</span>
              </button>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              The customer receives an instant, professional WhatsApp message with complete item list, hallmarking details, old gold / advance deductions, and shop details.
            </p>
          </div>
        </div>

        {/* Right Col: Calculation Summary & Finalize Action Buttons */}
        <div className="lg:col-span-5 bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-2.5">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider border-b border-stone-200 pb-2">
            Tax & Final Billing Breakdown
          </div>

          <div className="flex justify-between items-center text-xs text-stone-700">
            <span>Taxable Amount</span>
            <span className="font-mono font-semibold tabular-nums">{formatINR(summary.totalTaxableValue)}</span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between items-center text-xs text-stone-600">
                <span>CGST (1.5%)</span>
                <span className="font-mono tabular-nums">{formatINR(summary.cgst)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-600">
                <span>SGST (1.5%)</span>
                <span className="font-mono tabular-nums">{formatINR(summary.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center text-xs text-stone-600">
              <span>IGST (3.0%)</span>
              <span className="font-mono tabular-nums">{formatINR(summary.igst)}</span>
            </div>
          )}

          {summary.roundOff !== 0 && (
            <div className="flex justify-between items-center text-xs text-stone-500">
              <span>Round Off</span>
              <span className="font-mono tabular-nums">{summary.roundOff.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-stone-300 pt-2 flex justify-between items-center">
            <span className="text-sm font-bold text-stone-900">Total Bill (incl. GST)</span>
            <span className="text-lg font-bold font-mono text-stone-900 tabular-nums">
              {formatINR(summary.grandTotal)}
            </span>
          </div>

          {/* Deductions: Old Gold Return */}
          {effectiveOldGold > 0 && (
            <div className="flex justify-between items-center text-xs text-rose-800 font-bold bg-rose-100/70 p-2 rounded-lg border border-rose-200">
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                <span>Less Old Gold Exchanged:</span>
              </div>
              <span className="font-mono tabular-nums">- {formatINR(effectiveOldGold)}</span>
            </div>
          )}

          {/* Deductions: Advance Payment */}
          {effectiveAdvanceAdjust > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>Less Advance / Pre-paid:</span>
              </div>
              <span className="font-mono tabular-nums">- {formatINR(effectiveAdvanceAdjust)}</span>
            </div>
          )}

          {/* Prominent Net Payable Box */}
          <div className="border-t-2 border-stone-300 pt-2.5 pb-2 px-3 bg-amber-50/70 rounded-xl border border-amber-300">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 block">
                  Net Payable Amount
                </span>
                {(effectiveOldGold > 0 || effectiveAdvanceAdjust > 0) && (
                  <span className="text-[10px] text-amber-800">
                    After Old Gold & Advance Deductions
                  </span>
                )}
              </div>
              <span className="text-2xl font-extrabold font-mono text-amber-950 tabular-nums">
                {formatINR(summary.netPayable)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-stone-800 pt-1">
            <span className="font-semibold">Amount Paid Now (₹):</span>
            <input
              type="number"
              min="0"
              value={amountPaidNow}
              onChange={(e) => {
                setPaidManuallyEdited(true);
                setAmountPaidNow(parseFloat(e.target.value) || 0);
              }}
              className="w-32 px-2.5 py-1 text-right text-xs font-mono font-bold bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {summary.remainingBalance > 0 && (
            <div className="flex justify-between items-center text-xs text-rose-700 font-bold border-t border-dashed border-stone-300 pt-1.5">
              <span>Remaining Balance (Due):</span>
              <span className="font-mono tabular-nums">{formatINR(summary.remainingBalance)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 space-y-2">
            {/* 1. Finalize & Send on WhatsApp */}
            <button
              type="button"
              onClick={() => handleFinalize(false, true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              title="Save invoice and send digital bill directly to customer on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Finalize & Send on WhatsApp</span>
            </button>

            {/* 2. Finalize & Print A4 / Save PDF */}
            <button
              type="button"
              onClick={() => handleFinalize(true, false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              title="Save invoice and open official A4 print preview and download PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Finalize & Print / Save PDF</span>
            </button>

            {/* 3. Finalize & Save Only */}
            <button
              type="button"
              onClick={() => handleFinalize(false, false)}
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              title="Save to ledger without printing"
            >
              <FileCheck className="w-4 h-4" />
              <span>Finalize & Save Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Customer Inline Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Customer</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-stone-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomerInline} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                />
                {(() => {
                  const match = newCustName.trim().length >= 2
                    ? customers.find((c) => c.name.trim().toLowerCase() === newCustName.trim().toLowerCase())
                    : null;
                  if (!match) return null;
                  return (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-900 mt-1.5 flex items-start justify-between gap-2 shadow-xs">
                      <div>
                        <span className="font-bold">⚠️ Customer already exists:</span>
                        <div className="text-[11px] text-stone-700 mt-0.5">
                          "{match.name}" ({match.id}, Ph: {match.mobile})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCustomer(match);
                          setShowAddCustomerModal(false);
                        }}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded shrink-0 shadow-xs"
                      >
                        Select Customer
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Mobile Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9818144011"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. New Ashok Nagar, Delhi"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="07AAAAA0000A1Z5"
                  value={newCustGstin}
                  onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Message Preview Modal */}
      {showWhatsAppPreview && (() => {
        const previewCustName = selectedCustomer ? selectedCustomer.name : 'Valued Customer';
        const previewCustMobile = whatsappMobile || (selectedCustomer ? selectedCustomer.mobile : '9818144011');
        const previewInvoice: Invoice = {
          id: 'preview',
          invoiceNumber: invoiceNumber || 'KJ/26-001',
          date: invoiceDate,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          customerId: selectedCustomer ? selectedCustomer.id : 'WALK_IN',
          customerName: custNameInput.trim() || previewCustName,
          customerMobile: previewCustMobile,
          customerAddress: custAddressInput.trim() || (selectedCustomer ? selectedCustomer.address : 'Showroom Counter Handover, New Delhi'),
          customerState: selectedCustomer ? selectedCustomer.state : (isInterState ? 'Outside Delhi' : 'Delhi'),
          customerStateCode: selectedCustomer ? selectedCustomer.stateCode : (isInterState ? '99' : '07'),
          customerPincode: custPincodeInput.trim() || (selectedCustomer ? selectedCustomer.pincode : '110096'),
          customerPan: custPanInput.trim().toUpperCase() || undefined,
          deliveryAddress: custDeliveryAddressInput.trim() || custAddressInput.trim() || (selectedCustomer ? selectedCustomer.address : 'Showroom Counter Handover'),
          isInterState,
          items,
          totalGrossWeight: summary.totalGrossWeight,
          totalStoneWeight: summary.totalStoneWeight,
          totalNetWeight: summary.totalNetWeight,
          totalTaxableValue: summary.totalTaxableValue,
          cgst: summary.cgst,
          sgst: summary.sgst,
          igst: summary.igst,
          totalGst: summary.totalGst,
          roundOff: summary.roundOff,
          grandTotal: summary.grandTotal,
          oldGoldAmount: effectiveOldGold > 0 ? effectiveOldGold : undefined,
          oldGoldExchange: effectiveOldGold > 0 ? {
            description: oldGoldDesc || 'Old Gold Return',
            grossWeight: Number(oldGoldGrossWeight) || 0,
            purity: oldGoldPurity,
            deductionPercent: Number(oldGoldDeductionPercent) || 0,
            netWeight: Math.round(((Number(oldGoldGrossWeight) || 0) * (1 - (Number(oldGoldDeductionPercent) || 0) / 100)) * 1000) / 1000,
            ratePerGram: Number(oldGoldRatePerGram) || 0,
            totalValue: effectiveOldGold,
          } : undefined,
          advanceAdjusted: effectiveAdvanceAdjust,
          netPayable: summary.netPayable,
          amountPaidNow,
          remainingBalance: summary.remainingBalance,
          paymentMode,
          paymentStatus: summary.remainingBalance <= 0 ? 'Paid' : 'Partially Paid',
          status: 'Finalized',
          notes,
          createdByStaff: currentStaffName,
          bankDetails: {
            bankName: settings.bankName,
            accountName: settings.accountName,
            accountNumber: settings.accountNumber,
            ifscCode: settings.ifscCode,
            upiId: settings.upiId,
          },
        };

        const previewMsg = generateWhatsAppInvoiceMessage(previewInvoice, settings);

        return (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* WhatsApp Header */}
              <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <div>
                    <h3 className="font-bold text-sm">WhatsApp Bill Preview</h3>
                    <p className="text-[11px] text-emerald-100">
                      Sending to +91 {previewCustMobile} ({previewCustName})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppPreview(false)}
                  className="text-stone-300 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Message Bubble */}
              <div className="p-4 bg-[#E5DDD5] overflow-y-auto flex-1 font-sans text-xs">
                <div className="bg-white rounded-xl p-4 shadow-xs whitespace-pre-wrap font-sans text-stone-800 leading-relaxed border border-stone-200/80">
                  {previewMsg}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewMsg);
                    alert('WhatsApp message copied to clipboard!');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Copy Text
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppPreview(false)}
                    className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = previewCustMobile.replace(/\D/g, '');
                      const phone = clean.length === 10 ? '91' + clean : clean;
                      const encoded = encodeURIComponent(previewMsg);
                      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Open in WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
