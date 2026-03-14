module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'no-useless-escape': 'off',
    'no-inner-declarations': 'off',
  },
};
