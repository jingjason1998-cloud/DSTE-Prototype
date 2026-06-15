import js from '@eslint/js';
import globals from 'globals';
import html from 'eslint-plugin-html';
import security from 'eslint-plugin-security';

const baseSecurityRules = {
  // 核心安全规则
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-alert': 'warn',

  // eslint-plugin-security 规则
  'security/detect-object-injection': 'warn',
  'security/detect-eval-with-expression': 'error',
  'security/detect-non-literal-fs-filename': 'error',
  'security/detect-unsafe-regex': 'warn',
  'security/detect-buffer-noassert': 'warn',
  'security/detect-child-process': 'warn',
  'security/detect-disable-mustache-escape': 'error',
  'security/detect-no-csrf-before-method-override': 'error',
  'security/detect-non-literal-regexp': 'warn',
  'security/detect-non-literal-require': 'warn',
  'security/detect-possible-timing-attacks': 'warn',
  'security/detect-pseudoRandomBytes': 'error',
  // 插件未提供 detect-unsafe-innerhtml，用内置规则兜底
  'no-restricted-properties': ['warn', {
    property: 'innerHTML',
    message: 'Avoid innerHTML; use escapeHtml() or DOM creation instead',
  }, {
    property: 'outerHTML',
    message: 'Avoid outerHTML; use DOM creation instead',
  }],
};

const baseBestPracticeRules = {
  'no-var': 'warn',
  'prefer-const': 'warn',
  'eqeqeq': ['warn', 'always', { null: 'ignore' }],
  'no-throw-literal': 'warn',
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
  'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
  'max-params': ['warn', 4],
};

const relaxedQualityRules = {
  // 历史代码中大量存在，本次不阻塞 lint，后续逐步修复
  'no-useless-escape': 'warn',
  'no-empty': 'warn',
  'no-dupe-keys': 'warn',
  'no-regex-spaces': 'warn',
  'no-self-assign': 'warn',
  'no-case-declarations': 'warn',
  'no-redeclare': 'warn',
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'src/**/*.html', 'index.html', 'assets/**/*.js', 'public/**/*.js', 'import-issues.js', 'diagnose-*.js'],
    plugins: { html, security },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        DSTE: 'readonly',
        showToast: 'readonly',
        html2pdf: 'readonly',
        __APP_VERSION__: 'readonly',
        __BUILD_TIME__: 'readonly',
        XLSX: 'readonly',
      },
    },
    rules: {
      ...baseSecurityRules,
      ...baseBestPracticeRules,
      ...relaxedQualityRules,
    },
  },
  // 浏览器 IIFE 脚本（无 import/export）
  {
    files: ['assets/js/main.js', 'public/assets/js/main.js', 'diagnose-*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        DSTE: 'readonly',
        showToast: 'readonly',
        html2pdf: 'readonly',
        __APP_VERSION__: 'readonly',
        __BUILD_TIME__: 'readonly',
        XLSX: 'readonly',
      },
    },
  },
  // 测试文件
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      ...baseBestPracticeRules,
      'no-console': 'off',
    },
  },
  // Node/配置文件
  {
    files: ['*.config.js', '*.config.cjs', 'scripts/**/*.cjs', 'scripts/**/*.js', 'api-worker/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        crypto: 'readonly',
      },
    },
    rules: {
      ...baseBestPracticeRules,
      ...relaxedQualityRules,
      'no-console': 'off',
    },
  },
  // HTML 内联脚本跨 <script> 标签的函数定义无法被静态分析，关闭 no-undef
  {
    files: ['src/**/*.html', 'index.html'],
    rules: {
      'no-undef': 'off',
    },
  },
  // src/pages/ 下的 JS 是 HTML 页面的配套脚本，函数定义在 HTML 中，关闭 no-undef
  {
    files: ['src/pages/**/*.js'],
    rules: {
      'no-undef': 'off',
    },
  },
  // public/meetings-components/ 下的 JS 是 meetings.html 的配套组件，依赖页面全局函数，关闭 no-undef
  {
    files: ['public/meetings-components/**/*.js'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'api-worker/node_modules/**',
      '*.min.js',
      'scripts/generate-roadmap.cjs',
      'playwright-report/**',
      'test-results/**',
      '.pytest_cache/**',
      'eslint-report.json',
    ],
  },
];
