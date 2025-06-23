# GitHub Setup Guide

This guide walks you through the manual steps required to complete your CI/CD pipeline setup in GitHub.

## 🚀 Step 1: Push Your CI/CD Files

First, commit and push all the CI/CD files we just created:

```bash
# Add all the new GitHub workflow files
git add .github/

# Commit the CI/CD setup
npm run commit
# Select: feat -> "add CI/CD pipeline with GitHub Actions"

# Push to your repository
git push origin main
```

## 🔐 Step 2: Configure Repository Secrets

### Navigate to Secrets Settings

1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables**
4. Click **Actions**

### Add Required Secrets

Click **New repository secret** and add each of these:

#### 1. SUPABASE_ACCESS_TOKEN

- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Value**: Your Supabase access token

**How to get this:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click your profile picture (top right)
3. Select **Access Tokens**
4. Click **Generate new token**
5. Give it a name like "EL Backend CI/CD"
6. Copy the token (starts with `sbp_`)

#### 2. SUPABASE_PROJECT_REF

- **Name**: `SUPABASE_PROJECT_REF`
- **Value**: Your production project reference ID

**How to get this:**

1. Go to your Supabase project dashboard
2. Click **Settings** gear icon
3. Go to **General** tab
4. Copy the **Reference ID** (usually a short string like `abcdefghijk`)

#### 3. NPM_TOKEN

- **Name**: `NPM_TOKEN`
- **Value**: Your NPM automation token

**How to get this:**

