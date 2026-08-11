// Flat ESLint config for the CLIENT project (src/ + root tooling).
//
// Scope: this covers the root npm project only. functions/ is a SEPARATE npm project with
// its own lockfile, its own node_modules and its own ESLint 8 + .eslintrc.cjs setup, run via
// `npm --prefix functions run lint`. The two never share a resolution tree, so the major
// version split (9 here, 8 there) is deliberate and safe — migrating functions/ would be
// scope creep with no payoff. Same for firestore-tests/.
//
// TRAP, worth knowing before editing: ESLint 9 flat config IGNORES --ext and lints only .js
// by default. The `files` glob below is the ONLY thing that pulls .ts/.tsx in. A config that
// matches nothing exits 0 and reports "no problems", which looks identical to a clean run.
// After any change to `files` or `ignores`, prove the config still matches by introducing a
// deliberate unused variable in a .tsx and checking it is reported.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    // Build output, vendored code, and the two sibling npm projects (which lint themselves).
    ignores: [
      'dist/',
      'dist-landing/',
      'functions/',
      'firestore-tests/',
      'node_modules/',
      'vendor/',
      '.firebase/',
      '**/*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  // Non-type-checked on purpose. The type-aware preset needs a full program per lint run,
  // which would duplicate `npm run typecheck` (already its own CI step) and turn a
  // sub-second lint into a full compile.
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Fast Refresh only works when a module exports components exclusively.
      // src/context/AuthContext.tsx already carries a disable comment for this rule.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Mirrors functions/.eslintrc.cjs. src/ currently has ZERO `any`, so this is a
      // ratchet against regression rather than a backlog to work down.
      '@typescript-eslint/no-explicit-any': 'warn',
      // tsconfig.app.json already enforces noUnusedLocals/noUnusedParameters, so this is
      // largely duplicate reporting — kept as a warn for the underscore escape hatch,
      // which tsc does not offer for intentionally-ignored bindings.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Client code ships to browsers; stray console calls leak internals and noise into
      // users' devtools. Four intentional sinks (ErrorBoundary, notifications dev log,
      // both firebase.ts App Check warnings) already carry disable comments written in
      // anticipation of this rule — enabling it makes those comments meaningful rather
      // than dead. warn/error stay allowed: they are for genuine faults.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Test files run under Vitest globals (describe/it/expect/vi) in a jsdom environment.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Project tooling runs in Node, not the browser, and console output is the point.
    //
    // BOTH global sets are supplied because these are Playwright scripts: the file itself
    // is Node, but the callbacks passed to page.evaluate() are serialised and executed in
    // the BROWSER, where document/window/getComputedStyle are correct and Node globals are
    // not. ESLint cannot see that boundary — it lints one file with one global scope — so
    // narrowing this to globals.node would produce 8 false no-undef errors on correct code.
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-console': 'off',
      // These scripts use `;(await page.getByRole(...).count()) ? ok(..) : bad(..)` as an
      // assertion idiom. Both branches call a function, so the expression is not unused —
      // the rule simply cannot tell a ternary-as-dispatch from a discarded value.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
)
