import React from 'react'
import { StyleSheet, View } from 'react-native'
import {
  ChatToJsx,
  type ClickEvent,
  type ColorMap,
  type MinecraftChat,
} from '../../minecraft/chatToJsx'
import Text from '../Text'
import useDarkMode from '../../context/useDarkMode'

const ActionBar: React.FC<{
  content: MinecraftChat
  colorMap: ColorMap
  onClickEvent: (ce: ClickEvent) => void
}> = props => {
  return (
    <View style={[useDarkMode() ? styles.actionBarDark : styles.actionBarLight, styles.actionBar]}>
      <ChatToJsx
        chat={props.content}
        component={Text}
        colorMap={props.colorMap}
        onClickEvent={props.onClickEvent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  actionBar: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBarLight: { backgroundColor: '#fff' },
  actionBarDark: { backgroundColor: '#242424' },
})

export default ActionBar
