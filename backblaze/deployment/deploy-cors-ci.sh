#!/bin/bash

# B2 CORS Deployment Script for CI/CD
# Uses B2 CLI (the approach that actually works!)

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine environment
ENVIRONMENT="$1"

if [[ -z "$ENVIRONMENT" ]]; then
    echo -e "${RED}❌ Usage: $0 <dev|prod>${NC}"
    exit 1
fi

ENVIRONMENT_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
echo -e "${BLUE}🚀 Starting B2 CORS deployment for $ENVIRONMENT_UPPER environment${NC}"

# Set environment-specific variables
case "$ENVIRONMENT" in
    "dev")
        BUCKET_NAME="${B2_DEV_BUCKET_NAME}"
        CORS_FILE="b2-cli-cors-rules.json"
        ;;
    "prod")
        BUCKET_NAME="${B2_PROD_BUCKET_NAME}"
        CORS_FILE="b2-cli-cors-rules-prod.json"
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT. Use 'dev' or 'prod'${NC}"
        exit 1
        ;;
esac

# Validate environment variables
if [[ -z "$B2_KEY_ID" || -z "$B2_APPLICATION_KEY" || -z "$BUCKET_NAME" ]]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    [[ -z "$B2_KEY_ID" ]] && echo -e "${RED}  - B2_KEY_ID${NC}"
    [[ -z "$B2_APPLICATION_KEY" ]] && echo -e "${RED}  - B2_APPLICATION_KEY${NC}"
    [[ -z "$BUCKET_NAME" ]] && echo -e "${RED}  - B2_${ENVIRONMENT_UPPER}_BUCKET_NAME${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Target bucket: $BUCKET_NAME${NC}"
echo -e "${YELLOW}📋 CORS config file: $CORS_FILE${NC}"

# Install B2 CLI if not present
if ! command -v b2 &> /dev/null; then
    echo -e "${YELLOW}📥 Installing B2 CLI...${NC}"
    pip install --user b2
    export PATH="$HOME/.local/bin:$PATH"
fi

# Set B2 CLI environment variables
export B2_APPLICATION_KEY_ID="$B2_KEY_ID"
export B2_APPLICATION_KEY="$B2_APPLICATION_KEY"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_CONFIG_PATH="$SCRIPT_DIR/$CORS_FILE"

# Validate CORS config file exists
if [[ ! -f "$CORS_CONFIG_PATH" ]]; then
    echo -e "${RED}❌ CORS config file not found: $CORS_CONFIG_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}🔐 Authorizing with B2...${NC}"
b2 account authorize "$B2_KEY_ID" "$B2_APPLICATION_KEY"

echo -e "${YELLOW}🔍 Current bucket state:${NC}"
b2 bucket get "$BUCKET_NAME"

echo -e "${YELLOW}📋 Validating CORS configuration...${NC}"
if command -v jq &> /dev/null; then
    jq . "$CORS_CONFIG_PATH" > /dev/null
    echo -e "${GREEN}✅ CORS config is valid JSON${NC}"
else
    echo -e "${YELLOW}⚠️  jq not installed, skipping JSON validation${NC}"
fi

echo -e "${YELLOW}🚀 Applying CORS rules...${NC}"
b2 bucket update --cors-rules "$(cat "$CORS_CONFIG_PATH")" "$BUCKET_NAME" allPrivate

echo -e "${GREEN}✅ CORS deployment completed successfully!${NC}"

echo -e "${YELLOW}🔍 Verifying deployment:${NC}"
b2 bucket get "$BUCKET_NAME" | jq '.corsRules[] | {name: .corsRuleName, origins: .allowedOrigins, operations: .allowedOperations}'

echo -e "${GREEN}🎉 B2 CORS deployment complete for $ENVIRONMENT_UPPER!${NC}"
echo -e "${YELLOW}⏳ Note: CORS changes may take 5-15 minutes to propagate globally${NC}" 