#!/usr/bin/env node

/**
 * Setup script for NPM package publishing
 * This script prepares the types package structure and validates configuration
 * @eslint-env node
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const packageJsonPath = 'package.json';
const typesDir = 'types';
const typesFile = path.join(typesDir, 'database.ts');

console.log('🔧 Setting up NPM package for @everylanguage/shared-types...\n');

/**
 * Check if required files exist
 */
function checkRequiredFiles() {
  console.log('📁 Checking required files...');
  
  const requiredFiles = [
    packageJsonPath,
    typesFile,
    'types/README.md'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  console.log('✅ All required files present\n');
}

/**
 * Validate package.json configuration
 */
function validatePackageJson() {
  console.log('📋 Validating package.json configuration...');
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredFields = {
    name: '@everylanguage/shared-types',
    main: 'types/database.js',
    types: 'types/database.d.ts'
  };

  let hasErrors = false;
  
  for (const [field, expectedValue] of Object.entries(requiredFields)) {
    if (packageJson[field] !== expectedValue) {
      console.error(`❌ package.json ${field} should be "${expectedValue}", got "${packageJson[field]}"`);
      hasErrors = true;
    }
  }

  if (!packageJson.exports || !packageJson.exports['.']) {
    console.error('❌ package.json missing exports configuration');
    hasErrors = true;
  }

  if (!packageJson.files || !packageJson.files.includes('types/database.d.ts')) {
    console.error('❌ package.json files array missing required type files');
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\n💡 Run the setup again after fixing package.json');
    process.exit(1);
  }
  
  console.log('✅ package.json configuration valid\n');
}

/**
 * Create types directory structure
 */
function createTypesStructure() {
  console.log('📁 Creating types directory structure...');
  
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
    console.log('   Created types/ directory');
  }

  // Check if database.ts exists and has content
  if (!fs.existsSync(typesFile)) {
    console.error('❌ database.ts not found. Run: npm run generate-types');
    process.exit(1);
  }
  
  const typesContent = fs.readFileSync(typesFile, 'utf8');
  if (typesContent.length < 100) {
    console.error('❌ database.ts appears empty. Run: npm run generate-types');
    process.exit(1);
  }
  
  console.log('✅ Types directory structure ready\n');
}

/**
 * Test the build process
 */
function testBuildProcess() {
  console.log('🔨 Testing build process...');
  
  try {
    // Test type checking
    console.log('   Testing TypeScript compilation...');
    execSync('npm run type-check', { stdio: 'pipe' });
    
    // Test types preparation
    console.log('   Testing types preparation...');
    execSync('npm run prepare-package', { stdio: 'pipe' });
    
    console.log('✅ Build process successful\n');
  } catch (error) {
    console.error('❌ Build process failed:');
    console.error(error.stdout?.toString() || error.message);
    console.error('\n💡 Fix the errors above and run setup again');
    process.exit(1);
  }
}

/**
 * Check NPM authentication
 */
function checkNpmAuth() {
  console.log('🔐 Checking NPM authentication...');
  
  try {
    const whoami = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
    console.log(`✅ Logged in to NPM as: ${whoami}\n`);
  } catch (error) {
    console.warn('⚠️  Not logged in to NPM');
    console.warn('   This is OK for CI/CD setup, but you\'ll need to login for manual publishing');
    console.warn('   Run: npm login\n');
  }
}

/**
 * Check if package name is available
 */
function checkPackageAvailability() {
  console.log('📦 Checking package name availability...');
  
  try {
    execSync('npm view @everylanguage/shared-types', { stdio: 'pipe' });
    console.log('ℹ️  Package @everylanguage/shared-types already exists');
    console.log('   This is expected if you\'ve published before\n');
  } catch (error) {
    console.log('✅ Package name @everylanguage/shared-types is available\n');
  }
}

/**
 * Display next steps
 */
function displayNextSteps() {
  console.log('🎉 NPM package setup complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Commit your changes: git add . && npm run commit');
  console.log('   2. Push to trigger CI/CD: git push');
  console.log('   3. Watch GitHub Actions for automatic publishing');
  console.log('');
  console.log('🔄 Manual publishing (for testing):');
  console.log('   npm run release');
  console.log('');
  console.log('📚 See docs/schema-changes-guide.md for complete workflow');
}

/**
 * Main setup function
 */
function main() {
  try {
    checkRequiredFiles();
    validatePackageJson();
    createTypesStructure();
    testBuildProcess();
    checkNpmAuth();
    checkPackageAvailability();
    displayNextSteps();
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main(); 