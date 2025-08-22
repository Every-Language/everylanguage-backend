const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://sjczwtpnjbmscxoszlyi.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run(mediaFileIds, imageIds, expirationHours = 1, originalFilenames) {
  console.log('🧪 get-upload-urls-by-id');
  const body = { 
    mediaFileIds: mediaFileIds.length > 0 ? mediaFileIds : undefined,
    imageIds: imageIds.length > 0 ? imageIds : undefined,
    expirationHours,
    originalFilenames: originalFilenames && Object.keys(originalFilenames).length > 0 ? originalFilenames : undefined
  };
  
  console.log('📤 Request body:', JSON.stringify(body, null, 2));
  
  const { data, error } = await supabase.functions.invoke(
    'get-upload-urls-by-id',
    { body }
  );
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Result:', JSON.stringify(data, null, 2));
  
  // Additional validation
  if (data?.media) {
    console.log(`📁 Media files: ${data.media.length} upload URLs generated`);
    data.media.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id}, Key: ${item.objectKey}, Expires in: ${item.expiresIn}s`);
    });
  }
  
  if (data?.images) {
    console.log(`🖼️  Images: ${data.images.length} upload URLs generated`);
    data.images.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id}, Key: ${item.objectKey}, Expires in: ${item.expiresIn}s`);
    });
  }
  
  if (data?.errors) {
    console.log('⚠️  Errors encountered:');
    Object.entries(data.errors).forEach(([id, error]) => {
      console.log(`  ${id}: ${error}`);
    });
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const mediaFileIds = [];
  const imageIds = [];
  let expirationHours = 1;
  const originalFilenames = {};
  let currentType = 'media'; // default to media files
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--media' || arg === '-m') {
      currentType = 'media';
    } else if (arg === '--images' || arg === '-i') {
      currentType = 'images';
    } else if (arg === '--expiration' || arg === '-e') {
      expirationHours = parseInt(args[++i], 10) || 1;
    } else if (arg === '--filename' || arg === '-f') {
      // Parse ID=filename pairs: --filename id1=file1.mp3 id2=file2.mp3
      i++; // move to next arg
      while (i < args.length && !args[i].startsWith('--')) {
        const pair = args[i];
        if (pair.includes('=')) {
          const [id, filename] = pair.split('=', 2);
          originalFilenames[id] = filename;
        }
        i++;
      }
      i--; // back up one since loop will increment
    } else {
      // Treat as ID
      if (currentType === 'media') {
        mediaFileIds.push(arg);
      } else {
        imageIds.push(arg);
      }
    }
  }
  
  return { mediaFileIds, imageIds, expirationHours, originalFilenames };
}

function showUsage() {
  console.log(`Usage: node scripts/api_tests/test_get_upload_urls_by_id.cjs [options] <id1> <id2> ...

Options:
  --media, -m          Treat following IDs as media file IDs (default)
  --images, -i         Treat following IDs as image IDs
  --expiration, -e     Set expiration hours (default: 1)
  --filename, -f       Map IDs to original filenames (id1=file1.mp3 id2=file2.jpg)

Examples:
  # Test media files only
  node scripts/api_tests/test_get_upload_urls_by_id.cjs media_id_1 media_id_2

  # Test images only
  node scripts/api_tests/test_get_upload_urls_by_id.cjs --images image_id_1 image_id_2

  # Test both media files and images
  node scripts/api_tests/test_get_upload_urls_by_id.cjs --media media_id_1 --images image_id_1 image_id_2

  # Set custom expiration
  node scripts/api_tests/test_get_upload_urls_by_id.cjs --expiration 6 media_id_1

  # With original filenames for specific IDs
  node scripts/api_tests/test_get_upload_urls_by_id.cjs --filename media_id_1=audio.mp3 media_id_2=video.mp4 media_id_1 media_id_2

  # Mixed media and images with filenames
  node scripts/api_tests/test_get_upload_urls_by_id.cjs --media media_id_1 --images image_id_1 --filename media_id_1=audio.mp3 image_id_1=cover.jpg`);
}

const { mediaFileIds, imageIds, expirationHours, originalFilenames } = parseArgs();

if (mediaFileIds.length === 0 && imageIds.length === 0) {
  showUsage();
  process.exit(1);
}

run(mediaFileIds, imageIds, expirationHours, originalFilenames).catch(err => {
  console.error('💥 Exception:', err.message);
  process.exit(1);
});
