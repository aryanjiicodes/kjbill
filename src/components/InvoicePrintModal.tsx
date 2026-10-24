import React, { useRef, useState, useEffect } from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';
import { Printer, X, Download, Loader2, MessageCircle, Copy } from 'lucide-react';
import { openWhatsAppInvoice, generateWhatsAppInvoiceMessage } from '../utils/whatsapp';
import { generateUpiQrDataUrl } from '../utils/qrCode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import mainLogoImg from '../assets/images/kamakhya_main_logo.png';
import bisLogoImg from '../assets/images/bis_hallmark_logo.png';
import watermarkImg from '../assets/images/watermark.png';
import signatureImg from '../assets/images/authorized_signature.png';

interface Props {
  invoice: Invoice;
  settings: ShopSettings;
  onClose: () => void;
}

interface SheetProps {
  invoice: Invoice;
  settings: ShopSettings;
  terms: string[];
  totalOtherCharges: number;
  activeQrUrl?: string;
}

function formatPurityWithFineness(purity: string, metal: string): string {
  const p = (purity || '').trim();
  const m = (metal || '').toLowerCase();
  if (m === 'gold') {
    if (p.includes('22')) return '22K (916)';
    if (p.includes('24')) return '24K (999)';
    if (p.includes('18')) return '18K (750)';
    if (p.includes('14')) return '14K (585)';
    return p;
  }
  if (m === 'silver') {
    if (p.includes('925')) return '925 (Sterling)';
    if (p.includes('999')) return '999 (Fine)';
    if (p.includes('800')) return '800 (Silver)';
    return `${p} Silver`;
  }
  return p;
}

