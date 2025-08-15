const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run(ids) {
  console.log('🧪 get-download-urls-by-id');
  const body = { mediaFileIds: ids, expirationHours: 1 };
  const { data, error } = await supabase.functions.invoke(
    'get-download-urls-by-id',
    { body }
  );
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  console.log('✅ Result:', JSON.stringify(data, null, 2));
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.log(
    'Usage: node scripts/api_tests/test_get_download_urls_by_id.cjs <id1> <id2> ...'
  );
  process.exit(1);
}

run(ids).catch(err => {
  console.error('💥 Exception:', err.message);
  process.exit(1);
});
