module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:security/recommended',
  ],
  plugins: [
    'security',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // 安全规则（关键）
    'security/detect-object-injection': 'error',
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

    // 代码质量
    'no-unused-vars': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-alert': 'warn',  // 提醒使用自定义弹窗替代 alert
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // 复杂度（与 SonarQube 配合）
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
  },
  // HTML 文件中内联脚本的检查
  overrides: [
    {
      files: ['src/**/*.html'],
      processor: 'html/html',
      rules: {
        // HTML 中内联脚本的特殊规则
        'no-unused-vars': 'off',  // 内联脚本可能有全局函数
      },
    },
  ],
  // 忽略路径
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'playwright-report/',
    'test-results/',
    '.pytest_cache/',
    '*.bak',
  ],
};
