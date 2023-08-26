import React, { useCallback } from 'react'
import { FlatList, StyleSheet, type ListRenderItem } from 'react-native'
import {
  ChatToJsx,
  type MinecraftChat,
  type ClickEvent,
  type ColorMap
} from '../../minecraft/chatToJsx'
import Text from '../../components/Text'

export interface Message {
  key: number
  text: MinecraftChat
}

const MessageRenderer = (props: {
  item: Message
  colorMap: ColorMap
  clickEventHandler: (event: ClickEvent) => void
}): JSX.Element => (
  <ChatToJsx
    chat={props.item.text}
    component={Text}
    colorMap={props.colorMap}
    clickEventHandler={props.clickEventHandler}
  />
)

const MessageRendererMemo = React.memo(
  MessageRenderer,
  (prev, next) =>
    prev.item.key === next.item.key &&
    prev.colorMap === next.colorMap &&
    prev.clickEventHandler === next.clickEventHandler
)

const ChatMessageList = (props: {
  messages: Message[]
  colorMap: ColorMap
  clickEventHandler: (ce: ClickEvent) => void
}): JSX.Element => {
  // If colorMap/clickEventHandler changes, this will change and cause a re-render.
  // If messages changes, FlatList will execute this function for all messages, and
  // ItemRendererMemo will check if props have changed instead of this useCallback.
  const renderItem = useCallback<ListRenderItem<Message>>(
    ({ item }) => (
      <MessageRendererMemo
        item={item}
        colorMap={props.colorMap}
        clickEventHandler={props.clickEventHandler}
      />
    ),
    [props.colorMap, props.clickEventHandler]
  )
  return (
    <FlatList
      inverted
      data={props.messages}
      style={styles.chatArea}
      contentContainerStyle={styles.chatAreaScrollView}
      renderItem={renderItem}
    />
  )
}

const styles = StyleSheet.create({
  chatArea: { padding: 8, flex: 1 },
  chatAreaScrollView: { paddingBottom: 16 }
})

export default ChatMessageList
