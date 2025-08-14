#!/bin/bash

# Deploy configuration with environment variable substitution
# Usage: ./scripts/deploy-config.sh <project-ref>

set -e

PROJECT_REF=$1

if [ -z "$PROJECT_REF" ]; then
    echo "Error: Project ref is required"
    echo "Usage: $0 <project-ref>"
    exit 1
fi

echo "📝 Deploying configuration to project: $PROJECT_REF"

# Create a temporary config file with environment variables substituted
TEMP_CONFIG=$(mktemp)
cp supabase/config.toml "$TEMP_CONFIG"

# Substitute environment variables
echo "🔄 Substituting environment variables..."

# Twilio credentials
if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
    sed -i.bak "s|env(TWILIO_ACCOUNT_SID)|$TWILIO_ACCOUNT_SID|g" "$TEMP_CONFIG"
    echo "✅ Substituted TWILIO_ACCOUNT_SID"
fi

if [ ! -z "$TWILIO_AUTH_TOKEN" ]; then
    sed -i.bak "s|env(TWILIO_AUTH_TOKEN)|$TWILIO_AUTH_TOKEN|g" "$TEMP_CONFIG"
    echo "✅ Substituted TWILIO_AUTH_TOKEN" 
fi

if [ ! -z "$TWILIO_VERIFY_SERVICE_SID" ]; then
    sed -i.bak "s|env(TWILIO_VERIFY_SERVICE_SID)|$TWILIO_VERIFY_SERVICE_SID|g" "$TEMP_CONFIG"
    echo "✅ Substituted TWILIO_VERIFY_SERVICE_SID"
fi

# Email credentials
if [ ! -z "$RESEND_API_KEY" ]; then
    sed -i.bak "s|env(RESEND_API_KEY)|$RESEND_API_KEY|g" "$TEMP_CONFIG"
    echo "✅ Substituted RESEND_API_KEY"
fi

# Enable SMTP in production
sed -i.bak 's|enabled = false  # Set to true in production|enabled = true|g' "$TEMP_CONFIG"
echo "✅ Enabled SMTP for production"

# Copy the processed config to the supabase directory temporarily
cp "$TEMP_CONFIG" supabase/config.toml

# Push the configuration
echo "🚀 Pushing configuration to Supabase..."
supabase config push --project-ref "$PROJECT_REF"

# Restore the original config file
git checkout supabase/config.toml
echo "✅ Restored original config.toml"

# Clean up
rm -f "$TEMP_CONFIG" "$TEMP_CONFIG.bak"

echo "🎉 Configuration deployment completed successfully!" 