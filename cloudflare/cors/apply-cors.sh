#!/bin/bash

# Apply CORS Policies to R2 Buckets using AWS CLI
# Works with the standalone CORS policy JSON files
# Uses environment-specific R2 credentials for better security

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Determine environment
ENVIRONMENT="${1:-dev}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
    echo -e "${RED}❌ Usage: $0 <dev|prod>${NC}"
    echo -e "${YELLOW}Environment must be 'dev' or 'prod'${NC}"
    exit 1
fi

ENVIRONMENT_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
echo -e "${BLUE}🚀 Applying CORS policies for $ENVIRONMENT_UPPER environment${NC}"

# Set bucket names
if [[ "$ENVIRONMENT" == "dev" ]]; then
    BUCKET_NAME="el-backend-dev-media-files"
    CORS_FILE="dev-cors-policy.json"
else
    BUCKET_NAME="el-backend-prod-media-files"
    CORS_FILE="prod-cors-policy.json"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_CONFIG_PATH="$SCRIPT_DIR/$CORS_FILE"

echo -e "${YELLOW}📦 Target bucket: $BUCKET_NAME${NC}"
echo -e "${YELLOW}📋 CORS config file: $CORS_CONFIG_PATH${NC}"

# Validate environment variables
if [[ -z "$R2_ACCESS_KEY_ID" || -z "$R2_SECRET_ACCESS_KEY" || -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    [[ -z "$R2_ACCESS_KEY_ID" ]] && echo -e "${RED}  - R2_ACCESS_KEY_ID${NC}"
    [[ -z "$R2_SECRET_ACCESS_KEY" ]] && echo -e "${RED}  - R2_SECRET_ACCESS_KEY${NC}"
    [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]] && echo -e "${RED}  - CLOUDFLARE_ACCOUNT_ID${NC}"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI first.${NC}"
    echo -e "${YELLOW}Installation guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html${NC}"
    exit 1
fi

# Validate CORS config file exists
if [[ ! -f "$CORS_CONFIG_PATH" ]]; then
    echo -e "${RED}❌ CORS config file not found: $CORS_CONFIG_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Validating CORS configuration...${NC}"
if command -v jq &> /dev/null; then
    jq . "$CORS_CONFIG_PATH" > /dev/null
    echo -e "${GREEN}✅ CORS config is valid JSON${NC}"
else
    echo -e "${YELLOW}⚠️  jq not installed, skipping JSON validation${NC}"
fi

# Configure AWS CLI for R2
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

echo -e "${YELLOW}🔍 Checking current bucket CORS configuration...${NC}"
if aws s3api get-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" \
    --region auto 2>/dev/null; then
    echo -e "${YELLOW}📋 Current CORS configuration found${NC}"
else
    echo -e "${YELLOW}📋 No existing CORS configuration${NC}"
fi

echo -e "${YELLOW}🚀 Applying CORS configuration...${NC}"
if aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration "file://$CORS_CONFIG_PATH" \
    --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" \
    --region auto; then
    echo -e "${GREEN}✅ CORS configuration applied successfully!${NC}"
else
    echo -e "${RED}❌ Failed to apply CORS configuration${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Verifying CORS configuration...${NC}"
if aws s3api get-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com" \
    --region auto | jq '.CORSRules[] | {ID: .ID, AllowedOrigins: .AllowedOrigins, AllowedMethods: .AllowedMethods}'; then
    echo -e "${GREEN}✅ CORS verification completed${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify CORS configuration${NC}"
fi

echo -e "${GREEN}🎉 CORS deployment complete for $ENVIRONMENT_UPPER!${NC}"
echo -e "${YELLOW}⏳ Note: CORS changes may take a few minutes to propagate globally${NC}"

echo -e "${BLUE}💡 Testing Tips:${NC}"
echo -e "${YELLOW}  • Test with: curl -X OPTIONS -H 'Origin: <your-origin>' <bucket-url>${NC}"
echo -e "${YELLOW}  • Check browser developer tools for CORS errors${NC}"
echo -e "${YELLOW}  • Verify both bucket-level and Worker-level CORS are working${NC}"
