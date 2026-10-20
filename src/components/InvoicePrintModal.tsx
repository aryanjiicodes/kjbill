import React, { useRef, useState } from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatINR, formatGrams, numberToIndianWords } from '../utils/numberToWords';
import { Printer, X, Download, ShieldCheck, Loader2, MessageCircle } from 'lucide-react';
import { openWhatsAppInvoice } from '../utils/whatsapp';
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

export const InvoicePrintModal: React.FC<Props> = ({ invoice, settings, onClose }) => {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (): Promise<void> => {
    if (!printContentRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const element = printContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // 2x resolution for sharp A4 output
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const safeNumber = invoice.invoiceNumber.replace(/[\/\\]/g, '_');
      pdf.save(`Kamakhya_Jewellers_Invoice_${safeNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Could not generate direct PDF. You can also click "Print A4 Invoice" and select "Save as PDF" in your print dialog.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsAppWithPdf = async () => {
    await handleDownloadPdf();
    openWhatsAppInvoice(invoice, settings);
    setTimeout(() => {
      alert('PDF saved to Downloads! In WhatsApp, tap the 📎 attach icon to send the PDF along with the bill message.');
    }, 500);
  };

  // Upgraded professional terms
  const terms = settings.termsAndConditions && settings.termsAndConditions.length > 0
    ? settings.termsAndConditions
    : [
        'Certified 100% BIS Hallmarked jewellery. Purity & weight guaranteed as per tax invoice.',
        'Exchange or Buyback will be accepted strictly on prevailing market metal rates as per store policy.',
        'Stone weight has been deducted from gross weight to arrive at net precious metal weight.',
        'Customers are requested to verify the ornaments, hallmark stamp, and weight before leaving the showroom counter.',
        'Subject to local showroom jurisdiction only. E. & O.E.'
      ];

  const totalOtherCharges = invoice.items.reduce((s, i) => s + (i.otherCharges || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Floating Toolbar (Hidden when printing) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-xl border border-stone-200">
        <button
          onClick={handleSendWhatsAppWithPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
          title="Save PDF and send digital bill on WhatsApp"
        >
          <MessageCircle className="w-4 h-4" />
          <span>PDF + WhatsApp</span>
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
          title="Save invoice directly to your computer as PDF"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Saving PDF...</span>
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
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-sm"
          title="Print to office printer or Save as PDF via browser"
        >
          <Printer className="w-4 h-4" />
          <span>Print A4 Invoice</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
          title="Close Preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div
        ref={printContentRef}
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 mx-auto p-6 sm:p-8 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-6 print:w-full print:max-w-none text-[12px] leading-tight relative overflow-hidden"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Background Watermark (Placed on back so all text & tables remain fully crisp & visible) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src={watermarkImg}
            alt="Watermark"
            className="w-[440px] max-w-[70%] opacity-[0.065] select-none object-contain"
          />
        </div>

        {/* Content Wrapper (relative z-10 over watermark) */}
        <div className="relative z-10">
          {/* Top Header */}
          <div className="border-b-2 border-stone-800 pb-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Main Brand Logo (Horizontal) */}
              <div className="w-[210px] shrink-0 flex items-center">
                <img
                  src={mainLogoImg}
                  alt={settings.businessName}
                  className="max-h-[72px] w-auto object-contain"
                />
              </div>

              {/* Center: Shop Details & GSTIN */}
              <div className="text-center flex-1 px-2">
                <div className="text-[10px] font-bold tracking-widest text-amber-800 uppercase mb-0.5">
                  ★ GST TAX INVOICE ★
                </div>
                <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-stone-900 leading-tight">
                  {settings.businessName}
                </h1>
                <p className="text-[11px] text-stone-600 mt-1 max-w-md mx-auto leading-tight">
                  {settings.address}
                </p>
                <div className="flex items-center justify-center gap-2.5 text-[11px] text-stone-700 mt-1">
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
              <div className="w-[110px] shrink-0 flex flex-col items-center justify-center text-center">
                <img
                  src={bisLogoImg}
                  alt="BIS Hallmark"
                  className="max-h-[68px] w-auto object-contain"
                />
                <span className="text-[8px] font-bold text-blue-900 tracking-wider mt-0.5 uppercase">
                  BIS 916 Hallmark
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Invoice Meta Grid */}
          <div className="grid grid-cols-12 gap-2 mb-3">
            {/* Receiver / Billed To */}
            <div className="col-span-8 border border-stone-300 rounded-xs p-2.5 bg-white/90">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200 pb-1 mb-1.5 flex justify-between items-center">
                <span>Details of Receiver | Billed to:</span>
                <span className="text-[9px] text-stone-400 font-mono">Original for Recipient</span>
              </div>
              <div className="text-sm font-bold text-stone-900">{invoice.customerName}</div>
              <div className="text-[11px] text-stone-600 mt-0.5 whitespace-pre-line">
                {invoice.customerAddress || 'Counter Walk-in Customer'}
              </div>
              <div className="text-[11px] text-stone-700 mt-1">
                <span className="font-semibold">Mobile:</span> +91 {invoice.customerMobile}
              </div>
              {invoice.customerGstin && (
                <div className="text-[11px] font-bold text-stone-900 mt-0.5">
                  GSTIN: {invoice.customerGstin}
                </div>
              )}
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
                  <span className="font-medium text-stone-800">{invoice.customerState || 'Delhi'} (07)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consignee / Shipped To Banner */}
          <div className="border border-stone-300 rounded-xs p-1.5 mb-3 bg-stone-50/40 print:bg-transparent text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mr-2">
              Shipped / Delivered to:
            </span>
            <span className="font-medium text-stone-900">{invoice.customerName}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="text-stone-600">{invoice.customerAddress || 'Showroom Counter Handover'}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="font-semibold text-stone-700">State: {invoice.customerState || 'Delhi-07'}</span>
          </div>

          {/* Products Table with Mkg % and Other Charges */}
          <div className="border border-stone-300 rounded-xs overflow-hidden mb-3 bg-white/95">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-stone-100 print:bg-stone-100 border-b border-stone-300 text-stone-800 font-bold">
                  <th className="py-1.5 px-1.5 text-center w-7 border-r border-stone-300">#</th>
                  <th className="py-1.5 px-2 border-r border-stone-300 min-w-[160px]">Product Description</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-stone-300">HSN</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-stone-300">Purity</th>
                  <th className="py-1.5 px-2 text-right border-r border-stone-300">Gross Wt (g)</th>
                  <th className="py-1.5 px-1.5 text-right border-r border-stone-300">Stone (g)</th>
                  <th className="py-1.5 px-2 text-right border-r border-stone-300 font-bold text-stone-900 bg-amber-50/60 print:bg-transparent">Net Wt (g)</th>
                  <th className="py-1.5 px-2 text-right border-r border-stone-300">Rate /g</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-stone-300">Mkg %</th>
                  <th className="py-1.5 px-2 text-right border-r border-stone-300">Other Chg</th>
                  <th className="py-1.5 px-2 text-right border-r border-stone-300">Taxable Value</th>
                  <th className="py-1.5 px-1 text-center border-r border-stone-300">GST%</th>
                  <th className="py-1.5 px-2 text-right font-bold text-stone-900">Total (₹)</th>
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
                      <td className="py-1 px-1.5 text-center border-r border-stone-300 font-mono text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-r border-stone-300 font-medium text-stone-900">
                        <div>{item.productName || `${item.metalType} Jewellery`}</div>
                        {(item.stoneDescription || (item.stoneRate && item.stoneRate > 0) || item.stoneCharges > 0) && (
                          <div className="text-[9px] text-stone-500 font-normal">
                            Stone: {item.stoneDescription || 'Studded'}
                            {item.stoneRate ? ` @ ₹${item.stoneRate}/g` : ''}
                            {item.stoneCharges > 0 ? ` (₹${item.stoneCharges.toFixed(2)})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-stone-300 font-mono text-[10px]">
                        {item.hsnCode}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-stone-300 font-semibold">
                        {item.purity}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                        {item.grossWeight.toFixed(3)}
                      </td>
                      <td className="py-1 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums text-stone-600">
                        {item.stoneWeight > 0 ? item.stoneWeight.toFixed(3) : '0'}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums font-bold text-stone-900 bg-amber-50/40 print:bg-transparent">
                        {item.netWeight.toFixed(3)}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                        {item.ratePerGram.toFixed(2)}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-stone-300 font-mono font-medium text-stone-700">
                        {mkgPercentText}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums text-stone-700">
                        {otherChgText}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums font-medium">
                        {item.taxableValue.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 text-center border-r border-stone-300 text-stone-600 font-mono">
                        {item.gstRate}%
                      </td>
                      <td className="py-1 px-2 text-right font-mono tabular-nums font-bold text-stone-900">
                        {item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-300 text-stone-900">
                  <td colSpan={4} className="py-1.5 px-3 text-right border-r border-stone-300 uppercase tracking-wider text-[10px]">
                    Total :
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                    {invoice.totalGrossWeight.toFixed(3)}
                  </td>
                  <td className="py-1.5 px-1.5 text-right border-r border-stone-300 font-mono tabular-nums">
                    {invoice.totalStoneWeight.toFixed(3)}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums text-amber-950 font-extrabold bg-amber-100/40">
                    {invoice.totalNetWeight.toFixed(3)}
                  </td>
                  <td className="py-1.5 px-2 border-r border-stone-300"></td>
                  <td className="py-1.5 px-1.5 border-r border-stone-300"></td>
                  <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                    {totalOtherCharges > 0 ? `₹${totalOtherCharges.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                    {invoice.totalTaxableValue.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 border-r border-stone-300"></td>
                  <td className="py-1.5 px-2 text-right font-mono tabular-nums text-stone-900 font-bold">
                    {invoice.grandTotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words Banner */}
          <div className="border border-stone-300 rounded-xs px-3 py-1.5 mb-3 bg-stone-50/60 print:bg-transparent flex justify-between items-center text-[11px]">
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

          {/* Lower Summary Section: Bank Details + QR Code + Deductions + Tax Breakdown */}
          <div className="grid grid-cols-12 gap-3 border border-stone-300 rounded-xs p-3 mb-3 bg-white/95">
            {/* Left: Bank Details */}
            <div className="col-span-5 border-r border-stone-200 pr-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Bank & Payment Details:
              </div>
              <div className="space-y-1 text-[11px] text-stone-700">
                <div className="flex">
                  <span className="w-20 font-semibold text-stone-600">Bank:</span>
                  <span className="font-medium text-stone-900">{invoice.bankDetails?.bankName || settings.bankName}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-semibold text-stone-600">A/C Name:</span>
                  <span className="font-bold text-stone-900">{invoice.bankDetails?.accountName || settings.accountName}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-semibold text-stone-600">A/C No:</span>
                  <span className="font-mono font-bold text-stone-900">{invoice.bankDetails?.accountNumber || settings.accountNumber}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-semibold text-stone-600">IFSC:</span>
                  <span className="font-mono font-semibold text-stone-900">{invoice.bankDetails?.ifscCode || settings.ifscCode}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-semibold text-stone-600">UPI ID:</span>
                  <span className="font-mono font-bold text-amber-900">{invoice.bankDetails?.upiId || settings.upiId}</span>
                </div>
              </div>
            </div>

            {/* Center: Scan to Pay UPI QR Code */}
            <div className="col-span-3 flex flex-col items-center justify-center border-r border-stone-200 pr-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                Scan to Pay:
              </div>
              {invoice.qrCodeDataUrl ? (
                <img
                  src={invoice.qrCodeDataUrl}
                  alt="UPI Payment QR"
                  className="w-24 h-24 object-contain border border-stone-200 rounded-xs bg-white p-0.5"
                />
              ) : (
                <div className="w-22 h-22 border border-stone-300 flex items-center justify-center text-[9px] text-stone-400">
                  [UPI QR]
                </div>
              )}
              <span className="text-[9px] text-stone-500 font-mono mt-1">Instant UPI QR</span>
            </div>

            {/* Right: Tax Breakdown and Final Figures */}
            <div className="col-span-4 pl-1">
              <div className="space-y-1 text-[11px]">
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
                  <div className="flex justify-between items-center text-stone-600 text-[10px]">
                    <span>Round Off</span>
                    <span className="font-mono tabular-nums">
                      {invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-stone-300 pt-1.5 flex justify-between items-center font-bold text-stone-900 text-sm">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums font-bold text-base text-amber-950">
                    {formatINR(invoice.grandTotal)}
                  </span>
                </div>

                {/* Deductions: Old Gold Return */}
                {invoice.oldGoldAmount !== undefined && invoice.oldGoldAmount > 0 && (
                  <div className="flex justify-between items-center text-amber-900 text-[11px] pt-1">
                    <div>
                      <span className="font-semibold">Less Old Gold Exchange</span>
                      {invoice.oldGoldExchange && (
                        <span className="block text-[9px] text-stone-500 font-mono">
                          ({invoice.oldGoldExchange.grossWeight}g {invoice.oldGoldExchange.purity} @ ₹{invoice.oldGoldExchange.ratePerGram}/g)
                        </span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums font-bold text-rose-700">
                      - {formatINR(invoice.oldGoldAmount)}
                    </span>
                  </div>
                )}

                {/* Deductions: Advance Payment */}
                {invoice.advanceAdjusted > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 text-[11px] pt-1">
                    <span className="font-semibold">Less Advance / Deposit</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-800">
                      - {formatINR(invoice.advanceAdjusted)}
                    </span>
                  </div>
                )}

                {/* Net Payable */}
                {((invoice.oldGoldAmount !== undefined && invoice.oldGoldAmount > 0) || invoice.advanceAdjusted > 0) && (
                  <div className="flex justify-between items-center text-stone-900 font-bold text-[12px] pt-1 border-t border-stone-300 bg-amber-50/50 p-1 rounded-xs">
                    <span>Net Payable Amount</span>
                    <span className="font-mono tabular-nums text-sm text-amber-950">
                      {formatINR(invoice.netPayable !== undefined ? invoice.netPayable : Math.max(0, invoice.grandTotal - (invoice.oldGoldAmount || 0) - (invoice.advanceAdjusted || 0)))}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-stone-800 text-[11px] pt-1">
                  <span>Amount Paid</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatINR(invoice.amountPaidNow)}
                  </span>
                </div>

                {invoice.remainingBalance > 0 && (
                  <div className="flex justify-between items-center text-rose-700 font-bold text-[11px] pt-0.5 border-t border-dashed border-stone-300">
                    <span>Balance Due</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(invoice.remainingBalance)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Declarations & Signature Footer */}
          <div className="grid grid-cols-12 gap-3 pt-2">
            {/* Declaration and Terms */}
            <div className="col-span-8 pr-4">
              <div className="text-[10px] font-bold text-stone-800 uppercase tracking-wider mb-1">
                Declaration & Showroom Terms:
              </div>
              <ul className="text-[10px] text-stone-600 space-y-0.5 list-disc pl-3 leading-snug">
                {terms.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>

            {/* Authorised Signatory with Actual Signature Image */}
            <div className="col-span-4 text-center flex flex-col justify-end items-center pt-2">
              <div className="h-16 flex items-end justify-center mb-1">
                <img
                  src={signatureImg}
                  alt="Authorised Signatory"
                  className="max-h-16 w-auto object-contain"
                />
              </div>
              <div className="w-full border-t border-stone-400 pt-1 text-[11px] font-bold text-stone-800">
                For {settings.businessName}
              </div>
              <div className="text-[10px] text-stone-500">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
