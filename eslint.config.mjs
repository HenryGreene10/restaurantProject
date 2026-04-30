import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

const REACT_APP_GLOBS = [
  'apps/web/**/*.{ts,tsx}',
  'apps/admin/**/*.{ts,tsx}',
  'apps/kiosk/**/*.{ts,tsx}',
]

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.prisma/**',
      '**/generated/**',
      'apps/pwa/**',
    ],
  },

  // JS baseline
  eslint.configs.recommended,

  // TypeScript rules for all TS/TSX files
  ...tseslint.configs.recommended,

  // React rules for frontend apps
  {
    files: REACT_APP_GLOBS,
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      'react/prop-types': 'off', // TypeScript covers this
      'react/no-unescaped-entities': 'off', // Noisy for UI copy; quotes in JSX text are valid
      // Calling async functions from useEffect is the standard pattern; the strict
      // "no setState in effect" rule in react-hooks v5 flags it as an error but it's not a bug.
      'react-hooks/set-state-in-effect': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Project-wide rule overrides
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Server-side logging is intentional
      'no-console': 'off',
    },
  }
)
