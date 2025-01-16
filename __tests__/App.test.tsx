/**
 * @format
 */

import 'react-native'
import React from 'react'
import App from '../src/App'

// Note: import explicitly to use the types shipped with jest.
// eslint-disable-next-line n/no-extraneous-import
import { it } from '@jest/globals'

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer'

it('renders correctly', () => {
  renderer.create(<App />) // eslint-disable-line @typescript-eslint/no-deprecated
})
