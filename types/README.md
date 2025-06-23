# @everylanguage/shared-types

🎯 **Shared TypeScript types for the EverlyLanguage audio translation platform**

This package contains automatically generated TypeScript types from our Supabase database schema, ensuring type safety across all applications in the EverlyLanguage ecosystem.

## 📦 Installation

```bash
npm install @everylanguage/shared-types
```

## 🔄 Type Updates

Types are automatically updated when:

- Database schema changes are deployed to production
- The CI/CD pipeline detects schema modifications
- Manual publishing is triggered

## 🔧 Development Workflow

For the backend team:

```bash
# 1. Make schema changes
supabase migration new your_change_name

# 2. Apply migration locally
npm run migrate

# 3. Test changes
npm test

# 4. Commit and push
npm run commit
git push

# 5. Types are automatically published after deployment!
```

For application teams:

```bash
# Update to latest types
npm update @everylanguage/shared-types

# Or install specific version
npm install @everylanguage/shared-types@1.2.3
```

## 📚 Version History

This package follows [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.x) - Type fixes, documentation updates
- **Minor** (1.x.0) - New tables, non-breaking schema additions
- **Major** (x.0.0) - Breaking schema changes

## 🐛 Issues & Support

- **Backend Issues**: [Backend Repository](https://github.com/your-org/el-backend/issues)
- **Type Issues**: [Type-specific issues](https://github.com/your-org/el-backend/issues?q=label%3Atypes)
- **Application Integration**: Contact your respective app team
