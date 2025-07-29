import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base configuration for all files
  js.configs.recommended,

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'writable',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      ...prettierConfig.rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // General JavaScript/Node.js rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // Async/Promise rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },

  // Supabase Edge Functions specific configuration
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './supabase/functions/tsconfig.json',
      },
      globals: {
        Deno: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        globalThis: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-console': 'off', // Console is ok in Edge Functions
      '@typescript-eslint/no-explicit-any': 'off', // More lenient for API responses
      '@typescript-eslint/no-unsafe-assignment': 'off', // Disable for Deno environment
      '@typescript-eslint/no-unsafe-member-access': 'off', // Disable for Deno environment
      '@typescript-eslint/no-unsafe-call': 'off', // Disable for Deno environment
      '@typescript-eslint/no-unsafe-return': 'off', // Disable for Deno environment
      '@typescript-eslint/no-unsafe-argument': 'off', // Disable for Deno environment
      '@typescript-eslint/require-await': 'off', // Edge Functions often have async without await
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Downgrade to warning
      '@typescript-eslint/no-floating-promises': 'warn', // Downgrade to warning
      'prettier/prettier': 'error',
    },
  },

  // Test files configuration
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        global: 'writable',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        File: 'readonly',
        console: 'readonly',
        require: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        globalThis: 'readonly',
        Deno: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'prefer-template': 'off',
      'object-shorthand': 'off',
      'prettier/prettier': 'error',
    },
  },

  // JavaScript configuration files and scripts
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'eslint.config.js',
      'tests/**/*.js',
      'scripts/**/*.js',
      'scripts/**/*.cjs',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'writable',
        jest: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        Buffer: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'supabase/.temp/**',
      'supabase/.branches/**',
      '**/*.sql', // All SQL files
      '*.log',
      '.env*',
      'types/database.ts', // Generated file
      'types/database.d.ts', // Generated declaration file
      'types/database.js', // Generated JS file
      '.github/workflows/**', // GitHub Actions workflows
      // Test files that import Deno-specific functions (excluded from main tsconfig)
      'tests/unit/bible-package-builder.test.ts',
      'tests/unit/bible-package-splitter.test.ts',
      'tests/integration/multi-package-system.test.ts',
    ],
  },
];
