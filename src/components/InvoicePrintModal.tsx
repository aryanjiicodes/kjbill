import React, { useRef, useState, useEffect } from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatINR, numberToIndianWords } from '../utils/numberToWords';
import { Printer, X, Download, Loader2, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react';
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
  copyTitle: string;
  copySubtitle: string;
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
  ({ invoice, settings, copyTitle, copySubtitle, terms, totalOtherCharges, activeQrUrl }, ref) => {
    const hasStones = invoice.items.some(
      (item) => (item.stoneWeight && item.stoneWeight > 0) || (item.stoneCharges && item.stoneCharges > 0)
    );
    const totalStoneCharges = invoice.items.reduce((s, i) => s + (i.stoneCharges || 0), 0);

    return (
      <div
        ref={ref}
        className="w-full max-w-[210mm] min-h-[285mm] h-[285mm] print:h-[283mm] print:min-h-0 print:max-h-[283mm] bg-white text-stone-900 mx-auto p-6 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-2.5 print:w-full print:max-w-none text-[11px] leading-tight relative overflow-hidden flex flex-col justify-between"
        style={{
          boxSizing: 'border-box',
          overflow: 'hidden',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Background Watermark (Increased opacity & visibility, keeping all tables & text fully sharp) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src={watermarkImg}
            alt="Watermark"
            className="w-[420px] max-w-[75%] opacity-[0.18] select-none object-contain print:opacity-[0.18]"
          />
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col justify-between h-full flex-1">
          <div>
            {/* Top Header */}
            <div className="border-b-2 border-stone-800 pb-2.5 mb-2.5">
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
                      ★ GST TAX INVOICE ★
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
                    {settings.email && (
                      <>
                        <span>·</span>
                        <span>{settings.email}</span>
                      </>
                    )}
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

            {/* Customer & Invoice Meta Grid */}
            <div className="grid grid-cols-12 gap-2 mb-2.5">
              {/* Receiver / Billed To (GST Rule 46) */}
              <div className="col-span-8 border border-stone-300 rounded-xs p-2.5 bg-white/50 print:bg-transparent">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200 pb-1 mb-1.5 flex justify-between items-center">
                  <span>Details of Receiver | Billed to (GST Rule 46):</span>
                  <span className="text-[9px] font-bold font-mono text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    {copyTitle} ({copySubtitle})
                  </span>
                </div>
                <div className="text-sm font-bold text-stone-900">{invoice.customerName}</div>
                <div className="text-[10.5px] text-stone-700 mt-0.5 leading-snug">
                  {invoice.customerAddress || 'Showroom Counter Handover, New Delhi'}
                  {invoice.customerPincode ? ` - Pincode: ${invoice.customerPincode}` : ''}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-stone-700 mt-1">
                  <span>
                    <span className="font-semibold text-stone-600">Mobile:</span> +91 {invoice.customerMobile}
                  </span>
                  <span>·</span>
                  <span>
                    <span className="font-semibold text-stone-600">State:</span> {invoice.customerState || 'Delhi'} (Code: {invoice.customerStateCode || '07'})
                  </span>
                  {invoice.customerPan && (
                    <>
                      <span>·</span>
                      <span className="font-mono font-bold text-stone-900">
                        <span className="font-semibold text-stone-600 font-sans">PAN:</span> {invoice.customerPan}
                      </span>
                    </>
                  )}
                  {invoice.customerGstin && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-stone-900">
                        <span className="font-semibold text-stone-600">GSTIN:</span> {invoice.customerGstin}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice Info */}
              <div className="col-span-4 border border-stone-300 rounded-xs p-2.5 bg-stone-50/70 print:bg-transparent">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-stone-600">Invoice No:</span>
                    <span className="font-mono font-bold text-stone-900">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-stone-600">Date & Time:</span>
                    <span className="font-medium text-stone-800">{invoice.date} {invoice.time ? `(${invoice.time})` : ''}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-stone-600">Payment Mode:</span>
                    <span className="font-bold text-stone-900">{invoice.paymentMode}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-stone-600">Place of Supply:</span>
                    <span className="font-medium text-stone-800">{invoice.customerState || 'Delhi'} (Code: {invoice.customerStateCode || '07'})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consignee / Shipped To Banner (Rule 46 Delivery Address) */}
            <div className="border border-stone-300 rounded-xs p-1.5 mb-2.5 bg-stone-50/40 print:bg-transparent text-[10.5px] flex flex-wrap items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mr-2">
                Shipped / Handed over to:
              </span>
              <span className="font-bold text-stone-900">{invoice.customerName}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="text-stone-700 font-medium">{invoice.deliveryAddress || invoice.customerAddress || 'Showroom Counter Handover'}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="font-semibold text-stone-800">State: {invoice.customerState || 'Delhi'} (Code: {invoice.customerStateCode || '07'})</span>
            </div>

            {/* Products Table with Mkg % and Other Charges */}
            <div className="border border-stone-300 rounded-xs overflow-hidden mb-2.5 bg-white/50 print:bg-transparent">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-stone-100 print:bg-stone-100 border-b border-stone-300 text-stone-800 font-bold">
                    <th className="py-1 px-1 text-center w-6 border-r border-stone-300">#</th>
                    <th className="py-1 px-1.5 border-r border-stone-300 min-w-[140px]">Product Description</th>
                    <th className="py-1 px-1 text-center border-r border-stone-300">HSN</th>
                    <th className="py-1 px-1 text-center border-r border-stone-300">Purity</th>
                    <th className="py-1 px-1.5 text-right border-r border-stone-300">Gross (g)</th>
                    {hasStones && (
                      <>
                        <th className="py-1 px-1 text-right border-r border-stone-300 whitespace-nowrap">Stone (g)</th>
                        <th className="py-1 px-1 text-right border-r border-stone-300 whitespace-nowrap">Stone (₹)</th>
                      </>
                    )}
                    <th className="py-1 px-1.5 text-right border-r border-stone-300">Net (g)</th>
                    <th className="py-1 px-1.5 text-right border-r border-stone-300">Rate</th>
                    <th className="py-1 px-1 text-center border-r border-stone-300">Mkg %</th>
                    <th className="py-1 px-1.5 text-right border-r border-stone-300">Other Chg</th>
                    <th className="py-1 px-1.5 text-right border-r border-stone-300">Taxable</th>
                    <th className="py-1 px-1 text-center border-r border-stone-300">GST%</th>
                    <th className="py-1 px-1.5 text-right font-bold text-stone-900">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {invoice.items.map((item, idx) => {
                    const mkgPercentText =
                      item.makingChargeType === 'percent' && item.makingChargeRate > 0
                        ? `${item.makingChargeRate}%`
                        : '-';

                    const otherChgText =
                      item.otherCharges && item.otherCharges > 0
                        ? `₹${item.otherCharges.toFixed(2)}`
                        : '-';

                    return (
                      <tr key={item.id || idx} className="hover:bg-stone-50/50 print:hover:bg-transparent">
                        <td className="py-1 px-1 text-center border-r border-stone-300 font-mono text-[9.5px]">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-1.5 border-r border-stone-300 font-medium text-stone-900">
                          <div className="font-bold text-stone-950">{item.productName || `${item.metalType} Jewellery`}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[9px]">
                            {item.itemCode && (
                              <span className="font-mono text-stone-700 bg-stone-100 px-1 py-0.2 rounded border border-stone-200">
                                Tag: #{item.itemCode}
                              </span>
                            )}
                            {item.huid && (
                              <span className="font-mono font-bold text-amber-950 bg-amber-100/70 px-1 py-0.2 rounded border border-amber-300">
                                BIS HUID: {item.huid}
                              </span>
                            )}
                            {item.hallmarkingCharges && item.hallmarkingCharges > 0 ? (
                              <span className="text-stone-500">
                                (Hallmark Chg: ₹{item.hallmarkingCharges})
                              </span>
                            ) : null}
                          </div>
                          {(item.stoneDescription || (item.stoneRate && item.stoneRate > 0) || item.stoneCharges > 0) && (
                            <div className="text-[9px] text-stone-600 font-normal mt-0.5">
                              <span className="font-medium text-stone-700">Stone:</span> {item.stoneDescription || 'Studded'}
                              {item.stoneRate ? ` @ ₹${item.stoneRate}/g` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center border-r border-stone-300 font-mono text-[9.5px]">
                          {item.hsnCode}
                        </td>
                        <td className="py-1 px-1 text-center border-r border-stone-300 font-bold text-[10px]">
                          {formatPurityWithFineness(item.purity, item.metalType)}
                        </td>
                        <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums">
                          {item.grossWeight.toFixed(3)}
                        </td>
                        {hasStones && (
                          <>
                            <td className="py-1 px-1 text-right border-r border-stone-300 font-mono tabular-nums text-stone-600">
                              {item.stoneWeight > 0 ? item.stoneWeight.toFixed(3) : '-'}
                            </td>
                            <td className="py-1 px-1 text-right border-r border-stone-300 font-mono tabular-nums text-stone-700">
                              {item.stoneCharges > 0 ? `₹${item.stoneCharges.toFixed(2)}` : '-'}
                            </td>
                          </>
                        )}
                        <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums font-bold text-stone-900 bg-amber-50/40 print:bg-transparent">
                          {item.netWeight.toFixed(3)}
                        </td>
                        <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums leading-tight">
                          {item.metalType === 'Silver' ? (
                            <div>
                              <span className="font-bold">₹{Math.round(item.ratePerGram * 1000).toLocaleString('en-IN')}/kg</span>
                              <span className="text-[8.5px] text-stone-500 block font-sans">({item.ratePerGram.toFixed(1)}/g)</span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold">₹{Math.round(item.ratePerGram * 10).toLocaleString('en-IN')}/10g</span>
                              <span className="text-[8.5px] text-stone-500 block font-sans">({item.ratePerGram.toFixed(1)}/g)</span>
                            </div>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center border-r border-stone-300 font-mono font-medium text-stone-700">
                          {mkgPercentText}
                        </td>
                        <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-stone-700">
                          {otherChgText}
                        </td>
                        <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums font-medium">
                          {item.taxableValue.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 text-center border-r border-stone-300 text-stone-600 font-mono">
                          {item.gstRate}%
                        </td>
                        <td className="py-1 px-1.5 text-right font-mono tabular-nums font-bold text-stone-900">
                          {item.lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="bg-stone-100 font-bold border-t-2 border-stone-300 text-stone-900">
                    <td colSpan={4} className="py-1 px-2 text-right border-r border-stone-300 uppercase tracking-wider text-[9.5px]">
                      Total :
                    </td>
                    <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums">
                      {invoice.totalGrossWeight.toFixed(3)}
                    </td>
                    {hasStones && (
                      <>
                        <td className="py-1 px-1 text-right border-r border-stone-300 font-mono tabular-nums">
                          {invoice.totalStoneWeight.toFixed(3)}
                        </td>
                        <td className="py-1 px-1 text-right border-r border-stone-300 font-mono tabular-nums font-semibold text-stone-800">
                          {totalStoneCharges > 0 ? `₹${totalStoneCharges.toFixed(2)}` : '—'}
                        </td>
                      </>
                    )}
                    <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-amber-950 font-extrabold bg-amber-100/40">
                      {invoice.totalNetWeight.toFixed(3)}
                    </td>
                    <td className="py-1 px-1.5 border-r border-stone-300"></td>
                    <td className="py-1 px-1 border-r border-stone-300"></td>
                    <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums">
                      {totalOtherCharges > 0 ? `₹${totalOtherCharges.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums">
                      {invoice.totalTaxableValue.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 border-r border-stone-300"></td>
                    <td className="py-1 px-1.5 text-right font-mono tabular-nums text-stone-900 font-bold">
                      {invoice.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words Banner */}
            <div className="border border-stone-300 rounded-xs px-2.5 py-1 mb-2.5 bg-stone-50/60 print:bg-transparent flex justify-between items-center text-[10.5px]">
              <div>
                <span className="font-semibold text-stone-600">Amount in Words: </span>
                <span className="font-bold text-stone-900 italic">
                  {numberToIndianWords(invoice.grandTotal)}
                </span>
              </div>
              <div className="text-[10px] text-stone-500 font-mono">
                Net Metal Wt: {invoice.totalNetWeight.toFixed(3)} g
              </div>
            </div>

            {/* Lower Summary Section */}
            <div className="grid grid-cols-12 gap-2.5 border border-stone-300 rounded-xs p-2.5 mb-2.5 bg-white/50 print:bg-transparent">
              {/* Left: Bank Details */}
              <div className="col-span-5 border-r border-stone-200 pr-2">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Bank & Payment Details:
                </div>
                <div className="space-y-0.5 text-[10.5px] text-stone-700">
                  <div className="flex">
                    <span className="w-18 font-semibold text-stone-600">Bank:</span>
                    <span className="font-medium text-stone-900">{settings.bankName || invoice.bankDetails?.bankName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-18 font-semibold text-stone-600">A/C Name:</span>
                    <span className="font-bold text-stone-900">
                      {(settings.accountName || invoice.bankDetails?.accountName || 'KAMAKHYA JEWELLERS').replace(/kamkhya/i, 'KAMAKHYA')}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-18 font-semibold text-stone-600">A/C No:</span>
                    <span className="font-mono font-bold text-stone-900">{settings.accountNumber || invoice.bankDetails?.accountNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="w-18 font-semibold text-stone-600">IFSC:</span>
                    <span className="font-mono font-semibold text-stone-900">{settings.ifscCode || invoice.bankDetails?.ifscCode}</span>
                  </div>
                  <div className="flex">
                    <span className="w-18 font-semibold text-stone-600">UPI ID:</span>
                    <span className="font-mono font-bold text-amber-900">{settings.upiId || invoice.bankDetails?.upiId}</span>
                  </div>
                </div>
              </div>

              {/* Center: Scan to Pay UPI QR Code */}
              <div className="col-span-3 flex flex-col items-center justify-center border-r border-stone-200 pr-2">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-stone-700 mb-0.5">
                  Scan to Pay:
                </div>
                {activeQrUrl || invoice.qrCodeDataUrl ? (
                  <img
                    src={activeQrUrl || invoice.qrCodeDataUrl}
                    alt="UPI Payment QR"
                    className="w-20 h-20 object-contain border border-stone-200 rounded-xs bg-white p-0.5"
                  />
                ) : (
                  <div className="w-20 h-20 border border-stone-300 flex items-center justify-center text-[9px] text-stone-400">
                    [UPI QR]
                  </div>
                )}
                <span className="text-[8.5px] text-stone-500 font-mono mt-0.5">Instant UPI QR</span>
              </div>

              {/* Right: Tax Breakdown and Final Figures */}
              <div className="col-span-4 pl-1">
                <div className="space-y-0.5 text-[10.5px]">
                  <div className="flex justify-between items-center text-stone-700">
                    <span>Taxable Value</span>
                    <span className="font-mono tabular-nums">{invoice.totalTaxableValue.toFixed(2)}</span>
                  </div>

                  {invoice.isInterState ? (
                    <div className="flex justify-between items-center text-stone-700">
                      <span>IGST (3.0%)</span>
                      <span className="font-mono tabular-nums">{invoice.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-stone-700">
                        <span>CGST (1.5%)</span>
                        <span className="font-mono tabular-nums">{invoice.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-stone-700">
                        <span>SGST (1.5%)</span>
                        <span className="font-mono tabular-nums">{invoice.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between items-center text-stone-600 text-[9.5px]">
                      <span>Round Off</span>
                      <span className="font-mono tabular-nums">
                        {invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-stone-300 pt-1 flex justify-between items-center font-bold text-stone-900">
                    <span>Grand Total</span>
                    <span className="font-mono tabular-nums font-bold text-sm text-amber-950">
                      {formatINR(invoice.grandTotal)}
                    </span>
                  </div>

                  {/* Deductions: Old Gold Return or Trade-in Credit */}
                  {invoice.oldGoldAmount !== undefined && invoice.oldGoldAmount > 0 && (
                    <div className="flex justify-between items-start text-amber-900 text-[10px] pt-0.5">
                      <div className="pr-1 leading-tight">
                        <span className="font-semibold text-rose-900">
                          {invoice.oldGoldExchange && invoice.oldGoldExchange.grossWeight > 0
                            ? 'Less Old Gold Exchange'
                            : `Less ${invoice.oldGoldExchange?.description || 'Trade-in Credit / Adjustment'}`}
                        </span>
                        {invoice.oldGoldExchange && invoice.oldGoldExchange.grossWeight > 0 && (
                          <span className="block text-[8.5px] text-stone-600 font-mono">
                            ({invoice.oldGoldExchange.grossWeight}g {invoice.oldGoldExchange.purity} @ ₹{invoice.oldGoldExchange.ratePerGram.toLocaleString('en-IN')}/g
                            {invoice.oldGoldExchange.deductionPercent > 0
                              ? ` less ${invoice.oldGoldExchange.deductionPercent}% tunch = ${invoice.oldGoldExchange.netWeight}g net`
                              : ''})
                          </span>
                        )}
                      </div>
                      <span className="font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                        - {formatINR(invoice.oldGoldAmount)}
                      </span>
                    </div>
                  )}

                  {/* Deductions: Advance Payment */}
                  {invoice.advanceAdjusted > 0 && (
                    <div className="flex justify-between items-center text-emerald-800 text-[10px] pt-0.5">
                      <span className="font-semibold">Less Advance</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-800">
                        - {formatINR(invoice.advanceAdjusted)}
                      </span>
                    </div>
                  )}

                  {/* Net Payable */}
                  {((invoice.oldGoldAmount !== undefined && invoice.oldGoldAmount > 0) || invoice.advanceAdjusted > 0) && (
                    <div className="flex justify-between items-center text-stone-900 font-bold text-[11px] pt-0.5 border-t border-stone-300 bg-amber-50/50 p-0.5 rounded-xs">
                      <span>Net Payable</span>
                      <span className="font-mono tabular-nums text-xs text-amber-950">
                        {formatINR(invoice.netPayable !== undefined ? invoice.netPayable : Math.max(0, invoice.grandTotal - (invoice.oldGoldAmount || 0) - (invoice.advanceAdjusted || 0)))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-stone-800 text-[10.5px] pt-0.5">
                    <span>Amount Paid</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {formatINR(invoice.amountPaidNow)}
                    </span>
                  </div>

                  {invoice.remainingBalance > 0 && (
                    <div className="flex justify-between items-center text-rose-700 font-bold text-[10px] pt-0.5 border-t border-dashed border-stone-300">
                      <span>Balance Due</span>
                      <span className="font-mono tabular-nums">
                        {formatINR(invoice.remainingBalance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Declarations & Signature Footer */}
          <div className="grid grid-cols-12 gap-3 pt-2 border-t border-stone-200 mt-auto">
            {/* Declaration and Terms */}
            <div className="col-span-8 pr-3 flex flex-col justify-between min-h-[110px]">
              <div>
                <div className="text-[9.5px] font-bold text-stone-800 uppercase tracking-wider mb-1">
                  Declaration & Showroom Terms:
                </div>
                <ul className="text-[9px] text-stone-600 space-y-0.5 list-disc pl-3 leading-tight">
                  {terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 pt-1">
                <div className="w-48 border-b border-stone-400 mb-1"></div>
                <span className="text-[9px] text-stone-600 font-semibold tracking-wide">Customer Signature / Received</span>
              </div>
            </div>

            {/* Authorised Signatory with Actual Signature Image */}
            <div className="col-span-4 text-center flex flex-col justify-end items-center pt-1">
              <div className="h-14 flex items-end justify-center mb-0.5">
                <img
                  src={signatureImg}
                  alt="Authorised Signatory"
                  className="max-h-14 w-auto object-contain"
                />
              </div>
              <div className="w-full border-t border-stone-400 pt-0.5 text-[10.5px] font-bold text-stone-800">
                For {settings.businessName}
              </div>
              <div className="text-[9.5px] text-stone-500">Authorised Signatory</div>
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
  const page3Ref = useRef<HTMLDivElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copyMode, setCopyMode] = useState<'2_copies' | '3_copies' | '1_copy'>('2_copies');
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

    generateUpiQrDataUrl(upi, settings.businessName, amount, invoice.invoiceNumber).then((url) => {
      if (url) setActiveQrUrl(url);
    });
  }, [settings.upiId, settings.businessName, invoice]);

  const handlePrint = () => {
    window.print();
  };

  // Helper to build a clean multi-page A4 PDF using jsPDF (Strict GST Rule 48)
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
    } else if (copyMode === '3_copies') {
      if (page2Ref.current) activeSheets.push({ ref: page2Ref, name: 'Duplicate' });
      if (page3Ref.current) activeSheets.push({ ref: page3Ref, name: 'Triplicate' });
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

      // Official jsPDF direct download: works 100% on Vercel and all desktop & mobile browsers
      res.pdf.save(fileName);
    } catch (error) {
      console.warn('Direct PDF canvas issue, falling back to browser print engine:', error);
      // Seamless browser print-to-PDF fallback
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

      // 1. Try Native Web Share API (Instant share directly to WhatsApp on Android, iOS & modern Windows)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber} - ${settings.businessName}`,
            text: generateWhatsAppInvoiceMessage(invoice, settings),
            files: [pdfFile],
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return; // User canceled native share sheet
          }
          console.warn('Navigator share error, falling back to WhatsApp Web:', shareErr);
        }
      }

      // 2. Direct download with jsPDF save
      res.pdf.save(fileName);

      // 3. Open WhatsApp Web chat with customer
      openWhatsAppInvoice(invoice, settings);

      // 4. Show guidance modal
      setShowWhatsAppHelp(true);
    } catch (err) {
      console.error('WhatsApp with PDF process error:', err);
      openWhatsAppInvoice(invoice, settings);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Upgraded professional terms with statutory BIS Assaying & Hallmarking Centre verification statement
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
      {/* Print CSS Styles for clean 2-page or 3-page A4 output without scrollbars or double-stamping */}
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
            margin: 5mm 5mm;
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
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Floating Toolbar (Hidden when printing) */}
      <div className="sticky top-2 z-50 flex flex-wrap items-center justify-between gap-2 print:hidden bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-2xl border border-stone-200 max-w-4xl w-full mb-4">
        {/* Left: GST Rule 48 Copy Selector */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-300 text-xs">
          <span className="text-[11px] font-bold text-stone-700 px-1.5 flex items-center gap-1">
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">GST Rule 48:</span>
          </span>
          <button
            type="button"
            onClick={() => setCopyMode('2_copies')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
              copyMode === '2_copies'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-300 font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Customer Copy + Supplier Showroom Copy"
          >
            2 Copies (Retail)
          </button>
          <button
            type="button"
            onClick={() => setCopyMode('3_copies')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs ${
              copyMode === '3_copies'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Full GST Rule 48 Triplicate Set: Recipient + Transporter + Supplier"
          >
            3 Copies (Rule 48)
          </button>
          <button
            type="button"
            onClick={() => setCopyMode('1_copy')}
            className={`px-2 py-1 rounded-lg font-semibold transition-all text-xs ${
              copyMode === '1_copy'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-300 font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="Recipient Original Copy Only"
          >
            1 Copy
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

      {/* WhatsApp Help Guidance Modal (Desktop fallback) */}
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
                <Check className="w-4 h-4 text-emerald-600" />
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

      {/* Sheet 1: ORIGINAL FOR RECIPIENT (CUSTOMER COPY) */}
      <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block">
        <InvoiceSheet
          ref={page1Ref}
          invoice={invoice}
          settings={settings}
          copyTitle="ORIGINAL FOR RECIPIENT"
          copySubtitle="CUSTOMER COPY"
          terms={terms}
          totalOtherCharges={totalOtherCharges}
          activeQrUrl={activeQrUrl}
        />
      </div>

      {/* For 2 Copies Mode: Sheet 2 is TRIPLICATE FOR SUPPLIER (GST Rule 48(1)(c)) */}
      {copyMode === '2_copies' && (
        <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block print-break-page">
          <InvoiceSheet
            ref={page2Ref}
            invoice={invoice}
            settings={settings}
            copyTitle="TRIPLICATE FOR SUPPLIER"
            copySubtitle="SUPPLIER / SHOWROOM COPY (GST RULE 48)"
            terms={terms}
            totalOtherCharges={totalOtherCharges}
            activeQrUrl={activeQrUrl}
          />
        </div>
      )}

      {/* For 3 Copies Mode: Full GST Rule 48 Set */}
      {copyMode === '3_copies' && (
        <>
          {/* Sheet 2: DUPLICATE FOR TRANSPORTER (GST Rule 48(1)(b)) */}
          <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block print-break-page">
            <InvoiceSheet
              ref={page2Ref}
              invoice={invoice}
              settings={settings}
              copyTitle="DUPLICATE FOR TRANSPORTER"
              copySubtitle="TRANSPORTER COPY (GST RULE 48)"
              terms={terms}
              totalOtherCharges={totalOtherCharges}
              activeQrUrl={activeQrUrl}
            />
          </div>

          {/* Sheet 3: TRIPLICATE FOR SUPPLIER (GST Rule 48(1)(c)) */}
          <div className="w-full flex flex-col items-center mb-6 print:m-0 print:p-0 print:block print-break-page">
            <InvoiceSheet
              ref={page3Ref}
              invoice={invoice}
              settings={settings}
              copyTitle="TRIPLICATE FOR SUPPLIER"
              copySubtitle="SUPPLIER / SHOWROOM COPY (GST RULE 48)"
              terms={terms}
              totalOtherCharges={totalOtherCharges}
              activeQrUrl={activeQrUrl}
            />
          </div>
        </>
      )}
    </div>
  );
};
