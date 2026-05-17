const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-docker/**',
      'node_modules/**',
      'docs/**',
      'webpack/**',
      'src/vendor/**',
      'src/__tests__/mocks/**',
      'src/__tests__/jest.setup.js',
      '*.config.js'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        PACKAGE_VERSION: 'readonly',
        REPOSITORY_URL: 'readonly'
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/function-component-definition': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
      'react/no-unused-prop-types': 'warn',
      'consistent-return': 'off',
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['draft'] }],
      'arrow-body-style': ['error', 'always'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react/jsx-key': 'warn',
      // eslint-plugin-react-hooks v6+ React-Compiler-style analysis. Enforced
      // at `error` after the QUA-03 cleanup pass that prepared the codebase
      // for React 19.
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/set-state-in-render': 'error',
      // The classic dependency-array check. Promoted from the
      // plugin's `recommended` default of `warn` to `error` to match
      // the three sibling rules above — the codebase currently
      // passes with zero hits, so this just locks the invariant in.
      'react-hooks/exhaustive-deps': 'error'
    }
  },
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
);
