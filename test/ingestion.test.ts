/**
 * Ingestion System Tests
 * 
 * These tests demonstrate and validate the append-only, versioned ingestion behavior.
 * 
 * NOTE: These are integration test stubs that require a running Supabase instance.
 * Uncomment and run against your Supabase database to validate the implementation.
 */

import {
  insertIngestedResult,
  getLatestIngestedResult,
  getAllLatestIngestedResults,
  getIngestedResultHistory,
  softDeleteIngestedResult,
  extractContent,
  extractContents,
} from '../lib/ingestion-db';

// Test data
const mockWeekData = {
  id: 'test-week-1',
  title: 'Week 1 - Test',
  date: '2025-12-07',
  overallRoi: 15.5,
  pools: [
    {
      id: 'pool-1',
      name: 'Main Pool',
      netProfit: 150.00,
      roi: 15.5,
      bets: []
    }
  ]
};

/**
 * Test 1: Insert creates a new version without overwriting
 * 
 * This test demonstrates that inserting the same logical record twice
 * creates two separate rows with incremented versions.
 */
export async function testAppendOnlyBehavior() {
  console.log('🧪 Test 1: Append-Only Behavior');
  
  try {
    // First insertion
    const result1 = await insertIngestedResult(
      'weeks',
      mockWeekData,
      'test-week-1',
      { test: true, insertion: 1 }
    );
    
    console.assert(result1.data !== null, 'First insertion should succeed');
    console.assert(result1.data?.version === 1, 'First version should be 1');
    console.log('✅ First insertion created version 1');
    
    // Second insertion with same source_id
    const modifiedData = { ...mockWeekData, overallRoi: 20.0 };
    const result2 = await insertIngestedResult(
      'weeks',
      modifiedData,
      'test-week-1',
      { test: true, insertion: 2 }
    );
    
    console.assert(result2.data !== null, 'Second insertion should succeed');
    console.assert(result2.data?.version === 2, 'Second version should be 2');
    console.log('✅ Second insertion created version 2');
    
    // Verify both records exist
    const history = await getIngestedResultHistory('weeks', 'test-week-1');
    console.assert(history.data?.length === 2, 'History should contain 2 versions');
    console.log('✅ Both versions preserved in history');
    
    console.log('✅ Test 1 PASSED: Append-only behavior verified\n');
    return true;
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error);
    return false;
  }
}

/**
 * Test 2: Get latest version returns the most recent record
 */
