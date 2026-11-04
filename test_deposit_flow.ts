import http from 'http';

function makeRequest(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : null;
            resolve({ status: res.statusCode || 200, data });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPLETE DEPOSIT PAYMENT FLOW TESTS ---');

  // 1. Login user
  console.log('1. Logging in user...');
  const userLogin = await makeRequest('POST', '/api/auth/login', {
    identifier: 'rahul@gamer.com',
    password: 'password123',
  });
  if (userLogin.status !== 200) throw new Error('User login failed: ' + JSON.stringify(userLogin.data));
  const userToken = userLogin.data.token;
  const initialBalance = userLogin.data.user.wallet.depositPaise;
  console.log(`   User logged in: ${userLogin.data.user.username}, Deposit Balance: ₹${initialBalance / 100}`);

  // 2. Login admin
  console.log('2. Logging in admin...');
  const adminLogin = await makeRequest('POST', '/api/auth/login', {
    identifier: 'admin@battleesports.com',
    password: 'admin123',
  });
  if (adminLogin.status !== 200) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  const adminToken = adminLogin.data.token;
  console.log(`   Admin logged in: ${adminLogin.data.user.username}`);

  // 3. Test deposit minimum validation (< ₹10)
  console.log('3. Testing invalid deposit amount ₹5 (< ₹10)...');
  const invalidDep = await makeRequest(
    'POST',
    '/api/wallet/deposit/create',
    { amountPaise: 500, paymentMethod: 'UPI_QR' },
    userToken
  );
  if (invalidDep.status === 400) {
    console.log(`   ✓ Correctly rejected ₹5 deposit: "${invalidDep.data.error}"`);
  } else {
    throw new Error('Failed: Expected 400 for ₹5 deposit, got ' + invalidDep.status);
  }

  // 4. Test deposit maximum validation (> ₹2000)
  console.log('4. Testing invalid deposit amount ₹2500 (> ₹2000)...');
  const invalidMaxDep = await makeRequest(
    'POST',
    '/api/wallet/deposit/create',
    { amountPaise: 250000, paymentMethod: 'UPI_QR' },
    userToken
  );
  if (invalidMaxDep.status === 400) {
    console.log(`   ✓ Correctly rejected ₹2500 deposit: "${invalidMaxDep.data.error}"`);
  } else {
    throw new Error('Failed: Expected 400 for ₹2500 deposit, got ' + invalidMaxDep.status);
  }

  // 5. Create valid ₹10 deposit request
  console.log('5. Creating valid ₹10 deposit request...');
  const dep10 = await makeRequest(
    'POST',
    '/api/wallet/deposit/create',
    { amountPaise: 1000, paymentMethod: 'UPI_QR' },
    userToken
  );
  if (dep10.status !== 200) throw new Error('₹10 deposit creation failed: ' + JSON.stringify(dep10.data));
  const dep10Order = dep10.data.deposit;
  console.log(`   ✓ Created ₹10 order: ${dep10Order.id}`);
  console.log(`     Amount: ₹${dep10Order.amountPaise / 100}`);
  console.log(`     Status: ${dep10Order.status}`);
  console.log(`     ExpiresAt: ${dep10Order.expiresAt}`);
  console.log(`     UPI QR URI: ${dep10Order.qrPayload}`);
  if (!dep10Order.qrPayload.includes('am=10.00')) throw new Error('QR URI does not contain am=10.00!');
  if (!dep10Order.expiresAt) throw new Error('expiresAt is missing from deposit order!');

  // 6. Create valid ₹50 deposit request
  console.log('6. Creating valid ₹50 deposit request...');
  const dep50 = await makeRequest(
    'POST',
    '/api/wallet/deposit/create',
    { amountPaise: 5000, paymentMethod: 'UPI_QR' },
    userToken
  );
  if (dep50.status !== 200) throw new Error('₹50 deposit creation failed: ' + JSON.stringify(dep50.data));
  const dep50Order = dep50.data.deposit;
  console.log(`   ✓ Created ₹50 order: ${dep50Order.id}`);
  console.log(`     Amount: ₹${dep50Order.amountPaise / 100}`);
  console.log(`     Status: ${dep50Order.status}`);
  console.log(`     UPI QR URI: ${dep50Order.qrPayload}`);
  if (!dep50Order.qrPayload.includes('am=50.00')) throw new Error('QR URI does not contain am=50.00!');

  // 7. Submit 12-digit UTR for ₹10 deposit
  console.log('7. Submitting 12-digit UTR for ₹10 deposit...');
  const utrRes = await makeRequest(
    'POST',
    `/api/wallet/deposit/${dep10Order.id}/utr`,
    { utr: '409182736451' },
    userToken
  );
  if (utrRes.status !== 200) throw new Error('UTR submission failed: ' + JSON.stringify(utrRes.data));
  console.log(`   ✓ UTR attached: ${utrRes.data.deposit.utr}`);
  console.log(`     Status remains: ${utrRes.data.deposit.status}`);

  // 8. Expire the ₹50 deposit (simulating unpaid timeout or user cancellation)
  console.log('8. Expiring unpaid ₹50 deposit...');
  const expRes = await makeRequest(
    'POST',
    `/api/wallet/deposit/${dep50Order.id}/expire`,
    {},
    userToken
  );
  if (expRes.status !== 200) throw new Error('Deposit expiration failed: ' + JSON.stringify(expRes.data));
  console.log(`   ✓ ₹50 deposit marked as: ${expRes.data.deposit.status}`);

  // 9. Admin checks deposits list
  console.log('9. Admin fetching deposits list...');
  const adminDeps = await makeRequest('GET', '/api/admin/deposits', undefined, adminToken);
  if (adminDeps.status !== 200) throw new Error('Admin deposits fetch failed');
  const foundDep10 = adminDeps.data.deposits.find((d: any) => d.id === dep10Order.id);
  const foundDep50 = adminDeps.data.deposits.find((d: any) => d.id === dep50Order.id);
  if (!foundDep10) throw new Error('Admin could not find ₹10 deposit');
  if (!foundDep50) throw new Error('Admin could not find ₹50 deposit');
  console.log(`   ✓ Admin sees ₹10 deposit (${foundDep10.id}) with status ${foundDep10.status} and UTR ${foundDep10.utr}`);
  console.log(`   ✓ Admin sees ₹50 deposit (${foundDep50.id}) with status ${foundDep50.status}`);

  // 10. Admin approves ₹10 deposit
  console.log('10. Admin approving ₹10 deposit...');
  const approveRes = await makeRequest(
    'POST',
    `/api/admin/deposits/${dep10Order.id}/status`,
    { status: 'SUCCESSFUL', notes: 'Verified bank receipt' },
    adminToken
  );
  if (approveRes.status !== 200) throw new Error('Admin approve deposit failed: ' + JSON.stringify(approveRes.data));
  console.log(`   ✓ ₹10 deposit status updated to: ${approveRes.data.deposit.status}`);

  // 11. Check user wallet balance credited by exactly ₹10
  console.log('11. Checking user wallet balance credited...');
  const userMe = await makeRequest('GET', '/api/auth/me', undefined, userToken);
  const newBalance = userMe.data.user.wallet.depositPaise;
  const balanceDiff = newBalance - initialBalance;
  console.log(`   User new deposit balance: ₹${newBalance / 100} (credited: ₹${balanceDiff / 100})`);
  if (balanceDiff !== 1000) throw new Error(`Expected balance increase of 1000 paise (₹10), got ${balanceDiff}`);

  // 12. Check duplicate approval prevention
  console.log('12. Testing duplicate approval prevention...');
  const dupApprove = await makeRequest(
    'POST',
    `/api/admin/deposits/${dep10Order.id}/status`,
    { status: 'SUCCESSFUL', notes: 'Second try' },
    adminToken
  );
  const userMe2 = await makeRequest('GET', '/api/auth/me', undefined, userToken);
  if (userMe2.data.user.wallet.depositPaise !== newBalance) {
    throw new Error('Double credit occurred on duplicate approval!');
  }
  console.log('   ✓ Duplicate approval did not credit wallet twice!');

  console.log('--- ALL DEPOSIT PAYMENT FLOW TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
