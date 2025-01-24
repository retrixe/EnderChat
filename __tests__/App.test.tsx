/**
 * @format
 */

import React from 'react'
import ReactTestRenderer from 'react-test-renderer'
import App from '../src/App'

it('renders correctly', async () => {
  /* eslint-disable @typescript-eslint/no-deprecated */
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />)
  })
})
