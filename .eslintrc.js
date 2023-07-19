// well....
if (require('eslint-config-standard-with-typescript/package.json').version === '36.1.0') {
  console.log('Patching eslint-config-standard-with-typescript for TypeScript ESLint 6 support.')
  const fs = require('fs')
  const path = require('path')
  const target = path.join(__dirname, 'node_modules', 'eslint-config-standard-with-typescript', 'lib', 'index.js')
  const contents = fs.readFileSync(target, { encoding: 'utf8' }).split('\n')
    .filter(line => !line.includes('restrict-plus-operands'))
    .join('\n')
  fs.writeFileSync(target, contents, { encoding: 'utf8' })
}

module.exports = {
  root: true,
  extends: [
    '@react-native',
    'plugin:react/recommended',
    'standard-with-typescript',
    'standard-react',
    'standard-jsx'
  ],
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    // React Hooks rules.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Make TypeScript ESLint less strict.
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/no-dynamic-delete': 'off',
    // TODO: Remove these down the line.
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/no-confusing-void-expression': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-indexed-object-style': 'off',
    // Adjust to Prettier's presence. (Maybe we should do away with it later.)
    '@typescript-eslint/space-before-function-paren': 'off',
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/indent': 'off',
    'multiline-ternary': 'off',
    // Bitwise operations are necessary in this project.
    'no-bitwise': 'off'
  }
}
