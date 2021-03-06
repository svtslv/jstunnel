module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    "@typescript-eslint/no-unused-vars": ["error", { "varsIgnorePattern": "^_" }],
    "no-console": [2, { "allow": ["warn", "error"] }],
    'max-len': [
      'error',
      {
        'code': 120,
        'ignoreUrls': true,
        'ignoreComments': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true
      },
    ],
  },
};
