import B2 from 'backblaze-b2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import process from 'process';
import console from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * B2 CORS Configuration Manager
 * Reads CORS configuration from JSON files and applies to B2 buckets
 */

// Environment variable mappings
const environmentConfig = {
  dev: {
    keyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    bucketName: process.env.B2_DEV_BUCKET_NAME,
    configFile: 'cors-config-dev.json',
  },
  prod: {
    keyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    bucketName: process.env.B2_PROD_BUCKET_NAME,
    configFile: 'cors-config-prod.json',
  },
};

/**
 * Load CORS configuration from JSON file
 */
function loadCorsConfig(environment) {
  const configPath = join(__dirname, environmentConfig[environment].configFile);

  try {
    const configContent = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    console.log(
      `📋 Loaded CORS config from: ${environmentConfig[environment].configFile}`
    );
    console.log(`🌐 Environment: ${config.environment}`);
    console.log(`📜 CORS rules: ${config.corsRules.length}`);

    return config.corsRules;
  } catch (error) {
    throw new Error(
      `Failed to load CORS config from ${configPath}: ${error.message}`
    );
  }
}

/**
 * Configure CORS for a specific environment
 */
async function configureCors(environment) {
  const config = environmentConfig[environment];

  if (!config.keyId || !config.applicationKey || !config.bucketName) {
    const missingVars = [];
    if (!config.keyId)
      missingVars.push(`B2_${environment.toUpperCase()}_KEY_ID or B2_KEY_ID`);
    if (!config.applicationKey)
      missingVars.push(
        `B2_${environment.toUpperCase()}_APPLICATION_KEY or B2_APPLICATION_KEY`
      );
    if (!config.bucketName)
      missingVars.push(`B2_${environment.toUpperCase()}_BUCKET_NAME`);

    throw new Error(
      `Missing B2 configuration for ${environment}: ${missingVars.join(', ')}`
    );
  }

  console.log(
    `🔧 Configuring CORS for ${environment.toUpperCase()} environment...`
  );
  console.log(`📦 Bucket: ${config.bucketName}`);

  // Load CORS configuration from JSON file
  const corsRules = loadCorsConfig(environment);

  // Show origins for this environment
  const allOrigins = corsRules.flatMap(rule => rule.allowedOrigins);
  console.log(`🌐 Allowed origins: ${allOrigins.join(', ')}`);

  // Initialize B2 client
  const b2 = new B2({
    applicationKeyId: config.keyId,
    applicationKey: config.applicationKey,
  });

  try {
    // Authorize with B2
    console.log('🔐 Authorizing with B2...');
    await b2.authorize();

    // Get bucket info
    console.log(`🔍 Finding bucket: ${config.bucketName}...`);
    const bucketResponse = await b2.getBucket({
      bucketName: config.bucketName,
    });

    // getBucket returns an array of buckets
    const bucket = bucketResponse.data.buckets[0];
    if (!bucket) {
      throw new Error(`Bucket "${config.bucketName}" not found`);
    }

    const bucketId = bucket.bucketId;
    console.log(`✅ Found bucket ID: ${bucketId}`);

    // Show current CORS rules
    if (bucket.corsRules && bucket.corsRules.length > 0) {
      console.log('📋 Current CORS rules:');
      bucket.corsRules.forEach((rule, index) => {
        console.log(`   ${index + 1}. ${rule.corsRuleName}`);
        console.log(`      Origins: ${rule.allowedOrigins.join(', ')}`);
        console.log(`      Operations: ${rule.allowedOperations.join(', ')}`);
      });
    } else {
      console.log('📋 No existing CORS rules found');
    }

    // Filter out rules that will be replaced (same corsRuleName)
    const configRuleNames = corsRules.map(rule => rule.corsRuleName);
    const existingRules = bucket.corsRules.filter(
      rule => !configRuleNames.includes(rule.corsRuleName)
    );

    // Combine existing rules with new configuration
    const finalCorsRules = [...existingRules, ...corsRules];

    console.log(
      `📋 Final CORS configuration: ${finalCorsRules.length} rule(s)`
    );

    // Update bucket with CORS rules
    console.log('🚀 Updating bucket CORS configuration...');
    const updateResponse = await b2.updateBucket({
      bucketId: bucketId,
      corsRules: finalCorsRules,
    });

    console.log('✅ CORS configuration updated successfully!');
    console.log('📊 Applied CORS rules:');
    updateResponse.data.corsRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.corsRuleName}`);
      console.log(`      Origins: ${rule.allowedOrigins.join(', ')}`);
      console.log(`      Operations: ${rule.allowedOperations.join(', ')}`);
      console.log(`      Max Age: ${rule.maxAgeSeconds}s`);
    });

    console.log(
      '⏳ Changes applied successfully! CORS may take 5-15 minutes to propagate globally.'
    );

    return {
      success: true,
      bucketId,
      corsRules: updateResponse.data.corsRules,
    };
  } catch (error) {
    console.error(
      `❌ Error configuring CORS for ${environment}:`,
      error.message
    );

    // Provide helpful error messages
    if (error.message.includes('unauthorized')) {
      console.error(
        '💡 Check that your B2 application key has the correct permissions:'
      );
      console.error('   - listBuckets');
      console.error('   - writeBuckets');
    }

    if (error.message.includes('bucket not found')) {
      console.error(
        `💡 Bucket "${config.bucketName}" not found. Please verify the bucket name.`
      );
    }

    throw error;
  }
}

/**
 * Verify CORS configuration
 */
async function verifyCors(environment) {
  const config = environmentConfig[environment];

  console.log(
    `🔍 Verifying CORS configuration for ${environment.toUpperCase()}...`
  );

  const b2 = new B2({
    applicationKeyId: config.keyId,
    applicationKey: config.applicationKey,
  });

  try {
    await b2.authorize();

    const bucketResponse = await b2.getBucket({
      bucketName: config.bucketName,
    });

    // getBucket returns an array of buckets
    const bucket = bucketResponse.data.buckets[0];
    if (!bucket) {
      throw new Error(`Bucket "${config.bucketName}" not found`);
    }

    const corsRules = bucket.corsRules || [];

    if (corsRules.length === 0) {
      console.log('⚠️  No CORS rules found');
      return false;
    }

    console.log(`✅ Found ${corsRules.length} CORS rule(s):`);
    corsRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.corsRuleName}`);
      console.log(`      Origins: ${rule.allowedOrigins.join(', ')}`);
      console.log(`      Operations: ${rule.allowedOperations.join(', ')}`);
      console.log(`      Max Age: ${rule.maxAgeSeconds}s`);
    });

    // Load expected config and verify key rules exist
    const expectedRules = loadCorsConfig(environment);
    const expectedRuleNames = expectedRules.map(rule => rule.corsRuleName);
    const actualRuleNames = corsRules.map(rule => rule.corsRuleName);

    const missingRules = expectedRuleNames.filter(
      name => !actualRuleNames.includes(name)
    );

    if (missingRules.length > 0) {
      console.log(
        `⚠️  Missing expected CORS rules: ${missingRules.join(', ')}`
      );
      return false;
    }

    console.log('✅ All expected CORS rules are present');
    return true;
  } catch (error) {
    console.error(`❌ Error verifying CORS: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1];

  if (!command || !environment) {
    console.log(
      'Usage: node backblaze/deployment/configure-cors.js <command> <environment>'
    );
    console.log('');
    console.log('Commands:');
    console.log('  configure  - Set up CORS rules for the environment');
    console.log('  verify     - Check current CORS configuration');
    console.log('');
    console.log('Environments:');
    console.log('  dev        - Development environment');
    console.log('  prod       - Production environment');
    console.log('');
    console.log('Examples:');
    console.log('  node backblaze/deployment/configure-cors.js configure dev');
    console.log('  node backblaze/deployment/configure-cors.js verify prod');
    console.log('');
    console.log('Configuration files:');
    console.log(
      '  backblaze/deployment/cors-config-dev.json   - Development CORS rules'
    );
    console.log(
      '  backblaze/deployment/cors-config-prod.json  - Production CORS rules'
    );
    process.exit(1);
  }

  if (!environmentConfig[environment]) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(
      `Available environments: ${Object.keys(environmentConfig).join(', ')}`
    );
    process.exit(1);
  }

  try {
    switch (command) {
      case 'configure':
        await configureCors(environment);
        break;

      case 'verify': {
        const hasValidCors = await verifyCors(environment);
        process.exit(hasValidCors ? 0 : 1);
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { configureCors, verifyCors, loadCorsConfig };
