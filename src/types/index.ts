export type MetalType = 'Gold' | 'Silver' | 'Platinum' | 'Other';
export type GoldPurity = '24K' | '22K' | '18K' | '14K' | '925' | '999' | 'Custom';
export type MakingChargeType = 'per_gram' | 'fixed' | 'percent';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Split';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type InvoiceStatus = 'Finalized' | 'Draft' | 'Cancelled';
export type UserRole = 'Owner' | 'Staff';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  address: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  totalPurchases: number;
  totalPaymentsReceived: number;
  outstandingBalance: number;
  availableAdvanceBalance: number;
  createdAt: string;
  notes?: string;
}

export interface MetalRates {
  gold24k: number;
  gold22k: number;
  gold18k: number;
  gold14k: number;
  silver999: number;
  silver925: number;
  platinum: number;
  updatedAt: string;
  updatedBy: string;
  rateMode?: 'api' | 'manual';
  apiSource?: 'default' | 'ibja';
  autoSyncIntervalMinutes?: number; // 5, 10, or 15 (default: 5)
  previousRates?: {
    gold24k?: number;
    gold22k?: number;
    gold18k?: number;
    gold14k?: number;
    silver999?: number;
    silver925?: number;
    platinum?: number;
  };
}

export interface MetalRateHistoryEntry {
  id: string;
  date: string;
  time: string;
  metalType: string;
  purity: string;
  ratePerGram: number;
  updatedBy: string;
}

export interface InvoiceItem {
  id: string;
  productName: string;
  metalType: MetalType;
  purity: string;
  hsnCode: string;
  grossWeight: number; // in grams (3 decimals)
  stoneWeight: number; // in grams
  netWeight: number;   // grossWeight - stoneWeight
  ratePerGram: number;
  metalValue: number;  // netWeight * ratePerGram
  stoneDescription?: string;
  stoneRate?: number; // Stone rate per gram / carat
  stoneCharges: number;
  itemCode?: string; // Tag / SKU / Barcode code (e.g. RNG-22K-08)
  huid?: string; // 6-character BIS Hallmark Unique ID (voluntary as per BIS guidance)
  hallmarkingCharges?: number; // Official BIS Hallmarking fee (e.g. ₹45/pc)
  makingChargeType: MakingChargeType;
  makingChargeRate: number; // ₹/g, fixed ₹, or %
  makingCharges: number;
  otherCharges: number;
  discount: number;
  taxableValue: number; // metalValue + stoneCharges + makingCharges + otherCharges - discount
  gstRate: number;      // usually 3%
  gstAmount: number;
  lineTotal: number;
}

export interface InvoiceBankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerState: string;
  customerStateCode: string;
  customerPincode?: string;
  customerPan?: string;
  customerGstin?: string;
  deliveryAddress?: string;
  isInterState: boolean;
  items: InvoiceItem[];
  totalGrossWeight: number;
  totalStoneWeight: number;
  totalNetWeight: number;
  totalTaxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  oldGoldAmount?: number;
  oldGoldExchange?: {
    description: string;
    grossWeight: number;
    purity: string;
    deductionPercent: number;
    netWeight: number;
    ratePerGram: number;
    totalValue: number;
  };
  advanceAdjusted: number;
  advanceReceiptId?: string;
  netPayable?: number;
  amountPaidNow: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  paymentBreakdown?: {
    cash: number;
    upi: number;
    card: number;
    bank: number;
  };
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  notes?: string;
  createdByStaff: string;
  bankDetails: InvoiceBankDetails;
  qrCodeDataUrl?: string;
}

export interface AdvanceDeposit {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  depositDate: string;
  depositTime: string;
  amount: number;
  paymentMode: PaymentMode;
  metalCategory: 'Gold' | 'Silver' | 'General';
  metalRateAtDeposit: number;
  purity?: string;
  equivalentGrams?: number;
  redeemedAmount: number;
  availableBalance: number;
  transactionRef?: string;
  purpose?: string;
  staffName: string;
  status: 'Active' | 'Fully Redeemed' | 'Partially Redeemed' | 'Refunded';
  redemptions: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    date: string;
  }[];
}

export interface InstallmentPayment {
  id: string;
  receiptNumber: string;
  date: string;
  time: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  staffName: string;
}

export interface InstallmentPlan {
  id: string;
  planNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  linkedOrderId?: string;
  schemeName: string;
  totalAgreedAmount: number;
  installmentsCount: number;
  monthlyAmount: number;
  startDate: string;
  nextDueDate: string;
  totalPaid: number;
  remainingAmount: number;
  status: 'Active' | 'Completed' | 'Overdue' | 'On Hold';
  payments: InstallmentPayment[];
  terms?: string;
}

export type OrderStatus =
  | 'New Request'
  | 'Quotation Pending'
  | 'Approved by Customer'
  | 'Advance Received'
  | 'Ordered from Supplier'
  | 'In Production'
  | 'Received at Shop'
  | 'Ready for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface JewelleryOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  metalType: MetalType;
  purity: string;
  estimatedGrossWeight: number;
  estimatedNetWeight: number;
  stoneRequirements?: string;
  makingChargeEstimate: number;
  quotedRate: number;
  estimatedPrice: number;
  advancePaid: number;
  advanceReceiptId?: string;
  remainingBalance: number;
  status: OrderStatus;
  bookletRef?: {
    bookletNo: string;
    pageNo: string;
    designNo: string;
  };
  designPhotoUrl?: string;
  supplierName?: string;
  notes?: string;
  actualDetails?: {
    grossWeight: number;
    netWeight: number;
    finalPrice: number;
    invoiceId?: string;
  };
}

export interface InventoryItem {
  id: string;
  tagNumber: string;
  productName: string;
  metalType: MetalType;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  makingChargeRate: number;
  makingChargeType: MakingChargeType;
  ratePerGram: number;
  purchaseCost: number;
  sellingPriceEstimate: number;
  hsnCode: string;
  supplier: string;
  inStock: boolean;
  quantity: number;
  photoUrl?: string;
  createdAt: string;
}

export interface ShopSettings {
  businessName: string;
  ownerName: string;
  address: string;
  mobile: string;
  email: string;
  gstin: string;
  state: string;
  stateCode: string;
  defaultGstRate: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  invoicePrefix: string;
  receiptPrefix: string;
  financialYear: string;
  termsAndConditions: string[];
  logoUrl?: string;
  bisHallmarkUrl?: string;
  ownerPin: string;
  staffPin: string;
}
