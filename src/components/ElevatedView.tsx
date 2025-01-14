import React from 'react'
import { View, type ViewStyle } from 'react-native'
import useDarkMode from '../context/useDarkMode'

const ElevatedView = (props: React.PropsWithChildren<{ style?: ViewStyle }>): JSX.Element => (
  <View
    {...props}
    style={Object.assign(
      {
        backgroundColor: useDarkMode() ? '#1c1c1c' : '#fefefe',
        borderColor: '#000',
        borderRadius: 6,
        borderWidth: 0,
        elevation: 2,
        overflow: 'hidden',
      },
      props.style ?? {},
    )}
  />
)

export default ElevatedView
