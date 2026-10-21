import { Invoice, ShopSettings } from '../types';
import { formatINR } from './numberToWords';

export function generateWhatsAppInvoiceMessage(invoice: Invoice, settings: ShopSettings): string {
  // Build clean item list
  const itemsList = invoice.items
    .map((item, i) => {
      const desc = item.productName || `${item.metalType} Jewellery`;
      const purityLabel = item.purity || '';
      return `${i + 1}. ${desc}\n   ${purityLabel} | Net: ${item.netWeight.toFixed(3)}g | Rate: ₹${item.ratePerGram.toLocaleString('en-IN')}/g\n   Amount: ${formatINR(item.lineTotal)} (incl. GST)`;
    })
    .join('\n\n');

  // Deductions section
  let deductionsBlock = '';
  if ((invoice.oldGoldAmount && invoice.oldGoldAmount > 0) || (invoice.advanceAdjusted && invoice.advanceAdjusted > 0)) {
    deductionsBlock += '\n━━━━━━━━━━━━━━━━━━━━\n';
    deductionsBlock += '📌 *DEDUCTIONS*\n';
    if (invoice.oldGoldAmount && invoice.oldGoldAmount > 0) {
      if (invoice.oldGoldExchange && invoice.oldGoldExchange.grossWeight > 0) {
        const oldGoldDetail = ` (${invoice.oldGoldExchange.grossWeight}g ${invoice.oldGoldExchange.purity} @ ₹${invoice.oldGoldExchange.ratePerGram.toLocaleString('en-IN')}/g${invoice.oldGoldExchange.deductionPercent > 0 ? ` less ${invoice.oldGoldExchange.deductionPercent}% loss = ${invoice.oldGoldExchange.netWeight}g net` : ''})`;
        deductionsBlock += `   Old Gold Exchange: −${formatINR(invoice.oldGoldAmount)}${oldGoldDetail}\n`;
      } else {
        const label = invoice.oldGoldExchange?.description || 'Trade-in Credit / Adjustment';
        deductionsBlock += `   ${label}: −${formatINR(invoice.oldGoldAmount)}\n`;
      }
    }
    if (invoice.advanceAdjusted && invoice.advanceAdjusted > 0) {
      deductionsBlock += `   Advance Adjusted: −${formatINR(invoice.advanceAdjusted)}\n`;
    }
  }

  const netPayable = invoice.netPayable !== undefined
    ? invoice.netPayable
    : Math.max(0, invoice.grandTotal - (invoice.oldGoldAmount || 0) - (invoice.advanceAdjusted || 0));

  // Payment status
  let paymentLine = '';
  if (invoice.remainingBalance > 0) {
    paymentLine = `Amount Paid: ${formatINR(invoice.amountPaidNow)} (${invoice.paymentMode})\n⚠️ *Balance Due: ${formatINR(invoice.remainingBalance)}*`;
  } else {
    paymentLine = `Amount Paid: ${formatINR(invoice.amountPaidNow)} (${invoice.paymentMode})\n✅ *FULLY PAID*`;
  }

  const message = `*${settings.businessName}*
_GST Tax Invoice_

━━━━━━━━━━━━━━━━━━━━
*Invoice:* ${invoice.invoiceNumber}
*Date:* ${invoice.date}  •  ${invoice.time}
*Customer:* ${invoice.customerName}
*Mobile:* +91 ${invoice.customerMobile}
━━━━━━━━━━━━━━━━━━━━

*ITEMS PURCHASED*

${itemsList}

━━━━━━━━━━━━━━━━━━━━
*BILL SUMMARY*

   Total Net Weight: ${invoice.totalNetWeight.toFixed(3)} g
   Taxable Amount: ${formatINR(invoice.totalTaxableValue)}
   GST (3%): ${formatINR(invoice.totalGst)}
   *Grand Total: ${formatINR(invoice.grandTotal)}*${deductionsBlock}${deductionsBlock ? `\n   *Net Payable: ${formatINR(netPayable)}*` : ''}

${paymentLine}

━━━━━━━━━━━━━━━━━━━━
*PAYMENT DETAILS*

UPI: ${invoice.bankDetails?.upiId || settings.upiId}
Bank: ${invoice.bankDetails?.bankName || settings.bankName}
A/C: ${invoice.bankDetails?.accountNumber || settings.accountNumber}
IFSC: ${invoice.bankDetails?.ifscCode || settings.ifscCode}

━━━━━━━━━━━━━━━━━━━━
📍 *${settings.businessName}*
${settings.address}
📞 +91 ${settings.mobile}

_This is a digitally generated GST invoice._
_Please keep this for BIS Hallmark verification & warranty records._`;

  return message;
}

export function openWhatsAppInvoice(invoice: Invoice, settings: ShopSettings, overrideMobile?: string): void {
  const target = (overrideMobile || invoice.customerMobile || '').trim();
  const cleanMobile = target.replace(/\D/g, '');
  let phone = '';
  if (cleanMobile.length === 10) {
    phone = '91' + cleanMobile;
  } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    phone = cleanMobile;
  } else if (cleanMobile.length > 5) {
    phone = cleanMobile;
  }

  const message = generateWhatsAppInvoiceMessage(invoice, settings);
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = phone
    ? `https://wa.me/${phone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
}
