#!/usr/bin/env node

/**
 * Test script for B2 upload functionality using Node.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = "https://sjczwtpnjbmscxoszlyi.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo";

async function authenticateUser(email, password) {
    console.log(`🔐 Authenticating user: ${email}`);
    
    const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    
    try {
        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (response.ok) {
            const authData = await response.json();
            console.log(`✅ Authentication successful!`);
            console.log(`   User: ${authData.user.email}`);
            console.log(`   Token expires at: ${authData.expires_at || 'N/A'}`);
            return authData.access_token;
        } else {
            const errorText = await response.text();
            console.log(`❌ Authentication failed: ${response.status}`);
            console.log(`   Response: ${errorText}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Authentication error: ${error.message}`);
        return null;
    }
}

function createTestFile() {
    console.log("📁 Creating test file...");
    const testContent = "This is a test audio file content for B2 upload testing";
    const filePath = "test_audio.m4a";
    
    fs.writeFileSync(filePath, testContent);
    console.log(`✅ Test file created: ${filePath}`);
    return filePath;
}

async function uploadFile(token, filePath) {
    console.log(`⬆️  Uploading file: ${filePath}`);
    
    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;
    
    try {
        // Create FormData for multipart upload
        const FormData = require('form-data');
        const form = new FormData();
        
        // Add file
        form.append('file', fs.createReadStream(filePath), {
            filename: 'test_audio.m4a',
            contentType: 'audio/m4a'
        });
        
        // Add other form fields
        form.append('target_type', 'chapter');
        form.append('target_id', 'test-chapter-123');
        form.append('language_entity_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba'); // Nepali from seed data
        
        console.log(`🔍 Request details:`);
        console.log(`   URL: ${uploadUrl}`);
        console.log(`   Authorization: Bearer ${token.substring(0, 20)}...`);
        console.log(`   Content-Type: ${form.getHeaders()['content-type']}`);
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            body: form
        });

        console.log(`📤 Upload response: ${response.status}`);
        
        const responseText = await response.text();
        console.log(`📋 Response body: ${responseText}`);
        
        if (response.ok) {
            try {
                const result = JSON.parse(responseText);
                console.log("✅ Upload successful!");
                console.log(`   Media File ID: ${result.data?.mediaFileId || 'N/A'}`);
                console.log(`   Download URL: ${result.data?.downloadUrl || 'N/A'}`);
                console.log(`   File Size: ${result.data?.fileSize || 'N/A'}`);
                return result;
            } catch (parseError) {
                console.log(`❌ Failed to parse response as JSON: ${parseError.message}`);
                return null;
            }
        } else {
            console.log(`❌ Upload failed: ${response.status}`);
            try {
                const errorData = JSON.parse(responseText);
                console.log(`   Error: ${errorData.error || 'Unknown error'}`);
                console.log(`   Details: ${errorData.details || 'No details'}`);
                console.log(`   Code: ${errorData.code || 'No code'}`);
            } catch (parseError) {
                console.log(`   Raw response: ${responseText}`);
            }
            return null;
        }
    } catch (error) {
        console.log(`❌ Upload error: ${error.message}`);
        return null;
    }
}

async function testDownload(token, mediaFileId) {
    console.log(`⬇️  Testing download for media file: ${mediaFileId}`);
    
    const downloadUrl = `${SUPABASE_URL}/functions/v1/get-media?media_file_id=${mediaFileId}`;
    
    try {
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`📥 Download response: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ Download URL generated!");
            console.log(`   Download URL: ${result.download_url || 'N/A'}`);
            console.log(`   Expires at: ${result.expires_at || 'N/A'}`);
            return result;
        } else {
            const errorText = await response.text();
            console.log(`❌ Download failed: ${response.status}`);
            console.log(`   Response: ${errorText}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Download error: ${error.message}`);
        return null;
    }
}

function cleanup() {
    console.log("🧹 Cleaning up...");
    try {
        fs.unlinkSync("test_audio.m4a");
        console.log("✅ Test file removed");
    } catch (error) {
        // File doesn't exist, that's okay
    }
}

async function main() {
    console.log("🚀 Starting B2 Upload Test");
    console.log("=" + "=".repeat(49));
    
    try {
        // Step 1: Authenticate
        const token = await authenticateUser("sarah.johnson@example.com", "password123");
        if (!token) {
            return;
        }
        
        console.log();
        
        // Step 2: Create test file
        const filePath = createTestFile();
        
        console.log();
        
        // Step 3: Upload file
        const uploadResult = await uploadFile(token, filePath);
        if (!uploadResult) {
            return;
        }
        
        console.log();
        
        // Step 4: Test download (if upload succeeded)
        if (uploadResult && uploadResult.data?.mediaFileId) {
            await testDownload(token, uploadResult.data.mediaFileId);
        }
        
        console.log();
        console.log("🎉 Test completed successfully!");
        
    } catch (error) {
        console.log(`❌ Test failed with error: ${error.message}`);
    } finally {
        cleanup();
    }
}

// Check if form-data module is available
try {
    require('form-data');
    main();
} catch (error) {
    console.log("❌ Missing 'form-data' module. Please install it:");
    console.log("   npm install form-data");
    console.log("   Then run: node test_upload.cjs");
} 