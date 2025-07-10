#!/usr/bin/env node

/**
 * Simple JSON test script for B2 upload functionality
 */

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

async function testUpload(token) {
    console.log(`⬆️  Testing JSON upload...`);
    
    const uploadUrl = `${SUPABASE_URL}/functions/v1/upload-media`;
    
    try {
        const testData = {
            target_type: 'chapter',
            target_id: 'test-chapter-123',
            language_entity_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba', // Nepali from seed data
            filename: 'test_audio.m4a',
            file_content: 'This is test audio content for B2 upload testing'
        };
        
        console.log(`🔍 Request details:`);
        console.log(`   URL: ${uploadUrl}`);
        console.log(`   Content-Type: application/json`);
        console.log(`   Data:`, testData);
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
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

async function main() {
    console.log("🚀 Starting B2 JSON Upload Test");
    console.log("=" + "=".repeat(49));
    
    try {
        // Step 1: Authenticate
        const token = await authenticateUser("sarah.johnson@example.com", "password123");
        if (!token) {
            return;
        }
        
        console.log();
        
        // Step 2: Test upload
        const uploadResult = await testUpload(token);
        if (uploadResult) {
            console.log();
            console.log("🎉 Test completed successfully!");
        } else {
            console.log();
            console.log("❌ Test failed");
        }
        
    } catch (error) {
        console.log(`💥 Unexpected error: ${error.message}`);
    }
}

main(); 