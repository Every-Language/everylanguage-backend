# Development Setup

This document covers the complete development environment setup for the EL Backend project.

## 🏗️ Project Architecture

The EL Backend is built using:

- **Supabase** - Backend-as-a-Service with PostgreSQL, Auth, and Edge Functions
- **TypeScript** - Type-safe development
- **Modern tooling** - ESLint v9+, Prettier, Jest, Husky

## 📦 Configuration Overview

### TypeScript Configuration (`tsconfig.json`)

- **Target**: ES2022 for modern JavaScript features
- **Module Resolution**: Bundler (optimized for modern tooling)
- **Strict Mode**: Enabled for maximum type safety
- **Path Aliases**: Clean imports with `@/` prefixes
- **Supabase Optimized**: Configured for Edge Functions development

```typescript
// Example of path aliases in use
import { Database } from '@/types/database';
import { processAudio } from '@/functions/audio-processing';
```

### ESLint Configuration (`eslint.config.js`)

- **Version**: ESLint v9+ with flat config format (future-proof)
- **TypeScript**: Full TypeScript support with advanced rules
- **Environment-Specific Rules**:
  - **Edge Functions**: Deno environment with relaxed console rules
  - **Tests**: Jest globals and relaxed type checking
  - **Config Files**: Node.js environment
- **Code Quality**: Async/await best practices, optional chaining enforcement

### Prettier Configuration (`.prettierrc`)

- **Consistent Formatting**: 80-character line width, single quotes
- **Modern Standards**: Trailing commas, arrow function formatting
- **Intelligent Ignores**: Generated files, dependencies, SQL files

### SQL Formatter (`.sqlformatterrc.json`)

- **PostgreSQL Optimized**: Supabase-specific formatting
- **Professional Standards**: Uppercase keywords, proper indentation
- **Migration Ready**: Consistent formatting for version control

### Jest Configuration (`jest.config.js`)

- **TypeScript Support**: Full TS compilation with ts-jest
- **ES Modules**: Compatible with modern module system
- **Coverage**: 70% threshold for branches, functions, lines, statements
- **Supabase Testing**: Mock client and Edge Function support
- **Path Aliases**: Matching TypeScript configuration

## 🚀 Available Scripts

### Development Commands

```bash
npm run dev              # Start Supabase locally
npm run stop             # Stop Supabase
npm run reset            # Reset local database
npm run migrate          # Push migrations to database
npm run generate-types   # Generate TypeScript types from schema
```

### Function Development

```bash
npm run functions:serve  # Serve Edge Functions locally
npm run functions:deploy # Deploy Edge Functions
```

### Code Quality

```bash
npm run lint            # Check code with ESLint
npm run lint:fix        # Auto-fix linting issues
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without changes
npm run type-check      # Verify TypeScript types
```

### Testing

```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### SQL Development

```bash
npm run sql:format     # Format SQL migration files
```

### Git Workflow

```bash
npm run commit         # Conventional commits with Commitizen
```

## 🔧 Development Workflow

### 1. Starting Development

```bash
# Clone and setup
git clone <repo-url>
cd el-backend
npm install

# Setup environment
cp .env.example .env.local
# Fill in your environment variables

# Start development
npm run dev
```

### 2. Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes...
# Code will be automatically linted and formatted on commit

# Commit changes
npm run commit
# Follow the prompts for conventional commits

# Push and create PR
git push origin feature/your-feature
```

### 3. Database Changes

```bash
# Create migration
supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/
# Apply migration
npm run migrate

# Generate updated types
npm run generate-types
```

### 4. Edge Functions

```bash
# Create new function
supabase functions new your-function-name

# Serve locally for testing
npm run functions:serve

# Deploy to production
npm run functions:deploy your-function-name
```

## 🧪 Testing Setup

### Test Structure

```
tests/
├── setup.ts           # Global test configuration
├── env.setup.js       # Environment setup
├── __mocks__/         # Mock implementations
└── integration/       # Integration tests
```

### Writing Tests

```typescript
// Example test file: tests/audio-processing.test.ts
import { mockSupabaseClient } from './setup';

describe('Audio Processing', () => {
  it('should process audio file', async () => {
    // Test implementation
    expect(result).toBeDefined();
  });
});
```

### Test Utilities

- **Mock Supabase Client**: Pre-configured for testing
- **Environment Variables**: Automatically set for test environment
- **Coverage Reports**: Generated in `coverage/` directory

## 🔍 Code Quality Standards

### TypeScript Best Practices

- Use strict type checking
- Avoid `any` type (warnings enforced)
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Explicit return types for complex functions

### ESLint Rules

- **Async/Await**: Enforce proper promise handling
- **Imports**: Sorted imports for consistency
- **TypeScript**: Advanced type checking rules
- **Code Style**: Consistent formatting with Prettier

### SQL Standards

- **Uppercase Keywords**: `SELECT`, `FROM`, `WHERE`
- **Consistent Indentation**: 2 spaces
- **Semicolons**: Required at end of statements
- **Line Length**: 80 characters for readability

## 🌍 Environment Configuration

### Local Development (`.env.local`)

```env
# Supabase Local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_key

# External Services
BACKBLAZE_B2_APPLICATION_KEY_ID=your_key_id
BACKBLAZE_B2_APPLICATION_KEY=your_key
BACKBLAZE_B2_BUCKET_NAME=your_bucket

# AI Services
OPENAI_API_KEY=your_openai_key
```

### Testing Environment

Tests automatically use:

- Local Supabase instance (127.0.0.1:54321)
- Mock external API calls
- Isolated test database

## 🚨 Troubleshooting

### Common Issues

**ESLint Errors:**

```bash
# Fix most issues automatically
npm run lint:fix

# Check specific file
npx eslint path/to/file.ts
```

**TypeScript Errors:**

```bash
# Check types without emitting
npm run type-check

# Generate fresh types from database
npm run generate-types
```

**Formatting Issues:**

```bash
# Format all files
npm run format

# Check what needs formatting
npm run format:check
```

**Test Failures:**

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/specific-test.test.ts
```

**Supabase Issues:**

```bash
# Reset everything
npm run stop
npm run reset

# Check status
supabase status
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)

## 🤝 Contributing

1. Follow the conventional commit format
2. Ensure all tests pass: `npm test`
3. Check code quality: `npm run lint`
4. Verify formatting: `npm run format:check`
5. Update documentation for new features
6. Add tests for new functionality

## 📝 Notes

- **ES Modules**: Project uses ES modules (`"type": "module"`)
- **Node.js**: Requires Node.js 18+ for optimal compatibility
- **Docker**: Required for local Supabase development
- **Git Hooks**: Automatically run quality checks on commit
