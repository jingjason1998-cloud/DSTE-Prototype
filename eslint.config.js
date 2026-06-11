import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'src/**/*.html', 'api-worker/**/*.js'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Meetings page globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URLSearchParams: 'readonly',
        EventSource: 'readonly',
      },
    },
    rules: {
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Best practices
      'no-var': 'warn',
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-throw-literal': 'warn',
      
      // Style (prettier handles formatting, these are logic/style)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      
      // Complexity
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 4],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'api-worker/node_modules/**',
      '*.min.js',
      'scripts/generate-roadmap.cjs',
    ],
  },
];