1. Go to [NPM website](https://www.npmjs.com) and login
2. Click your profile picture (top right)
3. Select **Access Tokens**
4. Click **Create New Token**
5. Choose **Automation** type (for CI/CD)
6. Give it a name like "EL Backend Types Publishing"
7. Copy the token (starts with `npm_`)

> ⚠️ **Important**: You'll need a production Supabase project for deployment. If you only have local development set up, you can add these secrets later when you create your production project.

## 🛡️ Step 3: Set Up Branch Protection Rules

### Navigate to Branch Settings

1. In your repository, click **Settings**
2. In the left sidebar, click **Branches**
3. Click **Add rule** (or **Add branch protection rule**)

### Configure Main Branch Protection

**Branch name pattern**: `main`

Enable these settings:

#### ✅ Required Status Checks

- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**

In the **Status checks** search box, type and select:

- `lint-and-test` (this will appear after your first CI run)

#### ✅ Additional Protections

- [x] **Require a pull request before merging**
- [x] **Require approvals** (set to 1)
- [x] **Dismiss stale reviews when new commits are pushed**
- [x] **Require review from code owners** (if you have a CODEOWNERS file)

#### ✅ Restrictions (Optional but Recommended)

- [x] **Restrict pushes that create files that exceed 100MB**
- [x] **Include administrators** (applies rules to repository admins too)

#### ✅ Advanced Settings

- [x] **Allow force pushes** → **Leave UNCHECKED** (prevents force pushes)
- [x] **Allow deletions** → **Leave UNCHECKED** (prevents branch deletion)

Click **Create** to save the branch protection rule.

## 🔄 Step 4: Test Your CI/CD Pipeline

### Test CI (Continuous Integration)

1. **Create a test branch:**

   ```bash
   git checkout -b test/ci-pipeline
   ```

2. **Make a small change:**

   ```bash
   echo "# CI/CD Pipeline Active" >> README.md
   git add README.md
   npm run commit
   # Select: docs -> "test CI/CD pipeline setup"
   ```

3. **Push and create PR:**

   ```bash
   git push -u origin test/ci-pipeline
   ```

4. **Create Pull Request:**

   - Go to GitHub repository
   - Click **Compare & pull request**
   - Fill out the PR template
   - Click **Create pull request**

5. **Watch CI Run:**
   - You should see "Some checks haven't completed yet"
   - Click **Details** next to the CI check
   - Watch the workflow run in real-time

### Expected Results

✅ **Success**: All checks should pass:

- Linting ✅
- Formatting ✅
- Type checking ✅
- Tests ✅
- Type generation verification ✅

❌ **If anything fails**: Check the logs and fix the issues

### Test Deployment (After Production Setup)

Once you have production Supabase set up:

1. **Merge your test PR** (this will trigger deployment)
2. **Go to Actions tab** and watch the Deploy workflow  
3. **Verify deployment succeeded**
4. **Watch NPM Publishing** (triggers after successful deployment)
   - Go to Actions → "Publish Types Package"
   - Verify types are published to NPM
   - Check GitHub Releases for new version

## ⚙️ Step 5: Configure Additional Settings

### 1. Enable GitHub Actions (if not already enabled)

1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select:
   - **Allow all actions and reusable workflows**
3. Under **Workflow permissions**, select:
   - **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**

### 2. Set Up Default PR Settings

1. Go to **Settings** → **General**
2. Scroll to **Pull Requests** section
3. Configure these settings:
   - ✅ **Allow merge commits**
   - ✅ **Allow squash merging** (recommended)
   - ❌ **Allow rebase merging** (optional)
   - ✅ **Always suggest updating pull request branches**
   - ✅ **Automatically delete head branches**

### 3. Configure Notifications (Optional)

1. Go to **Settings** → **Notifications**
2. Set up email notifications for:
   - Failed workflow runs
   - Successful deployments
   - Security alerts

## 🎯 Step 6: Verify Complete Setup

### Checklist

- [ ] ✅ CI workflow file exists (`.github/workflows/ci.yml`)
- [ ] ✅ Deploy workflow file exists (`.github/workflows/deploy.yml`)
- [ ] ✅ PR template exists (`.github/PULL_REQUEST_TEMPLATE.md`)
- [ ] ✅ Issue templates exist (`.github/ISSUE_TEMPLATE/`)
- [ ] ✅ Repository secrets configured
- [ ] ✅ Branch protection rules enabled for `main`
- [ ] ✅ Test PR created and CI passed
- [ ] ✅ Production deployment tested (when ready)

### Verify Branch Protection

Try this test:

```bash
# This should be BLOCKED by branch protection
git checkout main
echo "test" >> README.md
git add .
git commit -m "test direct push to main"
git push origin main
```

You should see an error like:

```
! [remote rejected] main -> main (protected branch hook declined)
```

This confirms your branch protection is working! 🎉

## 🚨 Troubleshooting

### Common Issues

#### "Status check not found"

If `lint-and-test` doesn't appear in status checks:

1. Make sure you've pushed your workflow files
2. Create a test PR to trigger the first CI run
3. Return to branch protection settings after CI runs

#### "Workflow not triggering"

1. Check that workflow files are in `.github/workflows/`
2. Verify YAML syntax is correct
3. Ensure you're pushing to `main` or `develop` branches

#### "Permission denied on secrets"

1. Ensure you have admin access to the repository
2. Check that secrets are configured correctly
3. Verify secret names match exactly (case-sensitive)

### Getting Help

If you encounter issues:

1. **Check GitHub Actions logs** for detailed error messages
2. **Review the troubleshooting section** in `docs/ci-cd-pipeline.md`
3. **Test locally first** using the same commands
4. **Ask in team chat** if you're stuck

## 🎉 Success!

Once everything is set up, your development workflow will be:

1. **Create feature branch** → Work on your code
2. **Push changes** → CI automatically runs
3. **Create PR** → Team reviews with CI verification
4. **Merge to main** → Automatic deployment to production

Your CI/CD pipeline is now protecting your production environment and ensuring code quality! 🚀

## 📚 Next Steps

- Read the full [CI/CD Pipeline Documentation](./ci-cd-pipeline.md)
- Set up your production Supabase project
- Start building your first features with confidence
- Consider adding deployment environments (staging, preview)