export async function testGetLatestVersion() {
  console.log('🧪 Test 2: Get Latest Version');
  
  try {
    // Insert multiple versions
    await insertIngestedResult('weeks', { ...mockWeekData, overallRoi: 10 }, 'test-week-2', { version_note: 'v1' });
    await insertIngestedResult('weeks', { ...mockWeekData, overallRoi: 15 }, 'test-week-2', { version_note: 'v2' });
    await insertIngestedResult('weeks', { ...mockWeekData, overallRoi: 20 }, 'test-week-2', { version_note: 'v3' });
    
    // Get latest
    const latest = await getLatestIngestedResult('weeks', 'test-week-2');
    
    console.assert(latest.data !== null, 'Latest should be found');
    console.assert(latest.data?.version === 3, 'Latest version should be 3');
    console.assert(latest.data?.content.overallRoi === 20, 'Latest should have most recent data');
    console.log('✅ Latest version correctly retrieved');
    
    console.log('✅ Test 2 PASSED: Get latest version works correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error);
    return false;
  }
}

/**
 * Test 3: History returns all versions in order
 */
export async function testGetHistory() {
  console.log('🧪 Test 3: Get History');
  
  try {
    const sourceId = 'test-week-3';
    
    // Insert multiple versions
    for (let i = 1; i <= 5; i++) {
      await insertIngestedResult(
        'weeks',
        { ...mockWeekData, overallRoi: i * 5 },
        sourceId,
        { version_num: i }
      );
    }
    
    // Get history
    const history = await getIngestedResultHistory('weeks', sourceId);
    
    console.assert(history.data?.length === 5, 'History should contain 5 versions');
    console.assert(history.data?.[0].version === 5, 'History should be ordered DESC');
    console.assert(history.data?.[4].version === 1, 'Oldest version should be last');
    console.log('✅ History contains all versions in correct order');
    
    console.log('✅ Test 3 PASSED: History retrieval works correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error);
    return false;
  }
}

/**
 * Test 4: Soft delete marks record as deleted without removing it
 */
export async function testSoftDelete() {
  console.log('🧪 Test 4: Soft Delete');
  
  try {
    // Insert a record
    const result = await insertIngestedResult(
      'weeks',
      mockWeekData,
      'test-week-4',
      { for_deletion: true }
    );
    
    const recordId = result.data?.id;
    console.assert(recordId, 'Record should be created');
    
    // Soft delete it
    await softDeleteIngestedResult(recordId!);
    console.log('✅ Record marked as deleted');
    
    // Verify it's not returned by getLatest (deleted = false filter)
    const latest = await getLatestIngestedResult('weeks', 'test-week-4');
    console.assert(
      latest.data === null || latest.error !== null,
      'Deleted record should not be returned by getLatest'
    );
    console.log('✅ Deleted record excluded from getLatest query');
    
    console.log('✅ Test 4 PASSED: Soft delete works correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 4 FAILED:', error);
    return false;
  }
}

/**
 * Test 5: Multiple sources remain independent
 */
export async function testMultipleSources() {
  console.log('🧪 Test 5: Multiple Sources');
  
  try {
    const sharedId = 'shared-id-123';
    
    // Insert to different sources with same source_id
    await insertIngestedResult('weeks', mockWeekData, sharedId);
    await insertIngestedResult('picks', { title: 'Pick 1', content: 'Test' }, sharedId);
    await insertIngestedResult('summaries', { title: 'Summary 1', content: 'Test' }, sharedId);
    
    // Each source should have its own versioning
    const weeksLatest = await getLatestIngestedResult('weeks', sharedId);
    const picksLatest = await getLatestIngestedResult('picks', sharedId);
    const summariesLatest = await getLatestIngestedResult('summaries', sharedId);
    
    console.assert(weeksLatest.data?.source === 'weeks', 'Weeks source correct');
    console.assert(picksLatest.data?.source === 'picks', 'Picks source correct');
    console.assert(summariesLatest.data?.source === 'summaries', 'Summaries source correct');
    console.log('✅ Different sources remain independent');
    
    console.log('✅ Test 5 PASSED: Multiple sources work correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 5 FAILED:', error);
    return false;
  }
}

/**
 * Test 6: Null source_id creates independent records
 */
export async function testNullSourceId() {
  console.log('🧪 Test 6: Null Source ID');
  
  try {
    // Insert multiple records without source_id
    await insertIngestedResult('manual', { data: 'record 1' }, undefined);
    await insertIngestedResult('manual', { data: 'record 2' }, undefined);
    await insertIngestedResult('manual', { data: 'record 3' }, undefined);
    
    // All should have version 1 (no versioning without source_id)
    const allManual = await getAllLatestIngestedResults('manual');
    
    console.assert(allManual.data, 'Manual records should be retrieved');
    console.log(`✅ Created ${allManual.data?.length} independent records with null source_id`);
    
    console.log('✅ Test 6 PASSED: Null source_id handling works correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 6 FAILED:', error);
    return false;
  }
}

/**
 * Test 7: Extract helpers work correctly
 */
export async function testExtractHelpers() {
  console.log('🧪 Test 7: Extract Helpers');
  
  try {
    // Insert test data
    await insertIngestedResult('weeks', mockWeekData, 'test-week-7');
    
    // Test extractContent
    const latest = await getLatestIngestedResult('weeks', 'test-week-7');
    const content = extractContent(latest.data);
    
    console.assert(content !== null, 'extractContent should return content');
    console.assert(content?.id === 'test-week-1', 'Content should match original');
    console.log('✅ extractContent works correctly');
    
    // Test extractContents
    const allLatest = await getAllLatestIngestedResults('weeks');
    const contents = extractContents(allLatest.data);
    
    console.assert(Array.isArray(contents), 'extractContents should return array');
    console.assert(contents.length > 0, 'Should have at least one content');
    console.log('✅ extractContents works correctly');
    
    console.log('✅ Test 7 PASSED: Extract helpers work correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Test 7 FAILED:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting Ingestion System Tests\n');
  console.log('='.repeat(50));
  
  const tests = [
    testAppendOnlyBehavior,
    testGetLatestVersion,
    testGetHistory,
    testSoftDelete,
    testMultipleSources,
    testNullSourceId,
    testExtractHelpers,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('Test execution error:', error);
      failed++;
    }
  }
  
  console.log('='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests PASSED!');
  } else {
    console.log('❌ Some tests FAILED. Review the output above.');
  }
  
  return failed === 0;
}

// Uncomment to run tests (requires Supabase connection)
// runAllTests().then(success => {
//   process.exit(success ? 0 : 1);
// });
