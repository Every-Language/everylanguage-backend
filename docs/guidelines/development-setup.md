# Development Setup Guide

## 🚀 Quick Start

```bash
git clone <repo-url>
cd el-backend
npm install
npm run dev                 # Start Supabase locally
```

## 🌐 Development Environments

We use **three environments** for development and deployment:

- **Local**: Your machine (`npm run dev`) - Individual development
- **Development**: Shared environment - Integration testing
- **Production**: Live environment - Real users

### Environment Workflow

```bash
feature/your-feature → Local Development (your machine)
        ↓
develop branch → Development Environment (shared testing)
        ↓
main branch → Production Environment (live users)
```

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - Required for local Supabase
- **Git** - For version control

## 🛠️ Essential Commands

| Command                  | Purpose                    |
| ------------------------ | -------------------------- |
| `npm run dev`            | Start local Supabase       |
| `npm run migrate`        | Apply database migrations  |
| `npm run generate-types` | Generate TypeScript types  |
| `npm test`               | Run tests                  |
| `npm run lint`           | Check code quality         |
| `npm run commit`         | Create conventional commit |

These are all for local development. Type generation for production is handled by CD.

## 🗄️ Database Development

### Creating Migrations

```bash
supabase migration new your_feature_name
# Edit the migration file in supabase/migrations/
npm run migrate                # Apply locally
npm run generate-types         # Update types for local testing
```

### Edge Functions

```bash
supabase functions new your-function-name
npm run functions:serve        # Test locally
```

## 🔧 Development Workflow

### **Feature Development**

1. **Create feature branch from develop:**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-awesome-feature
   ```

2. **Develop locally:**

   ```bash
   npm run dev                # Start local Supabase
   # Make your changes...
   npm test && npm run lint   # Test locally
   ```

3. **Push feature branch:**

   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   git push origin feature/your-awesome-feature
   # → ✅ Runs CI (tests, lint, type-check)
   # → ❌ No deployment (feature branches don't deploy)
   ```

4. **Create PR to develop:**

   ```bash
   gh pr create --base develop --title "Add awesome feature"
   # → 👀 Code review and discussion
   ```

5. **Merge to develop:**

   ```bash
   gh pr merge --squash
   # → 🚀 Auto-deploys to Development environment
   # → 🌱 Seeds test data automatically
   ```

6. **Test in shared environment:**
   - Development URL: `https://your-dev-project.supabase.co`
   - Test users: `john.admin@test.com / test123456`, etc.

### **Production Release**

When ready to release to production:

```bash
git checkout main
git merge develop
git push origin main
# → 🚀 Auto-deploys to Production environment
```
