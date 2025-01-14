import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import standardJsx from 'eslint-config-standard-jsx'
import standardReact from 'eslint-config-standard-react'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import pluginPromise from 'eslint-plugin-promise'
import nodePlugin from 'eslint-plugin-n'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

// React Native
import reactNative from '@react-native/eslint-config'
import eslintComments from 'eslint-plugin-eslint-comments'
import reactNativePlugin from 'eslint-plugin-react-native'
import jest from 'eslint-plugin-jest'

export default tseslint.config(
  {
    ignores: ['.yarn', '.prettierrc.js', '*.config.{mjs,js}', 'node_modules']
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  react.configs.flat.recommended,
  pluginPromise.configs['flat/recommended'],
  importPlugin.flatConfigs.recommended, // Could use TypeScript resolver
  nodePlugin.configs['flat/recommended-module'],
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules
  },
  // The React Native ESLint config hasn't been updated to v9, so this is a bunch of hackery
  {
    // Try to fix import -- settings: { 'import/parsers': { [babelParser]: ['.js', '.jsx'] } },
    languageOptions: {
      globals: reactNative.globals
    },
    plugins: {
      'eslint-comments': eslintComments,
      'react-native': reactNativePlugin,
      jest
    },
    rules: Object.assign(reactNative.rules, reactNative.overrides[2].rules, {
      'react-native/no-inline-styles': 'off',
      // These import rules try to load React Native which is written in Flow...
      'import/named': 'off',
      'import/namespace': 'off'
    })
  },
  { rules: standardJsx.rules },
  { rules: standardReact.rules },
  eslintPluginPrettierRecommended,
  {
    settings: { react: { version: 'detect' } },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-import-type-side-effects': ['error'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
          fixStyle: 'inline-type-imports'
        }
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: true, // TODO: Turn this off!
          allowNumber: true,
          allowRegExp: false,
          allowNever: false
        }
      ],
      'promise/always-return': ['error', { ignoreLastCallback: true }],
      'n/no-missing-import': 'off',
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'import/no-unresolved': 'off',
      // TODO: Enable these
      'promise/no-nesting': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/await-types': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'promise/catch-or-return': 'off',
      'n/no-extraneous-import': 'off',
      'no-empty': 'off',
      'no-bitwise': 'off',
      'prefer-const': 'off'
    }
  }
)
