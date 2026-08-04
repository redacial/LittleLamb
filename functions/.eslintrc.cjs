// Node-scoped lint for the Cloud Functions package (separate from the client's DOM-scoped config).
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['lib/', 'node_modules/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
