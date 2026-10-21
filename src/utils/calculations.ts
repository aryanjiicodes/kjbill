import { InvoiceItem, MakingChargeType } from '../types';

export function calculateNetWeight(grossWeight: number, stoneWeight: number, otherWeight: number = 0): number {
  const net = (Number(grossWeight) || 0) - (Number(stoneWeight) || 0) - (Number(otherWeight) || 0);
  return Math.max(0, Math.round(net * 1000) / 1000);
}

export function calculateMakingCharges(
  netWeight: number,
  metalValue: number,
  chargeType: MakingChargeType,
  rate: number
): number {
  const r = Number(rate) || 0;
  if (chargeType === 'per_gram') {
    return Math.round((netWeight * r) * 100) / 100;
  }
  if (chargeType === 'percent') {
    return Math.round((metalValue * (r / 100)) * 100) / 100;
  }
  return Math.round(r * 100) / 100;
}

export function calculateItemRow(item: Partial<InvoiceItem>): InvoiceItem {
  const grossWeight = Math.round((Number(item.grossWeight) || 0) * 1000) / 1000;
  const stoneWeight = Math.round((Number(item.stoneWeight) || 0) * 1000) / 1000;
  const netWeight = calculateNetWeight(grossWeight, stoneWeight);

  const ratePerGram = Number(item.ratePerGram) || 0;
  const metalValue = Math.round((netWeight * ratePerGram) * 100) / 100;

  const stoneRate = Number(item.stoneRate) || 0;
  let stoneCharges = Number(item.stoneCharges) || 0;
  if (stoneRate > 0 && stoneWeight > 0 && (item.stoneCharges === undefined || item.stoneCharges === 0)) {
    stoneCharges = Math.round((stoneWeight * stoneRate) * 100) / 100;
  }

  const makingChargeType = item.makingChargeType || 'per_gram';
  const makingChargeRate = Number(item.makingChargeRate) || 0;
  const makingCharges = calculateMakingCharges(netWeight, metalValue, makingChargeType, makingChargeRate);

  const otherCharges = Number(item.otherCharges) || 0;
  const discount = Number(item.discount) || 0;

  const taxableValue = Math.max(0, Math.round((metalValue + stoneCharges + makingCharges + otherCharges - discount) * 100) / 100);
  const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 3;
  const gstAmount = Math.round((taxableValue * (gstRate / 100)) * 100) / 100;
  const lineTotal = Math.round((taxableValue + gstAmount) * 100) / 100;

  return {
    id: item.id || 'item_' + Date.now() + Math.random().toString(36).substring(2, 6),
    productName: item.productName || '',
    itemCode: item.itemCode,
    huid: item.huid,
    hallmarkingCharges: item.hallmarkingCharges,
    metalType: item.metalType || 'Gold',
    purity: item.purity || (item.metalType === 'Silver' ? 'Silver' : item.metalType === 'Platinum' ? 'Pt 950' : '22K'),
    hsnCode: item.hsnCode || (item.metalType === 'Silver' ? '711311' : '711319'),
    grossWeight,
    stoneWeight,
    netWeight,
    ratePerGram,
    metalValue,
    stoneDescription: item.stoneDescription || '',
    stoneRate,
    stoneCharges,
    makingChargeType,
    makingChargeRate,
    makingCharges,
    otherCharges,
    discount,
    taxableValue,
    gstRate,
    gstAmount,
    lineTotal,
  };
}

export function calculateInvoiceSummary(
  items: InvoiceItem[],
  isInterState: boolean,
  advanceAdjusted: number = 0,
  amountPaidNow: number = 0,
  oldGoldAmount: number = 0
) {
  let totalGrossWeight = 0;
  let totalStoneWeight = 0;
  let totalNetWeight = 0;
  let totalTaxableValue = 0;

  items.forEach((item) => {
    totalGrossWeight += item.grossWeight || 0;
    totalStoneWeight += item.stoneWeight || 0;
    totalNetWeight += item.netWeight || 0;
    totalTaxableValue += item.taxableValue || 0;
  });

  totalGrossWeight = Math.round(totalGrossWeight * 1000) / 1000;
  totalStoneWeight = Math.round(totalStoneWeight * 1000) / 1000;
  totalNetWeight = Math.round(totalNetWeight * 1000) / 1000;
  totalTaxableValue = Math.round(totalTaxableValue * 100) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = Math.round((totalTaxableValue * 0.03) * 100) / 100;
  } else {
    // Intra-state (Delhi to Delhi): 1.5% CGST + 1.5% SGST
    cgst = Math.round((totalTaxableValue * 0.015) * 100) / 100;
    sgst = Math.round((totalTaxableValue * 0.015) * 100) / 100;
  }

  const totalGst = Math.round((cgst + sgst + igst) * 100) / 100;
  const rawGrandTotal = totalTaxableValue + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  const validOldGold = Math.max(0, Number(oldGoldAmount) || 0);
  const validAdvance = Math.max(0, Number(advanceAdjusted) || 0);
  const netPayable = Math.max(0, grandTotal - validOldGold - validAdvance);
  const remainingBalance = Math.max(0, netPayable - (Number(amountPaidNow) || 0));

  return {
    totalGrossWeight,
    totalStoneWeight,
    totalNetWeight,
    totalTaxableValue,
    cgst,
    sgst,
    igst,
    totalGst,
    roundOff,
    grandTotal,
    oldGoldAmount: validOldGold,
    advanceAdjusted: validAdvance,
    netPayable,
    remainingBalance,
  };
}
