import QRCode from 'qrcode';

export interface UpiUriOptions {
  upiId: string;
  merchantName?: string;
  amountRupees?: number;
  note?: string;
  transactionRef?: string;
}

/**
 * Validates a UPI ID (Virtual Payment Address).
 * UPI VPAs follow the pattern username@bankhandle (e.g. merchant@icici, 9876543210@paytm)
 */
export function validateUpiId(upiId: string | null | undefined): { valid: boolean; error?: string } {
  if (!upiId || typeof upiId !== 'string') {
    return { valid: false, error: 'UPI ID cannot be empty.' };
  }
  const trimmed = upiId.trim();
  if (trimmed.length < 5) {
    return { valid: false, error: 'UPI ID is too short (minimum 5 characters).' };
  }
  if (!trimmed.includes('@')) {
    return { valid: false, error: 'UPI ID must contain "@" (e.g., name@bank or phone@paytm).' };
  }
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'UPI ID must contain exactly one "@" symbol.' };
  }
  const [userPart, handlePart] = parts;
  if (!userPart || userPart.length < 2) {
    return { valid: false, error: 'Invalid user/phone prefix before "@".' };
  }
  if (!handlePart || handlePart.length < 2) {
    return { valid: false, error: 'Invalid bank handle after "@" (e.g., icici, paytm, oksbi).' };
  }
  // Standard VPA regex
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
  if (!upiRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'UPI ID contains invalid characters. Only alphanumeric characters, dots, dashes, and underscores are allowed.',
    };
  }
  return { valid: true };
}

/**
 * Builds a standardized, fully compliant UPI Payment URI (upi://pay?...)
 * Properly URL-encodes special characters in merchant name, VPA, and note.
 */
export function buildUpiUri(options: UpiUriOptions): string {
  const { upiId, merchantName, amountRupees, note, transactionRef } = options;
  const cleanUpi = upiId.trim();
  const cleanName = (merchantName && merchantName.trim()) || 'Tournament Merchant';

  const params = new URLSearchParams();
  params.set('pa', cleanUpi);
  params.set('pn', cleanName);
  params.set('cu', 'INR');

  if (amountRupees !== undefined && amountRupees > 0) {
    // UPI standard requires 2 decimal places e.g. 100.00
    params.set('am', amountRupees.toFixed(2));
  }
  if (note && note.trim()) {
    params.set('tn', note.trim());
  }
  if (transactionRef && transactionRef.trim()) {
    params.set('tr', transactionRef.trim());
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates an SVG or high-res base64 Data URL for a given UPI URI using the offline QRCode engine.
 */
export async function generateUpiQrDataUrl(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
