#!/bin/bash

# Get auth token first
echo "🔐 Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST \
  "https://sjczwtpnjbmscxoszlyi.supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY3p3dHBuamJtc2N4b3N6bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExODE2MjcsImV4cCI6MjA2Njc1NzYyN30.XqaYmc7WPXeF_eASoxHUUMIok8a1OStmfmGL2a5qnAo" \
  -d '{
    "email": "sarah.johnson@example.com",
    "password": "password123"
  }')

# Extract token
ACCESS_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get auth token"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo "✅ Auth token obtained"

# Test upload with curl
echo "⬆️  Testing upload with curl..."
UPLOAD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "https://sjczwtpnjbmscxoszlyi.supabase.co/functions/v1/upload-media" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@test_curl.m4a" \
  -F "filename=test_curl.m4a" \
  -F "language_entity_id=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba")

# Parse response
HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | tail -n1 | sed 's/HTTP_STATUS://')
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

echo "📤 Upload response: $HTTP_STATUS"
echo "📋 Response body: $RESPONSE_BODY"

# Cleanup
rm -f test_curl.m4a

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Upload successful!"
else
  echo "❌ Upload failed"
fi 