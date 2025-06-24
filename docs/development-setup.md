# Development Setup Guide

Quick guide to get started developing on the EL Backend project.

## 🚀 Quick Start

```bash
git clone <repo-url>
cd el-backend
npm install
cp .env.example .env.local  # Fill in your environment variables
npm run dev                 # Start Supabase locally
```

**Ready to develop!** 🎉

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

## 🗄️ Database Development

### Creating Migrations

```bash
supabase migration new your_feature_name
# Edit the migration file in supabase/migrations/
npm run migrate                # Apply locally
npm run generate-types         # Update types
```

### Edge Functions

```bash
supabase functions new your-function-name
npm run functions:serve        # Test locally
npm run functions:deploy       # Deploy to production
```

## 🔧 Development Workflow

1. **Start development:** `npm run dev`
2. **Make changes** to code/schema
3. **Test locally:** `npm test && npm run lint`
4. **Commit:** `npm run commit` (uses conventional commits)
5. **Push:** Git push triggers CI/CD automatically

## 🏗️ Project Architecture

- **TypeScript** - Type-safe development
- **Supabase** - PostgreSQL database + auth + Edge Functions
- **ESLint v9+** - Modern linting with flat config
- **Jest** - Testing framework
- **Husky** - Git hooks for quality checks

## 🔍 Troubleshooting

### Common Issues

```bash
# Reset local database
npm run stop && npm run reset && npm run dev

# Fix linting issues
npm run lint:fix

# Regenerate types if out of sync
npm run generate-types

# Check Supabase status
supabase status
```

### CI/CD Failures

- Check GitHub Actions logs for detailed errors
- Ensure all tests pass locally before pushing
- Verify types are up to date after schema changes

## 📚 Next Steps

- Read [Schema Changes Guide](./schema-changes-guide.md) for database workflow
- Check [CI/CD Pipeline](./ci-cd-pipeline.md) for automation details
- Start with the [Project Setup Checklist](./project-setup-checklist.md) for next priorities

## 🆘 Getting Help

- **Quick fixes:** Try the troubleshooting section above
- **CI issues:** Check GitHub Actions logs
- **Database problems:** Review Supabase local logs
- **Team questions:** Create GitHub issue or ask in team chat

---

**Environment URLs:**

- **Local Supabase:** http://127.0.0.1:54321 (API) | http://127.0.0.1:54323 (Studio)
- **Production:** https://mmcvtfxzntimcjfncdea.supabase.co
