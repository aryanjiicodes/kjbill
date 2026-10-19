import React, { useRef, useState } from 'react';
import { Invoice, ShopSettings } from '../types';
import { formatINR, formatGrams, numberToIndianWords } from '../utils/numberToWords';
import { Printer, X, Download, ShieldCheck, Loader2, MessageCircle } from 'lucide-react';
import { openWhatsAppInvoice } from '../utils/whatsapp';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    // First download the PDF so it's ready to attach
    await handleDownloadPdf();
    // Then open WhatsApp with the text message
    openWhatsAppInvoice(invoice, settings);
    // Show a brief guidance alert
    setTimeout(() => {
      alert('PDF saved to Downloads! In WhatsApp, tap the 📎 attach icon to send the PDF along with the bill message.');
    }, 500);
  };

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
        className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 mx-auto p-6 sm:p-8 shadow-2xl rounded-sm print:shadow-none print:m-0 print:p-6 print:w-full print:max-w-none text-[12px] leading-tight"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Top Header */}
        <div className="relative border-b-2 border-stone-800 pb-3 mb-3">
          <div className="absolute top-0 right-0 text-[11px] font-semibold tracking-wide text-stone-600 uppercase">
            Original Copy
          </div>

          <div className="flex items-center justify-between">
            {/* Left Emblem / Logo */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="w-18 h-18 object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border border-amber-600/30 flex items-center justify-center text-amber-700 font-serif font-bold text-xl">
                  KJ
                </div>
              )}
            </div>

            {/* Center Shop Details */}
            <div className="text-center flex-1 px-4">
              <h2 className="text-xs font-bold tracking-widest text-stone-600 uppercase">
                GST INVOICE
              </h2>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wide text-stone-900 mt-0.5">
                {settings.businessName}
              </h1>
              <p className="text-[12px] text-stone-600 mt-1 max-w-lg mx-auto">
                {settings.address}
              </p>
              <div className="flex items-center justify-center gap-3 text-[12px] text-stone-700 mt-1">
                <span>Contact: +91 {settings.mobile}</span>
                {settings.email && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{settings.email}</span>
                  </>
                )}
              </div>
              <div className="text-[12px] font-bold text-stone-900 mt-0.5">
                GSTIN: {settings.gstin || '07AAACK1234F1Z8'}
              </div>
            </div>

            {/* Right BIS Hallmark Stamp */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              {settings.bisHallmarkUrl ? (
                <img
                  src={settings.bisHallmarkUrl}
                  alt="BIS Hallmark"
                  className="w-18 h-18 object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center border border-blue-900 p-1 rounded-sm text-center">
                  <ShieldCheck className="w-6 h-6 text-blue-900" />
                  <span className="text-[9px] font-bold text-blue-900 leading-none mt-0.5">BIS 916</span>
                  <span className="text-[8px] text-stone-600 leading-none">HALLMARK</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Invoice Meta Grid */}
        <div className="grid grid-cols-12 gap-2 mb-3">
          {/* Receiver / Billed To */}
          <div className="col-span-8 border border-stone-300 rounded-xs p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200 pb-1 mb-1.5">
              Details of Receiver | Billed to:
            </div>
            <div className="text-sm font-bold text-stone-900">{invoice.customerName}</div>
            <div className="text-[11px] text-stone-600 mt-0.5 whitespace-pre-line">
              {invoice.customerAddress || 'Counter Walk-in Customer'}
            </div>
            <div className="text-[11px] text-stone-700 mt-1">
              <span className="font-semibold">Contact:</span> {invoice.customerMobile}
            </div>
            {invoice.customerGstin && (
              <div className="text-[11px] font-bold text-stone-900 mt-0.5">
                GSTIN: {invoice.customerGstin}
              </div>
            )}
          </div>

          {/* Invoice Info */}
          <div className="col-span-4 border border-stone-300 rounded-xs p-2.5 bg-stone-50/50 print:bg-transparent">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-stone-600">Invoice No</span>
                <span className="font-mono font-bold text-stone-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-stone-600">Date</span>
                <span className="font-medium text-stone-800">{invoice.date}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-stone-600">Payment Mode</span>
                <span className="font-bold text-stone-900">{invoice.paymentMode}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-stone-600">Place of Supply</span>
                <span className="font-medium text-stone-800">{invoice.customerState || 'Delhi'} (07)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Consignee / Shipped To (Optional if different) */}
        <div className="border border-stone-300 rounded-xs p-2 mb-3 bg-stone-50/30 print:bg-transparent text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mr-2">
            Details of Consignee | Shipped to:
          </span>
          <span className="font-medium text-stone-900">{invoice.customerName}</span>
          <span className="mx-2 text-stone-400">·</span>
          <span className="text-stone-600">{invoice.customerAddress || 'New Delhi'}</span>
          <span className="mx-2 text-stone-400">·</span>
          <span className="font-semibold text-stone-700">State: {invoice.customerState || 'Delhi-07'}</span>
        </div>

        {/* Products Table */}
        <div className="border border-stone-300 rounded-xs overflow-hidden mb-3">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-stone-100/90 print:bg-stone-100 border-b border-stone-300 text-stone-700 font-semibold">
                <th className="py-1.5 px-1.5 text-center w-7 border-r border-stone-300">#</th>
                <th className="py-1.5 px-2 border-r border-stone-300">Product</th>
                <th className="py-1.5 px-1.5 text-center border-r border-stone-300">HSN</th>
                <th className="py-1.5 px-1.5 text-center border-r border-stone-300">Purity</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300">Weight (g)</th>
                <th className="py-1.5 px-1.5 text-right border-r border-stone-300">Stone (g)</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300">Mkg. Chg</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300 font-bold text-stone-900">Net Wt (g)</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300">Rate /g</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300">Taxable Value</th>
                <th className="py-1.5 px-1 text-center border-r border-stone-300">GST%</th>
                <th className="py-1.5 px-2 text-right border-r border-stone-300">GST Amt</th>
                <th className="py-1.5 px-2 text-right font-bold text-stone-900">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-stone-50/50 print:hover:bg-transparent">
                  <td className="py-1 px-1.5 text-center border-r border-stone-300 font-mono text-[10px]">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-2 border-r border-stone-300 font-medium text-stone-900">
                    <div>{item.productName}</div>
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
                  <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                    {item.makingCharges > 0 ? item.makingCharges.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums font-bold text-stone-900 bg-amber-50/30 print:bg-transparent">
                    {item.netWeight.toFixed(3)}
                  </td>
                  <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                    {item.ratePerGram.toFixed(2)}
                  </td>
                  <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums font-medium">
                    {item.taxableValue.toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-center border-r border-stone-300 text-stone-600">
                    {item.gstRate}%
                  </td>
                  <td className="py-1 px-2 text-right border-r border-stone-300 font-mono tabular-nums text-stone-700">
                    {item.gstAmount.toFixed(2)}
                  </td>
                  <td className="py-1 px-2 text-right font-mono tabular-nums font-bold text-stone-900">
                    {item.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}

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
                <td className="py-1.5 px-2 border-r border-stone-300"></td>
                <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums text-amber-900">
                  {invoice.totalNetWeight.toFixed(3)}
                </td>
                <td className="py-1.5 px-2 border-r border-stone-300"></td>
                <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                  {invoice.totalTaxableValue.toFixed(2)}
                </td>
                <td className="py-1.5 px-1 border-r border-stone-300"></td>
                <td className="py-1.5 px-2 text-right border-r border-stone-300 font-mono tabular-nums">
                  {invoice.totalGst.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 text-right font-mono tabular-nums text-stone-900 font-bold">
                  {invoice.grandTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words banner */}
        <div className="border border-stone-300 rounded-xs px-3 py-1.5 mb-3 bg-stone-50/50 print:bg-transparent flex justify-between items-center text-[11px]">
          <div>
            <span className="font-semibold text-stone-600">Amount in Words: </span>
            <span className="font-bold text-stone-900 italic">
              {numberToIndianWords(invoice.grandTotal)}
            </span>
          </div>
          <div className="text-[10px] text-stone-500 font-mono">
            Net Weight: {invoice.totalNetWeight.toFixed(3)} g
          </div>
        </div>

        {/* Lower Summary Section: Bank Details + QR Code + Tax Breakdown */}
        <div className="grid grid-cols-12 gap-3 border border-stone-300 rounded-xs p-3 mb-3">
          {/* Left: Bank Details */}
          <div className="col-span-5 border-r border-stone-200 pr-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Bank Details:
            </div>
            <div className="space-y-1 text-[11px] text-stone-700">
              <div className="flex">
                <span className="w-20 font-semibold text-stone-600">Bank:</span>
                <span className="font-medium text-stone-900">{invoice.bankDetails.bankName}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-stone-600">A/C No:</span>
                <span className="font-mono font-bold text-stone-900">{invoice.bankDetails.accountNumber}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-stone-600">IFSC:</span>
                <span className="font-mono font-semibold text-stone-900">{invoice.bankDetails.ifscCode}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-stone-600">UPI ID:</span>
                <span className="font-mono text-stone-900">{invoice.bankDetails.upiId}</span>
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
                className="w-24 h-24 object-contain border border-stone-200 rounded-xs"
              />
            ) : (
              <div className="w-22 h-22 border border-stone-300 flex items-center justify-center text-[9px] text-stone-400">
                [UPI QR]
              </div>
            )}
            <span className="text-[9px] text-stone-500 font-mono mt-1">Instant UPI Scan</span>
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

              {invoice.advanceAdjusted > 0 && (
                <div className="flex justify-between items-center text-emerald-800 text-[11px] pt-1">
                  <span className="font-semibold">Less Advance / Deposit</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-800">
                    - {formatINR(invoice.advanceAdjusted)}
                  </span>
                </div>
              )}

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
              Declaration & Terms:
            </div>
            <ul className="text-[10px] text-stone-600 space-y-0.5 list-disc pl-3">
              {settings.termsAndConditions.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ul>
          </div>

          {/* Authorised Signatory */}
          <div className="col-span-4 text-center flex flex-col justify-end pt-8">
            <div className="text-stone-700 font-serif italic text-lg mb-1">
              {settings.ownerName}
            </div>
            <div className="border-t border-stone-400 pt-1 text-[11px] font-bold text-stone-800">
              For {settings.businessName}
            </div>
            <div className="text-[10px] text-stone-500">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};
