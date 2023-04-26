module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'import'],
  ignorePatterns: ['*.cjs'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  env: {
    browser: true,
    es2017: true,
    es2022: true,
    node: true,
  },
  rules: {
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        pathGroups: [
          {
            pattern: '~/**',
            group: 'external',
          },
        ],
      },
    ],

    curly: 2,
    'dot-notation': 2,
    'id-length': 2,
    'no-const-assign': 2,
    'no-dupe-class-members': 2,
    'no-else-return': 2,
    'no-inner-declarations': 2,
    'no-lonely-if': 2,
    'no-magic-numbers': [
      2,
      {
        ignore: [-1, 0, 1],
      },
    ],
    'no-shadow': 2,
    'no-unneeded-ternary': 2,
    'no-unused-expressions': 2,
    'no-unused-vars': [
      2,
      {
        args: 'none',
      },
    ],
    'no-useless-return': 2,
    'no-var': 2,
    'one-var': [2, 'never'],
    'prefer-arrow-callback': 2,
    'prefer-const': 2,
    'prefer-promise-reject-errors': 2,
    'prettier/prettier': 2,
    'sort-imports': 2,
    'sort-keys': [
      2,
      'asc',
      {
        caseSensitive: true,
        natural: true,
      },
    ],
    'sort-vars': 2,
    strict: [2, 'global'],
  },
};
