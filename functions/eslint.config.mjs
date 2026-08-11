// Node-scoped flat lint config for the Cloud Functions package, separate from the client's
// DOM-scoped config at the repo root.
//
// WHY THIS FILE EXISTS (and why .eslintrc.cjs was deleted): ESLint resolves config by walking
// UP the directory tree. Once a flat `eslint.config.js` existed at the repo root, ESLint
// switched this package into flat-config mode too — which silently ignored the legacy
// `.eslintrc.cjs` here and made `eslint . --ext .ts` fail outright, since flat mode dropped
// --ext. That broke `npm --prefix functions run lint`, which firebase.json runs as a PREDEPLOY
// hook, so `firebase deploy --only functions` aborted before uploading anything.
//
// A local flat config fixes it at the root cause: this package now defines its own config in
// the same format, so nothing leaks down from above.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['lib/', 'node_modules/'] },
  js.configs.recommended,
  // Non-type-checked, matching the root config: the type-aware preset would duplicate the
  // `tsc -b` build step that already runs on every deploy and in CI.
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Carried over verbatim from the .eslintrc.cjs this file replaces.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
)
