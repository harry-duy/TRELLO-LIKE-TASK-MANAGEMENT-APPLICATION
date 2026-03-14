module.exports = {
  root: true,
  ignorePatterns: ['dist/**'],
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['vite.config.js', 'postcss.config.js', 'tailwind.config.js'],
      env: {
        node: true,
      },
      globals: {
        __dirname: 'readonly',
      },
    },
  ],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
