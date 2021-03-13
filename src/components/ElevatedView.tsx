import React from 'react'
import { View, ViewStyle } from 'react-native'

const ElevatedView = (
  props: React.PropsWithChildren<{ style?: ViewStyle }>
) => (
  <View
    {...props}
    style={Object.assign(
      {
        backgroundColor: '#fefefe',
        borderColor: '#000',
        borderRadius: 6,
        borderWidth: 0,
        elevation: 2,
        overflow: 'hidden'
      },
      props.style || {}
    )}
  />
)

export default ElevatedView
