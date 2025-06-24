# CI/CD Pipeline Troubleshooting Guide

This guide helps you troubleshoot common issues with the EverlyLanguage CI/CD pipeline.

## 🚨 Common Issues & Solutions

### 1. Protected Branch Push Failure

**Error**: `remote rejected main -> main (protected branch hook declined)`

**Cause**: Workflow tries to push directly to protected `main` branch.

**✅ Solution**: Updated workflow now creates Pull Requests instead of direct pushes.

**What Changed**:

- Type updates now create automated PRs
- PRs are auto-merged if checks pass
- Tags are pushed separately after merge

### 2. NPM Publishing Permission Denied

**Error**: `npm ERR! code E401` or `npm ERR! 403 Forbidden`

**Causes & Solutions**:

**🔑 Invalid NPM Token**:

```bash
# Check if NPM_TOKEN secret is set correctly
# Go to: GitHub repo → Settings → Secrets → Actions
# Verify NPM_TOKEN exists and is valid
```

**📦 Package Name Taken**:

```bash
# Check if package name is available
npm view @everylanguage/shared-types
# If taken, update package.json name
```

**⚠️ Wrong Token Type**:

- Use "Automation" type tokens for CI/CD
- Classic tokens don't work with GitHub Actions

### 3. Supabase Connection Issues

**Error**: `Failed to link to Supabase project`

**Solutions**:

**🔑 Check Secrets**:

```bash
# Verify these secrets exist in GitHub:
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=abcdef...
```

**🌐 Network Issues**:

```bash
# Test Supabase connection locally:
supabase projects list
```

**🔗 Wrong Project Reference**:

- Go to Supabase Dashboard → Project Settings → General
- Copy the exact "Reference ID"

### 4. Type Generation Failures

**Error**: `Generated types are out of date`

**Causes & Solutions**:

**📝 Schema Mismatch**:

```bash
# Fix locally:
npm run generate-types
git add types/database.ts
git commit -m "fix: update database types"
git push
```

**🔄 Migration Not Applied**:

```bash
# Apply migrations locally first:
npm run migrate
npm run generate-types
```

**🏗️ Build Process Issues**:

```bash
# Test the full build process:
npm run generate-types
npm run prepare-package
```

### 5. Workflow Permissions Issues

**Error**: `Resource not accessible by integration`

**✅ Solutions**:

- Updated workflow permissions to include `pull-requests: write`
- Added `actions: read` permission
- Using proper GitHub token scopes

### 6. Version Bumping Problems

**Error**: `fatal: No names found, cannot describe anything`

**Causes & Solutions**:

**🏷️ No Git Tags**:

```bash
# Create initial tag:
git tag v1.0.0
git push --tags
```

**📝 Wrong Commit Format**:

```bash
# Use conventional commits:
feat: add new table (minor bump)
fix: add missing index (patch bump)
feat!: breaking change (major bump)
```

**🔄 Clean Working Directory**:

```bash
# Ensure clean state before version bump:
git status  # Should be clean
npm run version:patch
```

## 🔧 Debugging Steps

### Step 1: Check Workflow Logs

1. Go to GitHub repository
2. Click **Actions** tab
3. Click on failed workflow
4. Expand each step to see detailed logs

### Step 2: Test Locally

```bash
# Test type generation:
npm run generate-types

# Test package build:
npm run prepare-package

# Test version bumping:
npm run version:patch

# Test NPM auth:
npm whoami

# Test Supabase connection:
supabase projects list
```

### Step 3: Verify Secrets

```bash
# Required GitHub Secrets:
NPM_TOKEN=npm_...          # NPM automation token
SUPABASE_ACCESS_TOKEN=sbp_... # Supabase access token
SUPABASE_PROJECT_REF=abc...   # Project reference ID
```

### Step 4: Check Branch Protection

1. Go to GitHub repo → Settings → Branches
2. Check `main` branch protection rules
3. Ensure "Allow auto-merge" is enabled
4. Verify workflow has appropriate permissions

## 🚀 Best Practices

### 1. Conventional Commits

Use proper commit message format:

```bash
feat: add audio_segments table        # Minor version bump
fix: add missing database index       # Patch version bump
feat!: restructure user table        # Major version bump

# Include body for breaking changes:
feat!: restructure user table

BREAKING CHANGE: user_profiles table renamed to profiles
```

### 2. Testing Before Deploy

```bash
# Always test locally first:
supabase start
npm run migrate
npm run generate-types
npm test
npm run prepare-package
```

### 3. Monitoring

- Check GitHub Actions regularly
- Monitor NPM package downloads
- Review GitHub releases for version history
- Watch for security alerts

### 4. Documentation

- Update README when schema changes
- Document breaking changes in release notes
- Keep team informed of new versions

## 📊 Workflow Status Monitoring

### Healthy Pipeline Indicators

✅ **CI Workflow**:

- All tests pass
- Linting succeeds
- Types are up to date
- No security vulnerabilities

✅ **Deploy Workflow**:

- Migrations apply successfully
- Production schema matches local
- No deployment errors

✅ **Publish Workflow**:

- Types generate from production
- Version bumps correctly
- NPM package publishes
- GitHub release created

### Warning Signs

⚠️ **Watch for**:

- Frequent CI failures
- Type generation inconsistencies
- NPM publish failures
- Missing version tags

## 🆘 Emergency Procedures

### Rollback NPM Package

```bash
# Deprecate problematic version:
npm deprecate @everylanguage/shared-types@1.2.3 "Use version 1.2.2 instead"

# Publish hotfix:
npm run version:patch
npm run prepare-package
npm publish
```

### Fix Broken Types

```bash
# Generate fresh types from production:
supabase gen types typescript --linked > types/database.ts

# Test and commit:
npm run prepare-package
git add types/
git commit -m "fix: regenerate types from production schema"
git push
```

### Manual Release

```bash
# If automation fails, release manually:
npm run generate-types
npm run prepare-package
npm run version:patch
npm publish
git push --tags
```

## 📞 Getting Help

1. **Check this troubleshooting guide first**
2. **Review GitHub Actions logs for specific errors**
3. **Test the failing step locally**
4. **Check GitHub repository Issues for similar problems**
5. **Create new issue with full error logs if needed**

## 📚 Related Documentation

- [CI/CD Pipeline Overview](./ci-cd-pipeline.md)
- [NPM Package Setup](./npm-package-setup.md)
- [Schema Changes Guide](./schema-changes-guide.md)
- [GitHub Setup Guide](./github-setup-guide.md)
