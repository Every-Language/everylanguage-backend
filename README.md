# EL Backend

[![CI](https://github.com/your-username/el-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/el-backend/actions/workflows/ci.yml)
[![Deploy](https://github.com/your-username/el-backend/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-username/el-backend/actions/workflows/deploy.yml)

Supabase backend for the EL audio translation platform supporting 4 applications:

- **App 1**: Audio recording with live translation and speaker segmentation
- **App 2**: Audio listening app with offline-first playback
- **App 3**: Analytics dashboard with geographic insights
- **App 4**: User management and content dashboard

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for Supabase)
- Supabase CLI (`npm install -g supabase`)

### Setup

1. **Clone and install:**

   ```bash
   git clone <repo-url>
   cd el-backend
   npm install
   ```

2. **Environment setup:**

   ```bash
   cp env.example .env.local
   # Fill in your local environment variables
   ```

3. **Start development:**
   ```bash
   npm run dev        # Start Supabase locally
   npm run generate-types  # Generate TypeScript types
   ```

## 📜 Available Scripts

### Development

- `npm run dev` - Start local Supabase development
- `npm run stop` - Stop Supabase
- `npm run reset` - Reset local database
- `npm run migrate` - Push migrations to database
- `npm run generate-types` - Generate TypeScript types

### Functions

- `npm run functions:serve` - Serve Edge Functions locally
- `npm run functions:deploy` - Deploy Edge Functions

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting
- `npm run type-check` - Verify TypeScript types

### Testing

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

### Git Workflow

- `npm run commit` - Commit with conventional commits

## 🏗️ Project Structure

```
el-backend/
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   └── ISSUE_TEMPLATE/      # GitHub issue templates
├── supabase/
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge Functions
│   ├── seed/               # Seed data
│   └── tests/              # Database tests
├── types/
│   └── database.ts         # Generated TypeScript types
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## 🔄 Development Workflow

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature
```

### 2. Make Changes

- Write your code
- Add tests
- Update documentation if needed

### 3. Test Locally

```bash
npm test                    # Run tests
npm run lint               # Check linting
npm run format:check       # Check formatting
npm run type-check         # Check types
```

### 4. Commit and Push

```bash
git add .
npm run commit             # Use conventional commits
git push origin feature/your-feature
```

### 5. Create Pull Request

- CI automatically runs on PR
- Wait for green checkmarks ✅
- Request review from team
- Merge after approval

### 6. Automatic Deployment

- Merge to `main` triggers deployment
- Database migrations applied
- Edge Functions deployed

## 🧪 CI/CD Pipeline

Our automated pipeline ensures code quality and safe deployments:

### Continuous Integration (CI)

Runs on every PR and push:

- ✅ Linting with ESLint
- ✅ Code formatting with Prettier
- ✅ TypeScript type checking
- ✅ Test suite execution
- ✅ Database migration testing
- ✅ Type generation verification

### Continuous Deployment (CD)

Runs on merge to `main`:

- 🚀 Database migrations to production
- 🚀 Edge Function deployments
- 🚀 Production schema verification

**📖 Read More**: [CI/CD Pipeline Documentation](./docs/ci-cd-pipeline.md)

## 🗃️ Database Management

### Creating Migrations

```bash
# Create new migration
supabase migration new add_user_profiles

# Edit the migration file
# supabase/migrations/[timestamp]_add_user_profiles.sql

# Test migration locally
npm run migrate

# Generate updated types
npm run generate-types

# Commit both migration and types
git add supabase/migrations/ types/database.ts
npm run commit
```

### Best Practices

- Always test migrations locally first
- Include both up and down migrations
- Generate types after schema changes
- Use descriptive migration names

## 🔧 Architecture Overview

### Technology Stack

- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Backblaze B2
- **Functions**: Supabase Edge Functions (Deno)
- **Sync**: PowerSync for offline-first apps
- **Testing**: Jest with Supabase integration
- **CI/CD**: GitHub Actions

### Key Features

- **Offline-first**: PowerSync integration for mobile apps
- **Real-time**: Supabase realtime subscriptions
- **Scalable**: Edge Functions for compute
- **Secure**: Row Level Security (RLS) policies
- **Tested**: Comprehensive test suite
- **Typed**: Full TypeScript support

## 📱 Application Support

### App 1: Recording App

- User authentication and project management
- Audio file upload and processing
- Speaker segmentation data storage
- Offline sync capabilities

### App 2: Listening App

- Public content discovery and delivery
- Anonymous usage analytics
- Geographic content filtering
- Progressive download optimization

### App 3: Analytics Dashboard

- Real-time usage statistics
- Geographic usage insights
- Performance metrics
- Export capabilities

### App 4: Management Dashboard

- Content management interface
- User administration
- Project oversight tools
- Advanced analytics

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Pure function tests
├── integration/       # Database + API tests
├── e2e/              # Full workflow tests
└── fixtures/         # Test data
```

### Running Tests

```bash
npm test              # All tests
npm test -- --watch  # Watch mode
npm test -- tests/specific-test.test.ts  # Specific test
```

**📖 Read More**: [Testing Documentation](./docs/testing-guide.md)

## 🚨 Troubleshooting

### Common Issues

**Supabase won't start:**

```bash
# Ensure Docker is running
docker --version

# Reset Supabase
npm run stop
npm run reset
npm run dev
```

**Type errors:**

```bash
# Regenerate types
npm run generate-types
npm run type-check
```

**CI failures:**

```bash
# Run CI checks locally
npm run lint && npm run format:check && npm run type-check && npm test
```

## 📚 Documentation

- [Development Setup](./docs/development-setup.md)
- [CI/CD Pipeline](./docs/ci-cd-pipeline.md)
- [GitHub Setup Guide](./docs/github-setup-guide.md)
- [Project Setup Checklist](./docs/project-setup-checklist.md)

## 🤝 Contributing

1. Read the [GitHub Setup Guide](./docs/github-setup-guide.md)
2. Follow the development workflow above
3. Ensure all CI checks pass
4. Request review from team members
5. Keep PRs small and focused

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check [troubleshooting section](#-troubleshooting) above
- Review documentation in `docs/` folder
- Create an issue for bugs or feature requests
- Ask team members for help with setup

---

## 🎉 CI/CD Pipeline Test

✅ **Pipeline Status**: Active and testing!
🚀 **Automatic deployment**: Configured and ready
🧪 **Continuous testing**: Running on every PR
