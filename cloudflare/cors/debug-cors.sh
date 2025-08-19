#!/bin/bash

# Debug CORS Issues with R2 Pre-signed URLs
# This helps isolate whether the issue is with CORS, pre-signed URLs, or frontend

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get parameters
ENVIRONMENT="${1:-dev}"
ORIGIN="${2:-http://localhost:5173}"
PRESIGNED_URL="${3}"

if [[ -z "$PRESIGNED_URL" ]]; then
    echo -e "${RED}❌ Usage: $0 <dev|prod> <origin> <presigned-url>${NC}"
    echo -e "${YELLOW}Example: $0 dev http://localhost:5173 'https://account.r2.cloudflarestorage.com/bucket/file?X-Amz-...'${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Debugging CORS with Pre-signed URL${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Origin: $ORIGIN${NC}"
echo -e "${YELLOW}URL: $PRESIGNED_URL${NC}"
echo ""

# Test 1: Direct GET without Origin (should work)
echo -e "${YELLOW}🧪 Test 1: Direct GET without CORS headers (baseline)${NC}"
echo "curl -s -o /dev/null -w '%{http_code}' '$PRESIGNED_URL'"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$PRESIGNED_URL")
if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "${GREEN}✅ Direct access works (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Direct access failed (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}This suggests the pre-signed URL itself is invalid${NC}"
fi
echo ""

# Test 2: GET with Origin header (CORS test)
echo -e "${YELLOW}🧪 Test 2: GET with Origin header (CORS)${NC}"
echo "curl -v -H 'Origin: $ORIGIN' '$PRESIGNED_URL'"
echo ""

CORS_RESPONSE=$(curl -v -H "Origin: $ORIGIN" "$PRESIGNED_URL" 2>&1)
echo "$CORS_RESPONSE"
echo ""

# Check for CORS headers in response
if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers found in response${NC}"
    ALLOW_ORIGIN=$(echo "$CORS_RESPONSE" | grep "Access-Control-Allow-Origin" | head -1)
    echo -e "${GREEN}$ALLOW_ORIGIN${NC}"
else
    echo -e "${RED}❌ No CORS headers in response${NC}"
    echo -e "${YELLOW}This suggests CORS policy isn't applying to pre-signed URLs${NC}"
fi
echo ""

# Test 3: OPTIONS preflight for comparison
echo -e "${YELLOW}🧪 Test 3: OPTIONS preflight (for comparison)${NC}"
BASE_URL=$(echo "$PRESIGNED_URL" | cut -d'?' -f1)
echo "curl -X OPTIONS -H 'Origin: $ORIGIN' -H 'Access-Control-Request-Method: GET' '$BASE_URL'"
echo ""

OPTIONS_RESPONSE=$(curl -v -X OPTIONS -H "Origin: $ORIGIN" -H "Access-Control-Request-Method: GET" "$BASE_URL" 2>&1)
echo "$OPTIONS_RESPONSE"
echo ""

# Summary
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "${YELLOW}1. Direct access (no CORS): HTTP $HTTP_CODE${NC}"

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}2. CORS GET request: Headers present ✅${NC}"
else
    echo -e "${RED}2. CORS GET request: No headers ❌${NC}"
fi

if echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}3. CORS preflight: Working ✅${NC}"
else
    echo -e "${RED}3. CORS preflight: Failed ❌${NC}"
fi

echo ""
echo -e "${BLUE}💡 Diagnosis:${NC}"

if [[ "$HTTP_CODE" != "200" ]]; then
    echo -e "${RED}• Pre-signed URL is invalid or expired${NC}"
elif echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin" && ! echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${YELLOW}• CORS works for preflight but not for actual requests${NC}"
    echo -e "${YELLOW}• This is likely a Cloudflare R2 + pre-signed URL limitation${NC}"
    echo -e "${YELLOW}• Solution: Route requests through your CDN Worker instead${NC}"
elif ! echo "$OPTIONS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${RED}• CORS policy not working at all${NC}"
    echo -e "${YELLOW}• Check if CORS deployment succeeded${NC}"
else
    echo -e "${GREEN}• Everything looks good - might be a browser/frontend issue${NC}"
fi
