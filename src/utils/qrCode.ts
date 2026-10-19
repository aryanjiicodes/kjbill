import QRCode from 'qrcode';

export async function generateUpiQrDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  invoiceNumber: string
): Promise<string> {
  try {
    const cleanUpi = upiId.trim() || '9818144011@okbizaxis';
    const cleanName = payeeName.trim() || 'Kamakhya Jewellers';
    const cleanAmount = amount > 0 ? amount.toFixed(2) : '0.00';
    const note = `Invoice ${invoiceNumber}`;

    const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(
      cleanName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

    const dataUrl = await QRCode.toDataURL(upiUri, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });

    return dataUrl;
  } catch (error) {
    console.error('Failed to generate UPI QR code:', error);
    return '';
  }
}
