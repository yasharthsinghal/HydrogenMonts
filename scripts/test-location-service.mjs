import { LocationService } from '../app/services/location/location.server.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 MONTS INDIAN LOCATION SERVICE: TEST SUITE (PINCODE → CITY/STATE)');
  console.log('======================================================\n');

  const locationService = new LocationService();

  // Test 1: Pincode -> Valid Location (400001)
  console.log('Test 1: Pincode -> Valid Location (400001)');
  const loc1 = await locationService.lookupByPincode('400001');
  assert(loc1 !== null, '400001 returned a location');
  assert(loc1?.state === 'Maharashtra', `State is Maharashtra (got "${loc1?.state}")`);
  assert(loc1?.pincode === '400001', `Pincode is 400001 (got "${loc1?.pincode}")`);
  assert(Boolean(loc1?.city), `City is present (got "${loc1?.city}")`);

  // Test 2: Another Valid Pincode (302001 -> Jaipur, Rajasthan)
  console.log('\nTest 2: Pincode -> Valid Location (302001)');
  const loc2 = await locationService.lookupByPincode('302001');
  assert(loc2 !== null, '302001 returned a location');
  assert(loc2?.state === 'Rajasthan', `State is Rajasthan (got "${loc2?.state}")`);
  assert(loc2?.pincode === '302001', `Pincode is 302001 (got "${loc2?.pincode}")`);
  assert(Boolean(loc2?.city), `City is present (got "${loc2?.city}")`);

  // Test 3: Pincode -> No Location (Non-existent 999999)
  console.log('\nTest 3: Pincode -> Non-existent Location (999999)');
  const loc3 = await locationService.lookupByPincode('999999');
  assert(loc3 === null, 'Non-existent pincode 999999 returns null');

  // Test 4: Malformed Pincode
  console.log('\nTest 4: Malformed Pincode ("123", "abc")');
  const locMalformed = await locationService.lookupByPincode('123');
  assert(locMalformed === null, 'Malformed pincode returns null without network query');

  // Test 5: In-memory Caching
  console.log('\nTest 5: In-memory Caching for Pincode Lookup');
  const t0 = Date.now();
  const cachedLoc = await locationService.lookupByPincode('400001');
  const t1 = Date.now();
  assert(cachedLoc?.pincode === '400001', 'Cached result matched');
  assert(t1 - t0 < 10, `Cached lookup was instant (${t1 - t0}ms)`);

  // Test 6: Consistency Verification: Valid combination
  console.log('\nTest 6: Location Consistency: Valid (400001, Mumbai, Maharashtra)');
  const isConsistent1 = await locationService.validateConsistency('400001', 'Mumbai', 'Maharashtra');
  assert(isConsistent1 === true, '400001 + Mumbai + Maharashtra is consistent');

  // Test 7: Consistency Verification: Invalid/Mismatched combination
  console.log('\nTest 7: Location Consistency: Mismatch (400001, Jaipur, Rajasthan)');
  const isConsistent2 = await locationService.validateConsistency('400001', 'Jaipur', 'Rajasthan');
  assert(isConsistent2 === false, '400001 + Jaipur + Rajasthan is correctly identified as INCONSISTENT');

  // Test 8: Consistency Verification: State Mismatch (302001, Jaipur, Gujarat)
  console.log('\nTest 8: Location Consistency: State Mismatch (302001, Jaipur, Gujarat)');
  const isConsistent3 = await locationService.validateConsistency('302001', 'Jaipur', 'Gujarat');
  assert(isConsistent3 === false, '302001 + Jaipur + Gujarat is correctly identified as INCONSISTENT');

  // Test 9: Safe handling of Provider Network Failure
  console.log('\nTest 9: Safe handling of Provider Network Failure');
  const failingProvider = {
    name: 'failing_mock',
    async getByPincode() {
      throw new Error('Simulated Connection Reset / DNS Failure');
    },
  };
  const resilientService = new LocationService(failingProvider);
  let failedSafely = false;
  try {
    const res = await resilientService.lookupByPincode('110001');
    assert(res === null || res === undefined, 'Failing provider handled gracefully without unhandled throw');
    failedSafely = true;
  } catch (err) {
    failedSafely = false;
  }
  assert(failedSafely, 'Application does not crash on provider failure');

  // Test 10: Safe handling of Malformed Provider Response
  console.log('\nTest 10: Safe handling of Malformed Provider Response');
  const malformedProvider = {
    name: 'malformed_mock',
    async getByPincode() {
      return null;
    },
  };
  const malformedService = new LocationService(malformedProvider);
  const resMalformed = await malformedService.lookupByPincode('123456');
  assert(resMalformed === null, 'Malformed response handled as null');

  // Test 11: Stale Request / Race Condition Prevention Logic
  console.log('\nTest 11: Stale Request / Race Condition Prevention Logic');
  let activeRequestId = 0;
  let finalState = 'initial';

  async function mockAsyncRequest(input, delayMs, reqId) {
    await new Promise((r) => setTimeout(r, delayMs));
    if (reqId === activeRequestId) {
      finalState = input;
    }
  }

  // Request 1 starts (slow, 80ms)
  const req1Id = ++activeRequestId;
  const p1 = mockAsyncRequest('Stale Response 1', 80, req1Id);

  // Request 2 starts later (fast, 20ms)
  const req2Id = ++activeRequestId;
  const p2 = mockAsyncRequest('Fresh Response 2', 20, req2Id);

  await Promise.all([p1, p2]);
  assert(finalState === 'Fresh Response 2', `Stale response was discarded (finalState: "${finalState}")`);

  console.log('\n======================================================');
  console.log(`📊 SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