const InvoiceSheet = React.forwardRef<HTMLDivElement, SheetProps>(
  ({ invoice, settings, terms, totalOtherCharges, activeQrUrl }, ref) => {
    const hasStones = invoice.items.some(
      (item) => (item.stoneWeight && item.stoneWeight > 0) || (item.stoneCharges && item.stoneCharges > 0)
    );
    const totalStoneCharges = invoice.items.reduce((s, i) => s + (i.stoneCharges || 0), 0);
    const tableColSpan = hasStones ? 13 : 11;

    // Statutory HSN/SAC Tax Grouping for the GST Table
    const hsnMap: Record<
      string,
      { hsn: string; taxable: number; cgstRate: number; cgstAmt: number; sgstRate: number; sgstAmt: number; totalTax: number }
    > = {};

    invoice.items.forEach((item) => {
      const hsn = item.hsnCode || (item.metalType === 'Silver' ? '711311' : '711319');
      if (!hsnMap[hsn]) {
        hsnMap[hsn] = {
          hsn,
          taxable: 0,
          cgstRate: invoice.isInterState ? 0 : (item.gstRate || 3) / 2,
          cgstAmt: 0,
          sgstRate: invoice.isInterState ? 0 : (item.gstRate || 3) / 2,
          sgstAmt: 0,
          totalTax: 0,
        };
      }
      const taxVal = item.taxableValue || 0;
      hsnMap[hsn].taxable += taxVal;
      if (invoice.isInterState) {
        const igst = Math.round((taxVal * ((item.gstRate || 3) / 100)) * 100) / 100;
        hsnMap[hsn].totalTax += igst;
      } else {
        const cgst = Math.round((taxVal * (((item.gstRate || 3) / 2) / 100)) * 100) / 100;
        const sgst = Math.round((taxVal * (((item.gstRate || 3) / 2) / 100)) * 100) / 100;
        hsnMap[hsn].cgstAmt += cgst;
        hsnMap[hsn].sgstAmt += sgst;
        hsnMap[hsn].totalTax += cgst + sgst;
      }
    });
    const hsnRows = Object.values(hsnMap);

    // Height budget for the single open filler area so the entire invoice fits the A4 sheet cleanly
    const fillerHeight = Math.max(40, 360 - invoice.items.length * 24);

    return (
      <div
        ref={ref}
        className="w-full max-w-[204mm] h-[289mm] print:h-[289mm] print:max-h-[289mm] print:min-h-[289mm] bg-white text-stone-900 mx-auto print:m-0 print:p-0 text-[9px] leading-tight relative flex flex-col justify-between box-border overflow-hidden"
        style={{
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Background Watermark (Subtle & Elegant, Centered behind table) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src={watermarkImg}
            alt="Watermark"
            className="w-[420px] max-w-[80%] opacity-[0.16] select-none object-contain print:opacity-[0.16]"
          />
        </div>

        {/* Outer ERP Box Border - Solid, continuous closed rectangle */}
        <div className="border-[1.5px] border-stone-800 flex flex-col justify-between h-full w-full relative z-10 box-border bg-white/20 print:bg-white/20">
          {/* Top Sections Container */}
          <div className="w-full">
            {/* 1. Top Brand Header */}
            <div className="border-b-[1.5px] border-stone-800 p-1.5 px-2 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/40 flex items-center justify-between gap-2">
              {/* Left: Main Brand Logo */}
              <div className="w-[80px] shrink-0 flex flex-col items-center justify-center">
                <img
                  src={mainLogoImg}
                  alt="KAMAKHYA JEWELLERS"
                  className="h-[52px] w-[52px] object-contain drop-shadow-xs"
                />
                <span className="text-[7.5px] font-extrabold text-amber-950 uppercase tracking-widest mt-0.5">ESTB. 2006</span>
              </div>

              {/* Center: Brand Name & Address */}
              <div className="text-center flex-1 px-1">
                <h1 className="text-2xl sm:text-[25px] font-serif font-black tracking-wider text-stone-950 uppercase leading-none">
                  KAMAKHYA JEWELLERS
                </h1>
                <p className="text-[9px] text-stone-700 font-medium max-w-lg mx-auto leading-normal mt-0.5">
                  {settings.address}
                </p>
                <div className="flex items-center justify-center gap-2 text-[8.5px] text-stone-700 mt-0.5">
                  <span>Ph: +91 {settings.mobile}</span>
                  {settings.email && (
                    <>
                      <span>·</span>
                      <span>{settings.email}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right: BIS Hallmark Emblem */}
              <div className="w-[80px] shrink-0 flex flex-col items-center justify-center text-center">
                <img
                  src={bisLogoImg}
                  alt="BIS Hallmark"
                  className="h-[46px] w-auto max-w-[75px] object-contain"
                />
                <span className="text-[7.5px] font-extrabold text-blue-900 tracking-wider mt-0.5 uppercase">
                  BIS 916 Hallmark
                </span>
              </div>
            </div>

            {/* 2. Document Title Bar - Perfectly Centered, Bold & Noticeable, No Tags */}
            <div className="border-b-[1.5px] border-stone-800 py-1 bg-stone-100/90 text-center">
              <span className="font-black tracking-widest text-stone-950 uppercase text-xs sm:text-[13px] inline-block">
                TAX INVOICE
              </span>
            </div>

            {/* 3. Two-Column Supplier vs Invoice Details Grid */}
            <div className="grid grid-cols-12 border-b-[1.5px] border-stone-800 text-[9px] leading-tight">
              {/* Left: Supplier / Seller Details (Col 6) */}
              <div className="col-span-6 p-1.5 px-2 border-r-[1.5px] border-stone-800 space-y-0.5">
                <div className="font-black text-[11px] text-stone-950 uppercase tracking-wide">
                  KAMAKHYA JEWELLERS
                </div>
                <div className="text-stone-700 leading-normal">{settings.address}</div>
                <div>
                  <span className="font-semibold text-stone-600">State Name :</span> {settings.state || 'Delhi'}, <span className="font-semibold text-stone-600">Code :</span> {settings.stateCode || '07'}
                </div>
                <div>
                  <span className="font-semibold text-stone-600">GSTIN/UIN :</span>{' '}
                  <span className="font-mono font-bold text-stone-950">{settings.gstin || '07AAACK1234F1Z8'}</span>
                </div>
                <div className="flex gap-3">
                  <div>
                    <span className="font-semibold text-stone-600">PAN :</span>{' '}
                    <span className="font-mono font-semibold text-stone-900">{settings.pan || 'AAACK1234F'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-600">BIS Cert. :</span>{' '}
                    <span className="font-mono font-medium text-stone-800">HM/C-8190525819</span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-stone-600">Contact :</span> +91 {settings.mobile}
                </div>
              </div>

              {/* Right: Invoice Metadata Tabular Box (Col 6) */}
              <div className="col-span-6 divide-y divide-stone-300">
                <div className="grid grid-cols-2 divide-x divide-stone-300">
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Invoice No.</span>
                    <span className="font-mono font-bold text-stone-950 text-[9.5px]">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Dated</span>
                    <span className="font-medium text-stone-900 text-[9px]">{invoice.date}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-stone-300">
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Delivery Note</span>
                    <span className="font-medium text-stone-800 text-[9px]">Showroom Handover</span>
                  </div>
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Payment Mode</span>
                    <span className="font-bold text-stone-900 text-[9px]">{invoice.paymentMode}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-stone-300">
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Supplier's Ref.</span>
                    <span className="font-mono text-stone-800 text-[8.5px]">KJ-SHOWROOM</span>
                  </div>
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Other Reference</span>
                    <span className="text-stone-800 text-[8.5px]">{invoice.time || 'Counter POS'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-stone-300">
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Dispatched through</span>
                    <span className="text-stone-800 text-[8.5px]">Showroom Counter Handover</span>
                  </div>
                  <div className="p-0.5 px-1.5">
                    <span className="text-[8px] text-stone-500 block">Destination</span>
                    <span className="text-stone-800 text-[8.5px]">{invoice.customerState || 'Delhi'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Buyer (Bill To) & Consignee (Ship To) Boxes */}
            <div className="grid grid-cols-12 border-b-[1.5px] border-stone-800 text-[9px] leading-tight">
              {/* Left: Buyer (Bill To) */}
              <div className="col-span-6 p-1.5 px-2 border-r-[1.5px] border-stone-800 space-y-0.5">
                <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">Buyer (Bill to):</div>
                <div className="font-bold text-[10.5px] text-stone-950">{invoice.customerName}</div>
                <div className="text-stone-700 leading-normal">{invoice.customerAddress || 'Counter Walk-in Customer'}</div>
                <div className="flex gap-3">
                  <div>
                    <span className="font-semibold text-stone-600">State :</span> {invoice.customerState || 'Delhi'},{' '}
                    <span className="font-semibold text-stone-600">Code :</span> {invoice.customerStateCode || '07'}
                  </div>
                  {invoice.customerPincode && (
                    <div>
                      <span className="font-semibold text-stone-600">Pin :</span> {invoice.customerPincode}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <div>
                    <span className="font-semibold text-stone-600">Contact :</span> +91 {invoice.customerMobile}
                  </div>
                  {invoice.customerPan && (
                    <div>
                      <span className="font-semibold text-stone-600">PAN :</span>{' '}
                      <span className="font-mono font-bold text-stone-900">{invoice.customerPan}</span>
                    </div>
                  )}
                </div>
                {invoice.customerGstin && (
                  <div>
                    <span className="font-semibold text-stone-600">GSTIN/UIN :</span>{' '}
                    <span className="font-mono font-bold text-stone-900">{invoice.customerGstin}</span>
                  </div>
                )}
              </div>

              {/* Right: Consignee (Ship To) */}
              <div className="col-span-6 p-1.5 px-2 space-y-0.5">
                <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">Consignee (Ship to):</div>
                <div className="font-bold text-[10.5px] text-stone-950">{invoice.customerName}</div>
                <div className="text-stone-700 leading-normal">
                  {invoice.deliveryAddress || invoice.customerAddress || 'Showroom Counter Handover'}
                </div>
                <div>
                  <span className="font-semibold text-stone-600">Place of Supply :</span> {invoice.customerState || 'Delhi'} ({invoice.customerStateCode || '07'})
                </div>
                <div>
                  <span className="font-semibold text-stone-600">Contact :</span> +91 {invoice.customerMobile}
                </div>
              </div>
            </div>

            {/* 5. Main Items Table - Continuous Vertical Lines, No Extra Horizontal Boxes */}
            <table className="w-full text-left border-collapse text-[9px] table-fixed">
              <thead>
                <tr className="bg-stone-100/90 border-b border-stone-800 text-stone-900 font-bold">
                  <th className="py-1 px-1 text-center w-[4%] border-r border-stone-400">Sl.</th>
                  <th className={`py-1 px-2 border-r border-stone-400 ${hasStones ? 'w-[29%]' : 'w-[37%]'}`}>
                    Description of Goods
                  </th>
                  <th className="py-1 px-1 text-center w-[6%] border-r border-stone-400">HSN/SAC</th>
                  <th className="py-1 px-1 text-center w-[8%] border-r border-stone-400">Purity</th>
                  <th className="py-1 px-1.5 text-right w-[7%] border-r border-stone-400">Gross (g)</th>
                  {hasStones && (
                    <>
                      <th className="py-1 px-1.5 text-right w-[6%] border-r border-stone-400 whitespace-nowrap">Stone (g)</th>
                      <th className="py-1 px-1.5 text-right w-[8%] border-r border-stone-400 whitespace-nowrap">Stone (₹)</th>
                    </>
                  )}
                  <th className="py-1 px-1.5 text-right w-[7%] border-r border-stone-400">Net (g)</th>
                  <th className="py-1 px-1.5 text-right w-[10%] border-r border-stone-400">Rate</th>
                  <th className="py-1 px-1 text-center w-[5.5%] border-r border-stone-400">Mkg %</th>
                  <th className="py-1 px-1.5 text-right w-[8%] border-r border-stone-400">Taxable</th>
                  <th className="py-1 px-1 text-center w-[4%] border-r border-stone-400">GST%</th>
                  <th className="py-1 px-2 text-right w-[8.5%] font-bold text-stone-950">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* Item Rows - Separated with clean horizontal borders */}
                {invoice.items.map((item, idx) => {
                  const mkgPercentText = (() => {
                    if (item.makingChargeType === 'percent' && item.makingChargeRate > 0) {
                      return `${item.makingChargeRate}%`;
                    }
                    if (item.makingCharges > 0 && item.metalValue > 0) {
                      const pct = Math.round((item.makingCharges / item.metalValue) * 1000) / 10;
                      return `${pct}%`;
                    }
                    if (item.makingChargeRate > 0) {
                      return `${item.makingChargeRate}%`;
                    }
                    return '-';
                  })();

                  const rateDisplay =
                    item.metalType === 'Silver'
                      ? `₹${Math.round(item.ratePerGram * 1000).toLocaleString('en-IN')}/kg`
                      : `₹${Math.round(item.ratePerGram * 10).toLocaleString('en-IN')}/10g`;

                  return (
                    <tr key={item.id || idx} className="border-b border-stone-300 hover:bg-stone-50/40">
                      <td className="py-1 px-1 text-center border-r border-stone-300 font-mono text-[8.5px] align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-r border-stone-300 font-medium text-stone-900 align-middle">
                        <div className="font-bold text-stone-950 leading-snug">
                          {item.productName || `${item.metalType} Jewellery`}
                        </div>
                        {(item.stoneDescription || (item.stoneRate && item.stoneRate > 0) || item.stoneCharges > 0) && (
                          <div className="text-[8px] text-stone-600 font-normal">
                            Stone: {item.stoneDescription || 'Studded'}
                            {item.stoneRate ? ` @ ₹${item.stoneRate}/g` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-stone-300 font-mono text-[8.5px] align-middle">
                        {item.hsnCode}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-stone-300 font-bold text-[9px] align-middle">
                        {formatPurityWithFineness(item.purity, item.metalType)}
                      </td>
                      <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums align-middle">
                        {item.grossWeight.toFixed(3)}
                      </td>
                      {hasStones && (
                        <>
                          <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-stone-600 align-middle">
                            {item.stoneWeight > 0 ? item.stoneWeight.toFixed(3) : '-'}
                          </td>
                          <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-stone-700 align-middle">
                            {item.stoneCharges > 0 ? `₹${item.stoneCharges.toFixed(2)}` : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums font-bold text-stone-900 bg-amber-50/30 align-middle">
                        {item.netWeight.toFixed(3)}
                      </td>
                      <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-[8.5px] font-semibold align-middle whitespace-nowrap">
                        {rateDisplay}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-stone-300 font-mono font-medium text-stone-800 align-middle">
                        {mkgPercentText}
                      </td>
                      <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums font-medium text-stone-900 align-middle">
                        {item.taxableValue.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-stone-300 text-stone-600 font-mono align-middle">
                        {item.gstRate}%
                      </td>
                      <td className="py-1 px-2 text-right font-mono tabular-nums font-bold text-stone-950 align-middle">
                        {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Single Open Space: ONLY vertical column lines, NO horizontal box lines */}
                <tr style={{ height: `${fillerHeight}px` }}>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  {hasStones && (
                    <>
                      <td className="border-r border-stone-300"></td>
                      <td className="border-r border-stone-300"></td>
                    </>
                  )}
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td className="border-r border-stone-300"></td>
                  <td></td>
                </tr>

                {/* Summary Rows at Bottom of Table: Other Charges, CGST, SGST, Round Off */}
                {totalOtherCharges > 0 && (
                  <tr className="border-t border-stone-300 text-[8.5px] bg-stone-50/60">
                    <td colSpan={tableColSpan - 2} className="py-0.5 px-2 border-r border-stone-300 text-right font-semibold text-stone-600">
                      Other Charges :
                    </td>
                    <td className="py-0.5 border-r border-stone-300"></td>
                    <td className="py-0.5 px-2 text-right font-mono tabular-nums font-semibold text-stone-900">
                      {totalOtherCharges.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-stone-300 text-[8.5px] bg-stone-50/60">
                  <td colSpan={tableColSpan - 2} className="py-0.5 px-2 border-r border-stone-300 text-right font-semibold text-stone-600">
                    CGST (1.5%) :
                  </td>
                  <td className="py-0.5 border-r border-stone-300 text-center font-mono text-stone-500">1.5%</td>
                  <td className="py-0.5 px-2 text-right font-mono tabular-nums font-semibold text-stone-900">
                    {invoice.cgst.toFixed(2)}
                  </td>
                </tr>
                <tr className="text-[8.5px] bg-stone-50/60">
                  <td colSpan={tableColSpan - 2} className="py-0.5 px-2 border-r border-stone-300 text-right font-semibold text-stone-600">
                    SGST (1.5%) :
                  </td>
                  <td className="py-0.5 border-r border-stone-300 text-center font-mono text-stone-500">1.5%</td>
                  <td className="py-0.5 px-2 text-right font-mono tabular-nums font-semibold text-stone-900">
                    {invoice.sgst.toFixed(2)}
                  </td>
                </tr>
                {invoice.roundOff !== 0 && (
                  <tr className="text-[8.5px] bg-stone-50/60">
                    <td colSpan={tableColSpan - 2} className="py-0.2 px-2 border-r border-stone-300 text-right text-stone-500">
                      ROUND OFF :
                    </td>
                    <td className="py-0.2 border-r border-stone-300"></td>
                    <td className="py-0.2 px-2 text-right font-mono tabular-nums text-stone-600">
                      {invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}
                    </td>
                  </tr>
                )}

                {/* Deductions: Old Gold Return or Trade-in Credit */}
                {invoice.oldGoldAmount !== undefined && invoice.oldGoldAmount > 0 && (
                  <tr className="text-[8.5px] bg-rose-50/40 border-t border-stone-200">
                    <td colSpan={tableColSpan - 2} className="py-0.5 px-2 border-r border-stone-300 text-right font-semibold text-rose-900">
                      {invoice.oldGoldExchange && invoice.oldGoldExchange.grossWeight > 0
                        ? `Less Old Gold Exchange (${invoice.oldGoldExchange.grossWeight}g ${invoice.oldGoldExchange.purity} @ ₹${invoice.oldGoldExchange.ratePerGram.toLocaleString('en-IN')}/g${
                            invoice.oldGoldExchange.deductionPercent > 0 ? ` less ${invoice.oldGoldExchange.deductionPercent}% tunch` : ''
                          }) :`
                        : `Less ${invoice.oldGoldExchange?.description || 'Trade-in Credit / Adjustment'} :`}
                    </td>
                    <td className="py-0.5 border-r border-stone-300"></td>
                    <td className="py-0.5 px-2 text-right font-mono tabular-nums font-bold text-rose-700">
                      - {formatINR(invoice.oldGoldAmount)}
                    </td>
                  </tr>
                )}

                {/* Deductions: Advance Payment */}
                {invoice.advanceAdjusted > 0 && (
                  <tr className="text-[8.5px] bg-emerald-50/40">
                    <td colSpan={tableColSpan - 2} className="py-0.5 px-2 border-r border-stone-300 text-right font-semibold text-emerald-900">
                      Less Advance Adjusted :
                    </td>
                    <td className="py-0.5 border-r border-stone-300"></td>
                    <td className="py-0.5 px-2 text-right font-mono tabular-nums font-bold text-emerald-800">
                      - {formatINR(invoice.advanceAdjusted)}
                    </td>
                  </tr>
                )}

                {/* TOTAL Row - Solid background filling 100% of the row box down to the border */}
                <tr className="bg-stone-200/90 font-bold border-t-[1.5px] border-b-[1.5px] border-stone-800 text-stone-950 text-[9px]">
                  <td colSpan={2} className="py-1 px-2 text-right border-r border-stone-400 uppercase tracking-wider font-extrabold bg-stone-200/90">
                    Total :
                  </td>
                  <td className="py-1 px-1 border-r border-stone-400 bg-stone-200/90"></td>
                  <td className="py-1 px-1 border-r border-stone-400 bg-stone-200/90"></td>
                  <td className="py-1 px-1.5 text-right border-r border-stone-400 font-mono tabular-nums bg-stone-200/90">
                    {invoice.totalGrossWeight.toFixed(3)}
                  </td>
                  {hasStones && (
                    <>
                      <td className="py-1 px-1.5 text-right border-r border-stone-400 font-mono tabular-nums text-stone-700 bg-stone-200/90">
                        {invoice.totalStoneWeight.toFixed(3)}
                      </td>
                      <td className="py-1 px-1.5 text-right border-r border-stone-400 font-mono tabular-nums font-semibold text-stone-800 bg-stone-200/90">
                        {totalStoneCharges > 0 ? `₹${totalStoneCharges.toFixed(2)}` : '—'}
                      </td>
                    </>
                  )}
                  <td className="py-1 px-1.5 text-right border-r border-stone-400 font-mono tabular-nums text-amber-950 font-extrabold bg-amber-200/60">
                    {invoice.totalNetWeight.toFixed(3)}
                  </td>
                  <td className="py-1 px-1 border-r border-stone-400 bg-stone-200/90"></td>
                  <td className="py-1 px-1 border-r border-stone-400 bg-stone-200/90"></td>
                  <td className="py-1 px-1.5 text-right border-r border-stone-400 font-mono tabular-nums bg-stone-200/90">
                    {invoice.totalTaxableValue.toFixed(2)}
                  </td>
                  <td className="py-1 px-1 border-r border-stone-400 bg-stone-200/90"></td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums text-stone-950 font-black text-[10.5px] bg-amber-200/70">
                    {formatINR(invoice.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6. Amount in Words Banner - Connected directly to table bottom */}
            <div className="border-b-[1.5px] border-stone-800 px-2 py-0.5 bg-stone-50/90 flex justify-between items-center text-[9px]">
              <div>
                <span className="font-semibold text-stone-700">Amount Chargeable (in words): </span>
                <span className="font-bold text-stone-950 italic">
                  {numberToIndianWords(invoice.grandTotal)}
                </span>
              </div>
              <div className="font-bold text-[8.5px] text-stone-500 uppercase tracking-wider">
                E. & O.E.
              </div>
            </div>

            {/* 7. Statutory HSN/SAC Tax Breakdown Table */}
            <div className="border-b-[1.5px] border-stone-800 text-[8.5px] bg-white/90">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-300 bg-stone-100/80 font-bold text-stone-800">
                    <th className="py-0.5 px-2 border-r border-stone-300 w-24">HSN/SAC</th>
                    <th className="py-0.5 px-2 border-r border-stone-300 text-right w-28">Taxable Value</th>
                    <th colSpan={2} className="py-0.5 px-1 border-r border-stone-300 text-center">CGST</th>
                    <th colSpan={2} className="py-0.5 px-1 border-r border-stone-300 text-center">SGST/UTGST</th>
                    <th className="py-0.5 px-2 text-right w-28">Total Tax Amount</th>
                  </tr>
                  <tr className="border-b border-stone-300 text-[7.5px] text-stone-600 font-semibold bg-stone-50/80">
                    <th className="py-0.2 px-2 border-r border-stone-300"></th>
                    <th className="py-0.2 px-2 border-r border-stone-300"></th>
                    <th className="py-0.2 px-1 border-r border-stone-300 text-center w-12">Rate</th>
                    <th className="py-0.2 px-1 border-r border-stone-300 text-right w-20">Amount</th>
                    <th className="py-0.2 px-1 border-r border-stone-300 text-center w-12">Rate</th>
                    <th className="py-0.2 px-1 border-r border-stone-300 text-right w-20">Amount</th>
                    <th className="py-0.2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {hsnRows.map((r, i) => (
                    <tr key={i} className="border-b border-stone-200 font-mono">
                      <td className="py-0.5 px-2 border-r border-stone-300 font-bold text-stone-900">{r.hsn}</td>
                      <td className="py-0.5 px-2 border-r border-stone-300 text-right">{r.taxable.toFixed(2)}</td>
                      <td className="py-0.5 px-1 border-r border-stone-300 text-center">{r.cgstRate.toFixed(2)}%</td>
                      <td className="py-0.5 px-1 border-r border-stone-300 text-right">{r.cgstAmt.toFixed(2)}</td>
                      <td className="py-0.5 px-1 border-r border-stone-300 text-center">{r.sgstRate.toFixed(2)}%</td>
                      <td className="py-0.5 px-1 border-r border-stone-300 text-right">{r.sgstAmt.toFixed(2)}</td>
                      <td className="py-0.5 px-2 text-right font-bold text-stone-900">{r.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-stone-50 text-stone-900 font-mono border-t border-stone-300">
                    <td className="py-0.5 px-2 border-r border-stone-300 font-sans uppercase text-[8px]">Total</td>
                    <td className="py-0.5 px-2 border-r border-stone-300 text-right">{invoice.totalTaxableValue.toFixed(2)}</td>
                    <td className="py-0.5 px-1 border-r border-stone-300"></td>
                    <td className="py-0.5 px-1 border-r border-stone-300 text-right">{invoice.cgst.toFixed(2)}</td>
                    <td className="py-0.5 px-1 border-r border-stone-300"></td>
                    <td className="py-0.5 px-1 border-r border-stone-300 text-right">{invoice.sgst.toFixed(2)}</td>
                    <td className="py-0.5 px-2 text-right font-bold">{invoice.totalGst.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="px-2 py-0.5 bg-white border-t border-stone-200 text-[8.5px]">
                <span className="font-semibold text-stone-700">Tax Amount (in words): </span>
                <span className="font-bold text-stone-900 italic">{numberToIndianWords(invoice.totalGst)}</span>
              </div>
            </div>
          </div>

          {/* 8. Bottom Section - Bank Details, Terms, UPI QR & Signatures (Attached Flush to Bottom Border) */}
          <div className="bg-white/95 shrink-0">
            <div className="grid grid-cols-12 text-[9px] leading-tight">
              {/* Left: Bank Details & Terms (Col 7) */}
              <div className="col-span-7 p-1.5 px-2 border-r-[1.5px] border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="font-bold uppercase tracking-wider text-[8.5px] text-stone-700 mb-0.5">
                    Company's Bank Details:
                  </div>
                  <div className="space-y-0.5 text-stone-800 text-[8.5px]">
                    <div>
                      <span className="font-semibold text-stone-600">Bank Name :</span>{' '}
                      <span className="font-medium text-stone-900">{settings.bankName || 'HDFC Bank Ltd.'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600">A/c Name :</span>{' '}
                      <span className="font-bold text-stone-900">KAMAKHYA JEWELLERS</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600">A/c No. :</span>{' '}
                      <span className="font-mono font-bold text-stone-900">{settings.accountNumber || '50200084729112'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600">Branch & IFS Code :</span>{' '}
                      <span className="font-mono font-semibold text-stone-900">{settings.ifscCode || 'HDFC0001234'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-600">UPI ID :</span>{' '}
                      <span className="font-mono font-bold text-amber-900">{settings.upiId || '9818144011@okbizaxis'}</span>
                    </div>
                  </div>

                  <div className="mt-1 pt-1 border-t border-stone-200">
                    <div className="font-bold uppercase tracking-wider text-[8px] text-stone-700 mb-0.5">
                      Declaration & Terms:
                    </div>
                    <ul className="text-[7.5px] text-stone-600 space-y-0.5 leading-tight">
                      <li>• We declare that this invoice shows the actual price of the goods described and all particulars are true and correct.</li>
                      <li>• As per BIS guidelines, consumers may get their hallmarked jewellery tested/verified at any BIS-recognised Assaying and Hallmarking Centre (AHC).</li>
                      <li>• Exchange or Buyback accepted strictly on prevailing market metal rates as per showroom policy.</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-1 pt-1">
                  <div className="w-36 border-b border-stone-400 mb-0.5"></div>
                  <span className="text-[7.5px] font-semibold text-stone-600">Receiver's Signature / Stamp</span>
                </div>
              </div>

              {/* Right: UPI Scan to Pay QR & Authorised Signatory (Col 5) */}
              <div className="col-span-5 p-1.5 px-2 flex flex-col justify-between items-center text-center">
                {/* Scan to Pay QR Code */}
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-stone-700 mb-0.5">
                    Scan to Pay via UPI:
                  </span>
                  {activeQrUrl || invoice.qrCodeDataUrl ? (
                    <img
                      src={activeQrUrl || invoice.qrCodeDataUrl}
                      alt="UPI Payment QR"
                      className="w-14 h-14 object-contain border border-stone-300 rounded bg-white p-0.5 shadow-2xs"
                    />
                  ) : (
                    <div className="w-14 h-14 border border-stone-300 flex items-center justify-center text-[7px] text-stone-400">
                      [UPI QR]
                    </div>
                  )}
                  <span className="text-[7px] text-stone-500 font-mono mt-0.5">Instant Dynamic UPI QR</span>
                </div>

                {/* Authorised Signatory */}
                <div className="w-full text-center flex flex-col items-center mt-1">
                  <div className="text-[9px] font-bold text-stone-900 mb-0.5">
                    for KAMAKHYA JEWELLERS
                  </div>
                  <div className="h-9 flex items-center justify-center">
                    <img
                      src={signatureImg}
                      alt="Authorised Signatory"
                      className="max-h-9 w-auto object-contain"
                    />
                  </div>
                  <div className="w-32 border-t border-stone-400 mt-0.5 pt-0.5 text-[8px] font-bold text-stone-700">
                    Authorised Signatory
                  </div>
                </div>
              </div>
            </div>

            {/* 9. Bottom Jurisdiction & Notice Footer - Forms Solid Bottom of the Bill */}
            <div className="border-t-[1.5px] border-stone-800 py-0.5 px-3 bg-stone-100 text-center text-[7.5px] text-stone-700 font-semibold tracking-wider uppercase flex justify-between items-center">
              <span>SUBJECT TO DELHI JURISDICTION</span>
              <span>This is a Computer Generated Tax Invoice</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InvoiceSheet.displayName = 'InvoiceSheet';

export const InvoicePrintModal: React.FC<Props> = ({ invoice, settings, onClose }) => {
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copyMode, setCopyMode] = useState<'1_copy' | '2_copies'>('1_copy');
  const [showWhatsAppHelp, setShowWhatsAppHelp] = useState(false);

  // Keep body marked so background dashboard or other views NEVER print
  useEffect(() => {
    document.body.classList.add('has-print-modal');
    return () => {
      document.body.classList.remove('has-print-modal');
    };
  }, []);

  // Dynamically generate QR code from current shop settings UPI ID
  const [activeQrUrl, setActiveQrUrl] = useState<string>(invoice.qrCodeDataUrl || '');

  useEffect(() => {
    const upi = settings.upiId || invoice.bankDetails?.upiId || '9818144011@okbizaxis';
    const amount =
      invoice.remainingBalance > 0
        ? invoice.remainingBalance
        : invoice.netPayable !== undefined && invoice.netPayable > 0
        ? invoice.netPayable
        : invoice.grandTotal;

    generateUpiQrDataUrl(upi, settings.businessName || 'KAMAKHYA JEWELLERS', amount, invoice.invoiceNumber).then((url) => {
      if (url) setActiveQrUrl(url);
    });
  }, [settings.upiId, settings.businessName, invoice]);

  const handlePrint = () => {
    window.print();
  };

  // Build PDF with 1 or 2 clean A4 pages
  const buildInvoicePdf = async (): Promise<{ pdf: jsPDF; blob: Blob } | null> => {
    if (!page1Ref.current) return null;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const activeSheets: { ref: React.RefObject<HTMLDivElement | null>; name: string }[] = [
      { ref: page1Ref, name: 'Original' },
    ];
    if (copyMode === '2_copies' && page2Ref.current) {
      activeSheets.push({ ref: page2Ref, name: 'Triplicate' });
    }

    for (let i = 0; i < activeSheets.length; i++) {
      const el = activeSheets[i].ref.current;
      if (!el) continue;
      if (i > 0) pdf.addPage('a4', 'portrait');

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    return { pdf, blob };
  };

  const handleDownloadPdf = async (): Promise<void> => {
    setIsGeneratingPdf(true);
    try {
      const res = await buildInvoicePdf();
      if (!res) throw new Error('Failed to render invoice sheet canvas');

      const safeNumber = invoice.invoiceNumber.replace(/[\/\\]/g, '_');
      const fileName = `Kamakhya_Jewellers_Invoice_${safeNumber}.pdf`;

      res.pdf.save(fileName);
    } catch (error) {
      console.warn('Direct PDF canvas issue, falling back to browser print engine:', error);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsAppWithPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await buildInvoicePdf();
      if (!res) throw new Error('Failed to render invoice for WhatsApp');

      const safeNumber = invoice.invoiceNumber.replace(/[\/\\]/g, '_');
      const fileName = `Kamakhya_Jewellers_Invoice_${safeNumber}.pdf`;
      const pdfFile = new File([res.blob], fileName, { type: 'application/pdf' });

      // Try Native Web Share API
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber} - ${settings.businessName || 'KAMAKHYA JEWELLERS'}`,
            text: generateWhatsAppInvoiceMessage(invoice, settings),
            files: [pdfFile],
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Navigator share error, falling back to WhatsApp Web:', shareErr);
        }
      }

      res.pdf.save(fileName);
      openWhatsAppInvoice(invoice, settings);
      setShowWhatsAppHelp(true);
    } catch (err) {
      console.error('WhatsApp with PDF process error:', err);
      openWhatsAppInvoice(invoice, settings);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const baseTerms = settings.termsAndConditions && settings.termsAndConditions.length > 0
    ? settings.termsAndConditions
    : [
        'Certified 100% BIS Hallmarked jewellery. Purity & weight guaranteed as per tax invoice.',
        'Exchange or Buyback will be accepted strictly on prevailing market metal rates as per store policy.',
        'Stone weight has been deducted from gross weight to arrive at net precious metal weight.',
        'Customers are requested to verify the ornaments, hallmark stamp, and weight before leaving the showroom counter.',
        'Subject to local showroom jurisdiction only. E. & O.E.'
      ];

  const hasAhcClause = baseTerms.some((t) => t.toLowerCase().includes('assaying') || t.toLowerCase().includes('ahc'));
  const terms = hasAhcClause
    ? baseTerms
    : [
        ...baseTerms.slice(0, 1),
        'As per BIS guidelines, consumers may get their hallmarked jewellery tested/verified for purity at any BIS-recognised Assaying and Hallmarking Centre (AHC).',
        ...baseTerms.slice(1),
      ];

  const totalOtherCharges = invoice.items.reduce((s, i) => s + (i.otherCharges || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-scrollbar bg-stone-900/70 backdrop-blur-xs flex flex-col items-center p-2 sm:p-4 print:static print:block print:w-full print:h-auto print:bg-white print:p-0 print:m-0 print-page-container">
      {/* Print CSS Styles for clean 1-page or 2-page A4 output */}
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
          .print-page-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0px !important;
            height: 0px !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm 4mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-page {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Floating Toolbar (Hidden when printing) */}
      <div className="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-2 print:hidden bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full mb-4">
        {/* Left: 1 Copy vs 2 Copies Selector */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-300 text-xs">
          <span className="text-[11px] font-bold text-stone-700 px-1.5 flex items-center gap-1">
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span>Copies:</span>
          </span>
          <button
            type="button"
            onClick={() => setCopyMode('1_copy')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all text-xs ${
              copyMode === '1_copy'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-300 font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Recipient Original Customer Copy Only"
          >
            1 Copy (Customer)
          </button>
          <button
            type="button"
            onClick={() => setCopyMode('2_copies')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all text-xs ${
              copyMode === '2_copies'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Customer Copy + Showroom / Supplier Copy"
          >
            2 Copies (Customer + Shop)
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendWhatsAppWithPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Save PDF and send digital bill on WhatsApp"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            <span>PDF + WhatsApp</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Save invoice directly to your computer as PDF"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-sm"
            title="Print to office printer or Save as PDF via browser"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4 Invoice</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Help Guidance Modal */}
      {showWhatsAppHelp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900">
                WhatsApp Opened & PDF Downloaded!
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                The tax invoice PDF has been saved to your Downloads folder, and WhatsApp Web was opened for <strong>{invoice.customerName}</strong>.
              </p>
            </div>

            <div className="bg-emerald-50 text-emerald-950 rounded-xl p-3 text-left text-xs space-y-2 border border-emerald-200">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                How to attach the PDF in WhatsApp:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-emerald-900 text-[11px]">
                <li>In the opened WhatsApp window, click the <strong>📎 Paperclip (or +)</strong> icon.</li>
                <li>Select <strong>Document</strong>.</li>
                <li>Choose the downloaded file (<em>Kamakhya_Jewellers_Invoice...pdf</em>).</li>
                <li>Press send!</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition-colors"
              >
                Re-Download PDF
              </button>
              <button
                type="button"
                onClick={() => setShowWhatsAppHelp(false)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet 1: Original Invoice Sheet */}
      <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block">
        <InvoiceSheet
          ref={page1Ref}
          invoice={invoice}
          settings={settings}
          terms={terms}
          totalOtherCharges={totalOtherCharges}
          activeQrUrl={activeQrUrl}
        />
      </div>

      {/* Sheet 2: Showroom / Supplier Copy (Rendered if 2 Copies Mode selected) */}
      {copyMode === '2_copies' && (
        <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block print-break-page">
          <InvoiceSheet
            ref={page2Ref}
            invoice={invoice}
            settings={settings}
            terms={terms}
            totalOtherCharges={totalOtherCharges}
            activeQrUrl={activeQrUrl}
          />
        </div>
      )}
    </div>
  );
};
