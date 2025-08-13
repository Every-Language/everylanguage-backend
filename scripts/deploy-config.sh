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

# Optionally enable SMTP (set ENABLE_SMTP=true in the environment)
if [ "$ENABLE_SMTP" = "true" ]; then
    sed -i.bak 's|enabled = false  # Set to true in production|enabled = true|g' "$TEMP_CONFIG"
    echo "✅ Enabled SMTP (via ENABLE_SMTP=true)"
else
    echo "ℹ️  SMTP setting left as-is (ENABLE_SMTP not true)"
fi

# Override site_url if provided (prevents localhost leaking to prod)
if [ ! -z "$SUPABASE_SITE_URL" ]; then
    # Replace entire site_url line
    sed -i.bak "s|^site_url = \".*\"|site_url = \"$SUPABASE_SITE_URL\"|" "$TEMP_CONFIG"
    echo "✅ Set site_url to $SUPABASE_SITE_URL"
fi

# Override additional_redirect_urls if provided
# Provide as a JSON-ish TOML array string, e.g.:
#   export SUPABASE_ADDITIONAL_REDIRECT_URLS='["https://projects.everylanguage.com","https://app2.example.com"]'
if [ ! -z "$SUPABASE_ADDITIONAL_REDIRECT_URLS" ]; then
    # Replace entire additional_redirect_urls line (expects a single-line array)
    # Note: no quotes around variable on purpose to preserve brackets and quotes
    sed -i.bak "s|^additional_redirect_urls = \[.*\]|additional_redirect_urls = $SUPABASE_ADDITIONAL_REDIRECT_URLS|" "$TEMP_CONFIG"
    echo "✅ Set additional_redirect_urls to $SUPABASE_ADDITIONAL_REDIRECT_URLS"
fi

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