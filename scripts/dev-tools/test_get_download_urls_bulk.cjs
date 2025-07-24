const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate realistic fake file paths based on your schema
function generateTestFilePaths(count) {
  const books = ['gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', 'mat', 'mrk'];
  const paths = [];
  
  for (let i = 0; i < count; i++) {
    const book = books[i % books.length];
    const chapter = Math.floor(i / books.length) + 1;
    const fileNum = (i % 3) + 1; // Some chapters have multiple files
    paths.push(`audio/${book}-${chapter.toString().padStart(2, '0')}-${fileNum}.mp3`);
  }
  
  return paths;
}

// Test function with timing and error monitoring
async function testBulkDownloadUrls(fileCount, testName) {
  console.log(`\n🧪 ${testName}: Testing ${fileCount} files`);
  console.log('━'.repeat(50));
  
  const filePaths = generateTestFilePaths(fileCount);
  const startTime = Date.now();
  
  try {
    console.log(`📤 Sending request with ${fileCount} files...`);
    
    const { data, error } = await supabase.functions.invoke('get-download-urls', {
      body: {
        filePaths,
        expirationHours: 24
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (error) {
      console.log(`❌ ERROR: ${error.message}`);
      return { success: false, duration, error: error.message };
    }
    
    // Analyze results
    const successRate = (data.successfulUrls / data.totalFiles) * 100;
    const avgTimePerFile = duration / fileCount;
    
    console.log(`✅ SUCCESS in ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.log(`📊 Results:`);
    console.log(`   • Total files: ${data.totalFiles}`);
    console.log(`   • Successful URLs: ${data.successfulUrls}`);
    console.log(`   • Failed files: ${data.failedFiles?.length || 0}`);
    console.log(`   • Success rate: ${successRate.toFixed(1)}%`);
    console.log(`   • Avg time per file: ${avgTimePerFile.toFixed(1)}ms`);
    console.log(`   • URLs expire in: ${(data.expiresIn/3600).toFixed(1)} hours`);
    
    if (data.failedFiles?.length > 0) {
      console.log(`⚠️  Failed files sample:`, data.failedFiles.slice(0, 3));
      console.log(`⚠️  Error samples:`, Object.entries(data.errors || {}).slice(0, 2));
    }
    
    // Performance warnings
    if (duration > 60000) { // > 1 minute
      console.log(`⚠️  WARNING: Request took over 1 minute`);
    }
    if (duration > 120000) { // > 2 minutes  
      console.log(`🚨 CRITICAL: Request took over 2 minutes (approaching timeout limit)`);
    }
    if (successRate < 95) {
      console.log(`⚠️  WARNING: Success rate below 95%`);
    }
    
    return { 
      success: true, 
      duration, 
      fileCount, 
      successfulUrls: data.successfulUrls,
      failedFiles: data.failedFiles?.length || 0,
      successRate,
      avgTimePerFile 
    };
    
  } catch (err) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`💥 EXCEPTION after ${duration}ms: ${err.message}`);
    return { success: false, duration, error: err.message };
  }
}

// Progressive testing with increasing batch sizes
async function runProgressiveTests() {
  console.log('🚀 BULK DOWNLOAD URLS TEST SUITE');
  console.log('='.repeat(50));
  
  const testSizes = [
    { count: 100, name: 'Baseline Test' },
    { count: 500, name: 'Medium Batch' },
    { count: 1000, name: 'Large Batch' },
    { count: 1189, name: 'Bible Size (Real World)' },
    { count: 1500, name: 'Extended Test' },
    { count: 2000, name: 'Maximum Capacity' }
  ];
  
  const results = [];
  
  for (const test of testSizes) {
    const result = await testBulkDownloadUrls(test.count, test.name);
    results.push(result);
    
    // Stop testing if we hit a major failure
    if (!result.success && result.error?.includes('timeout')) {
      console.log(`\n🛑 Stopping tests due to timeout. Max reliable batch size: ${results[results.length-2]?.fileCount || 'unknown'}`);
      break;
    }
    
    // Give server a moment to recover between tests
    if (test.count >= 1000) {
      console.log('⏳ Waiting 3s before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Summary report
  console.log('\n📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  
  if (successful.length > 0) {
    console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
    console.log(`📊 Performance trends:`);
    
    successful.forEach(result => {
      const timeIndicator = result.duration > 60000 ? '🐌' : result.duration > 30000 ? '⚠️' : '⚡';
      console.log(`   ${timeIndicator} ${result.fileCount} files: ${(result.duration/1000).toFixed(1)}s (${result.avgTimePerFile.toFixed(1)}ms/file, ${result.successRate.toFixed(1)}% success)`);
    });
    
    const maxSuccessful = Math.max(...successful.map(r => r.fileCount));
    console.log(`\n🎯 RECOMMENDATION: Max reliable batch size appears to be ${maxSuccessful} files`);
    
    if (maxSuccessful >= 1189) {
      console.log(`✅ Your Bible use case (1189 files) should work fine!`);
    } else {
      console.log(`⚠️  You may need frontend batching for full Bible downloads`);
    }
  } else {
    console.log(`❌ All tests failed. Check your function deployment and B2 configuration.`);
  }
}

// Test with real data from your database (optional)
async function testWithRealData() {
  console.log('\n🔄 Testing with real database data...');
  
  try {
    // Get media files from your database
    const { data: mediaFiles, error } = await supabase
      .from('media_files')
      .select('remote_path')
      .not('remote_path', 'is', null)
      .limit(100); // Start small with real data
    
    if (error) {
      console.log(`❌ Database error: ${error.message}`);
      return;
    }
    
    if (mediaFiles.length === 0) {
      console.log(`⚠️  No media files found in database with remote_path`);
      return;
    }
    
    console.log(`📁 Found ${mediaFiles.length} real media files`);
    const realPaths = mediaFiles.map(f => f.remote_path);
    
    const result = await testBulkDownloadUrls(realPaths.length, 'Real Data Test');
    
    if (result.success) {
      console.log(`✅ Real data test successful! Your B2 integration is working.`);
    } else {
      console.log(`❌ Real data test failed. Check your B2 configuration.`);
    }
    
  } catch (err) {
    console.log(`💥 Real data test error: ${err.message}`);
  }
}

// Main execution
async function main() {
  try {
    // Check if edge function is accessible
    console.log('🔍 Checking edge function accessibility...');
    const { error: pingError } = await supabase.functions.invoke('get-download-urls', {
      body: { filePaths: ['test.mp3'] }
    });
    
    if (pingError && pingError.message.includes('Method not allowed')) {
      console.log('❌ Edge function not found or not running');
      console.log('💡 Make sure to run: supabase functions serve');
      return;
    }
    
    console.log('✅ Edge function is accessible\n');
    
    // Run the progressive tests
    await runProgressiveTests();
    
    // Optionally test with real data
    const useRealData = process.argv.includes('--real-data');
    if (useRealData) {
      await testWithRealData();
    } else {
      console.log('\n💡 Add --real-data flag to test with actual database files');
    }
    
  } catch (error) {
    console.error('💥 Test suite error:', error.message);
  }
}

// Handle CLI execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testBulkDownloadUrls, generateTestFilePaths }; 