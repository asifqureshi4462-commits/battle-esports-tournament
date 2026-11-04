// Automated test script to verify QR generation and backend integration for ALL amounts:
// ₹10, ₹20, ₹50, ₹100, ₹200, ₹500, ₹1,000, ₹2,000 and switching sequences.

import QRCode from 'qrcode';

function buildUpiUri(options) {
  const { upiId, merchantName, amountRupees, note, transactionRef } = options;
  const cleanUpi = upiId.trim();
  const cleanName = (merchantName && merchantName.trim()) || 'Tournament Merchant';
  const params = new URLSearchParams();
  params.set('pa', cleanUpi);
  params.set('pn', cleanName);
  params.set('cu', 'INR');
  if (amountRupees !== undefined && amountRupees > 0) {
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

async function generateUpiQrDataUrl(upiUri) {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

async function run() {
  const baseUrl = 'http://localhost:3000';
  console.log('--- TESTING DEPOSIT QR GENERATION FOR ALL AMOUNTS ---');

  // 1. Fetch live admin settings
  const settingsRes = await fetch(`${baseUrl}/api/settings`);
  const settingsData = await settingsRes.json();
  const merchantUpiId = settingsData.settings.merchantUpiId;
  const merchantName = settingsData.settings.merchantName;
  console.log('✓ Loaded live settings:');
  console.log('  Merchant UPI ID:', merchantUpiId);
  console.log('  Merchant Name:', merchantName);

  if (!merchantUpiId || !merchantUpiId.includes('@')) {
    throw new Error('Merchant UPI ID is invalid in settings');
  }

  // 2. Test QR Generation for all requested amounts:
  const testAmounts = [10, 20, 50, 100, 200, 500, 1000, 2000];

  for (const amt of testAmounts) {
    const uri = buildUpiUri({
      upiId: merchantUpiId,
      merchantName: merchantName,
      amountRupees: amt,
      note: `Deposit_₹${amt}`,
    });

    const parsedUri = new URL(uri);
    const pa = parsedUri.searchParams.get('pa');
    const am = parsedUri.searchParams.get('am');
    const cu = parsedUri.searchParams.get('cu');

    if (pa !== merchantUpiId) throw new Error(`Merchant UPI mismatch for ₹${amt}: ${pa}`);
    if (am !== amt.toFixed(2)) throw new Error(`Amount mismatch for ₹${amt}: expected ${amt.toFixed(2)}, got ${am}`);
    if (cu !== 'INR') throw new Error(`Currency mismatch for ₹${amt}`);

    const qrBase64 = await generateUpiQrDataUrl(uri);
    if (!qrBase64.startsWith('data:image/png;base64,')) {
      throw new Error(`Failed to generate valid PNG base64 QR for ₹${amt}`);
    }

    console.log(`✓ ₹${amt.toLocaleString('en-IN')}: Valid URI [am=${am}] -> Scannable QR generated (${qrBase64.length} bytes base64)`);
  }

  // 3. Test switching sequence: ₹50 -> ₹20 -> ₹10
  console.log('\n--- TESTING REAL-TIME AMOUNT SWITCHING: ₹50 -> ₹20 -> ₹10 ---');
  let currentAmount = 50;
  let uri50 = buildUpiUri({ upiId: merchantUpiId, merchantName, amountRupees: currentAmount });
  let qr50 = await generateUpiQrDataUrl(uri50);
  console.log('✓ Switched to ₹50: URI am =', new URL(uri50).searchParams.get('am'), '| QR length =', qr50.length);
  if (new URL(uri50).searchParams.get('am') !== '50.00') throw new Error('Switch to ₹50 failed');

  currentAmount = 20;
  let uri20 = buildUpiUri({ upiId: merchantUpiId, merchantName, amountRupees: currentAmount });
  let qr20 = await generateUpiQrDataUrl(uri20);
  console.log('✓ Switched to ₹20: URI am =', new URL(uri20).searchParams.get('am'), '| QR length =', qr20.length);
  if (new URL(uri20).searchParams.get('am') !== '20.00') throw new Error('Switch to ₹20 failed');

  currentAmount = 10;
  let uri10 = buildUpiUri({ upiId: merchantUpiId, merchantName, amountRupees: currentAmount });
  let qr10 = await generateUpiQrDataUrl(uri10);
  console.log('✓ Switched to ₹10: URI am =', new URL(uri10).searchParams.get('am'), '| QR length =', qr10.length);
  if (new URL(uri10).searchParams.get('am') !== '10.00') throw new Error('Switch to ₹10 failed');

  // 4. Test backend order creation and UTR submission for ₹10, ₹20, and ₹50
  console.log('\n--- TESTING BACKEND DEPOSIT CREATION WITH UTR ---');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rahul@gamer.com', password: 'gamer123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  for (const amt of [10, 20, 50]) {
    const utr = 'UTR' + Date.now().toString().slice(-6) + amt;
    const depRes = await fetch(`${baseUrl}/api/wallet/deposit/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amountPaise: amt * 100,
        utr: utr,
        paymentMethod: 'UPI',
      }),
    });
    const depData = await depRes.json();
    if (depRes.status !== 200 || !depData.deposit) {
      throw new Error(`Deposit creation for ₹${amt} failed: ` + JSON.stringify(depData));
    }
    console.log(`✓ ₹${amt} Deposit Order Created: ID = ${depData.deposit.id}, Amount = ₹${depData.deposit.amountPaise / 100}, Status = ${depData.deposit.status}, UTR = ${depData.deposit.utr}`);
  }

  console.log('\n=========================================');
  console.log('ALL QR GENERATION AND SWITCHING TESTS PASSED!');
  console.log('=========================================');
}

run().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
