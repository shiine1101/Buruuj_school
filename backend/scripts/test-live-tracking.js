const http = require('http');

const BASE = 'http://localhost:4000/api';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  LIVE TRACKING END-TO-END TEST');
  console.log('========================================\n');

  // Step 1: Login as driver
  console.log('STEP 1: Login as Driver (driver@buruuj.school)');
  const login = await request('POST', '/auth/login', { usernameOrEmail: 'driver@buruuj.school', password: 'driver123' });
  console.log(`  Status: ${login.status}`);
  if (login.status !== 201 && login.status !== 200) {
    // try username
    const login2 = await request('POST', '/auth/login', { usernameOrEmail: 'driver', password: 'driver123' });
    console.log(`  Retry with username: ${login2.status}`);
    if (login2.status !== 201 && login2.status !== 200) {
      console.log('  LOGIN FAILED:', JSON.stringify(login2.data));
      return;
    }
    Object.assign(login, login2);
  }
  const token = login.data.accessToken;
  const user = login.data.user;
  console.log(`  ✅ Logged in as: ${user.fullName} (role: ${user.role})`);
  console.log(`  Token: ${token.substring(0, 40)}...`);

  // Step 2: Check current driver session
  console.log('\nSTEP 2: Check Driver Session');
  const session = await request('GET', '/live-tracking/driver-session', null, token);
  console.log(`  Status: ${session.status}`);
  if (session.data && session.data.id) {
    console.log(`  📍 Active Session Found: id=${session.data.id}, status=${session.data.status}`);
    console.log(`     Bus: ${session.data.bus?.busNumber}, Started: ${session.data.startTime}`);
  } else {
    console.log(`  No active session found.`);
  }

  // Step 3: Try End Route (should work if active session exists)
  console.log('\nSTEP 3: POST /live-tracking/end-route');
  const endRoute = await request('POST', '/live-tracking/end-route', null, token);
  console.log(`  Status: ${endRoute.status}`);
  if (endRoute.status === 200 || endRoute.status === 201) {
    console.log(`  ✅ Route ENDED successfully!`);
    console.log(`  Session: id=${endRoute.data.id}, status=${endRoute.data.status}, endTime=${endRoute.data.endTime}`);
  } else {
    console.log(`  ❌ End Route FAILED:`, JSON.stringify(endRoute.data));
  }

  // Step 4: Check session again (should be null now)
  console.log('\nSTEP 4: Check Driver Session (should be empty now)');
  const session2 = await request('GET', '/live-tracking/driver-session', null, token);
  console.log(`  Status: ${session2.status}`);
  if (!session2.data || !session2.data.id) {
    console.log(`  ✅ No active session — route was ended correctly.`);
  } else {
    console.log(`  ⚠️  Session still active: ${JSON.stringify(session2.data?.id)}`);
  }

  // Step 5: Start a new route
  console.log('\nSTEP 5: POST /live-tracking/start-route (start fresh)');
  const startRoute = await request('POST', '/live-tracking/start-route', null, token);
  console.log(`  Status: ${startRoute.status}`);
  if (startRoute.status === 200 || startRoute.status === 201) {
    console.log(`  ✅ Route STARTED successfully!`);
    console.log(`  Session: id=${startRoute.data.id}, status=${startRoute.data.status}`);
    console.log(`  Bus: ${startRoute.data.bus?.busNumber}, Driver: ${startRoute.data.driver?.fullName}`);
  } else {
    console.log(`  ❌ Start Route FAILED:`, JSON.stringify(startRoute.data));
  }

  // Step 6: Send a GPS location update
  console.log('\nSTEP 6: POST /live-tracking/location (GPS update)');
  const loc = await request('POST', '/live-tracking/location', {
    latitude: 2.0469, longitude: 45.3182, speed: 12.5, heading: 90, accuracy: 5
  }, token);
  console.log(`  Status: ${loc.status}`);
  if (loc.status === 200 || loc.status === 201) {
    console.log(`  ✅ Location recorded: lat=${loc.data.latitude}, lng=${loc.data.longitude}, speed=${loc.data.speedKmh?.toFixed(1)} km/h, status=${loc.data.status}`);
  } else {
    console.log(`  ❌ Location update FAILED:`, JSON.stringify(loc.data));
  }

  // Step 7: End the newly created route
  console.log('\nSTEP 7: POST /live-tracking/end-route (end the new session)');
  const endRoute2 = await request('POST', '/live-tracking/end-route', null, token);
  console.log(`  Status: ${endRoute2.status}`);
  if (endRoute2.status === 200 || endRoute2.status === 201) {
    console.log(`  ✅ Route ENDED successfully!`);
  } else {
    console.log(`  ❌ End Route FAILED:`, JSON.stringify(endRoute2.data));
  }

  // Step 8: Get admin active routes (check driver visibility)
  console.log('\nSTEP 8: Login as ADMIN and check active routes');
  const adminLogin = await request('POST', '/auth/login', { usernameOrEmail: 'admin', password: 'admin123' });
  console.log(`  Admin login status: ${adminLogin.status}`);
  if (adminLogin.status === 200 || adminLogin.status === 201) {
    const adminToken = adminLogin.data.accessToken;
    console.log(`  ✅ Logged in as: ${adminLogin.data.user?.fullName} (role: ${adminLogin.data.user?.role})`);

    // Start a fresh route as driver first
    const startFresh = await request('POST', '/live-tracking/start-route', null, token);
    console.log(`\n  Re-starting driver route: ${startFresh.status === 200 || startFresh.status === 201 ? '✅' : '❌'}`);

    const activeRoutes = await request('GET', '/live-tracking/active', null, adminToken);
    console.log(`  GET /live-tracking/active status: ${activeRoutes.status}`);
    if (activeRoutes.status === 200) {
      console.log(`  Active buses visible to admin: ${activeRoutes.data.length}`);
      activeRoutes.data.forEach((r, i) => {
        console.log(`    [${i+1}] Bus: ${r.busNumber}, Driver: ${r.driverName}, Status: ${r.status}, Session: ${r.sessionId}`);
      });
    }

    const dashboard = await request('GET', '/live-tracking/dashboard', null, adminToken);
    console.log(`\n  GET /live-tracking/dashboard status: ${dashboard.status}`);
    if (dashboard.status === 200) {
      console.log(`  Dashboard stats:`, JSON.stringify(dashboard.data));
    }
  }

  console.log('\n========================================');
  console.log('  TEST COMPLETE');
  console.log('========================================');
}

main().catch(console.error);
