## 🚀 Phase 6: CI/CD Setup

### 6.1 GitHub Actions Workflow

- [ ] Create `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm test

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase local development setup
        run: supabase start

      - name: Verify generated types are committed
        run: |
          supabase gen types typescript --local > types/database.ts
          if ! git diff --ignore-space-at-eol --exit-code --quiet types/database.ts; then
            echo "Detected uncommitted changes after running 'supabase gen types'. See status below:"
            git diff
            exit 1
          fi
```

### 6.2 GitHub Templates

- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Database migration

## Testing

- [ ] Tests pass locally
- [ ] New tests added (if applicable)
- [ ] Manual testing completed

## Database Changes

- [ ] Migration included
- [ ] Seed data updated (if needed)
- [ ] RLS policies updated

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or marked as such)
```

---

## 📚 Phase 7: Documentation

### 7.1 Main README

- [ ] Create comprehensive `README.md`

````markdown
# EL Backend

Supabase backend for the EL audio translation platform supporting 4 applications:

- App 1: Audio recording with live translation
- App 2: Audio listening app
- App 3: Analytics dashboard
- App 4: User management dashboard

## Quick Start

1. **Prerequisites:**

   - Node.js 18+
   - Docker Desktop
   - Supabase CLI

2. **Setup:**
   ```bash
   git clone <repo-url>
   cd el-backend
   npm install
   cp .env.example .env.local
   # Fill in your environment variables
   ```
````

3. **Development:**
   ```bash
   npm run dev        # Start Supabase locally
   npm run generate-types  # Generate TypeScript types
   ```

## Available Scripts

- `npm run dev` - Start local Supabase development
- `npm run reset` - Reset local database
- `npm run migrate` - Push migrations to database
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run commit` - Commit with conventional commits

## Project Structure

```
el-backend/
├── supabase/
│   ├── migrations/     # Database migrations
│   ├── functions/      # Edge Functions
│   ├── seed/          # Seed data
│   └── tests/         # Database tests
├── types/             # TypeScript definitions
├── scripts/           # Utility scripts
├── docs/             # Documentation
└── tests/            # Application tests
```

## Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `npm run commit`
5. Push and create PR

## Contributing

See [CONTRIBUTING.md](docs/contributing.md) for detailed guidelines.

````

### 7.2 Additional Documentation Files
- [ ] Create `docs/database-schema.md` (placeholder)
- [ ] Create `docs/api-documentation.md` (placeholder)
- [ ] Create `docs/deployment.md` (placeholder)
- [ ] Create `docs/contributing.md` (placeholder)

---

## ✅ Phase 8: Verification & Testing

### 8.1 Test Installation
- [ ] Run `npm run lint` (should pass with no errors)
- [ ] Run `npm run format:check` (should pass)
- [ ] Run `npm run type-check` (should pass)
- [ ] Run `npm test` (should pass, may be empty)

### 8.2 Test Supabase
- [ ] Run `npm run dev` (should start Supabase successfully)
- [ ] Visit http://localhost:54323 (Supabase Studio should load)
- [ ] Run `npm run generate-types` (should create types/database.ts)
- [ ] Run `npm run stop` (should stop Supabase)

### 8.3 Test Git Hooks
- [ ] Make a small change to any file
- [ ] Run `git add .`
- [ ] Run `git commit` (should trigger lint-staged)
- [ ] Use `npm run commit` for conventional commits

---

## 🎯 Phase 9: Initial Commit

### 9.1 Commit Initial Setup
```bash
git add .
npm run commit
# Select "feat" -> "initial project setup with development tools"
git push -u origin main
````

- [ ] Create initial commit
- [ ] Push to remote repository
- [ ] Verify GitHub Actions runs successfully

---

## ✨ Next Steps

After completing this checklist:

1. **Database Design**: Create your first migration files
2. **Edge Functions**: Set up your first Supabase function
3. **Authentication**: Configure auth policies
4. **Storage**: Set up file upload policies
5. **Testing**: Add your first tests

---

## 🆘 Troubleshooting

**Common Issues:**

1. **Husky hooks not working:**

   ```bash
   npx husky install
   chmod +x .husky/pre-commit .husky/commit-msg
   ```

2. **Supabase won't start:**

   - Ensure Docker Desktop is running
   - Check port 54321 isn't in use
   - Run `supabase stop` then `supabase start`

3. **Type generation fails:**

   - Ensure Supabase is running locally
   - Check your migrations are applied
   - Verify database is accessible

4. **Linting errors:**
   - Run `npm run lint:fix` to auto-fix
   - Check `.eslintrc.js` configuration
   - Ensure all dependencies are installed

---

## 📞 Support

If you encounter issues:

1. Check this troubleshooting section
2. Review the documentation in `docs/`
3. Check existing GitHub issues
4. Create a new issue with detailed information

---

**Estimated Setup Time:** 30-45 minutes

**Required Knowledge:** Basic Git, Node.js, and command line usage
