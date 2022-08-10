import React from 'react'
import { StyleProp, TextProps, TextStyle } from 'react-native'
import translations from './translations'

export const mojangColorMap: ColorMap = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF'
}

export const lightColorMap: ColorMap = {
  ...mojangColorMap,
  white: '#000000',
  green: '#55c855',
  gray: '#999999',
  yellow: '#b9b955',
  aqua: '#55cdcd'
}

export interface ColorMap {
  [color: string]: string
  black: string
  dark_blue: string
  dark_green: string
  dark_aqua: string
  dark_red: string
  dark_purple: string
  gold: string
  gray: string
  dark_gray: string
  blue: string
  green: string
  aqua: string
  red: string
  light_purple: string
  yellow: string
  white: string
}

export interface BaseChat {
  bold?: boolean
  color?: string
  italic?: boolean
  obfuscated?: boolean
  underlined?: boolean
  strikethrough?: boolean
  extra?: PlainTextChat[]
  insertion?: string
  clickEvent?: ClickEvent
  hoverEvent?: HoverEvent
}

export interface PlainTextChat extends BaseChat {
  text?: string
}

export interface TranslatedChat {
  translate: string
  with: string | PlainTextChat[]
}

export type MinecraftChat = PlainTextChat | TranslatedChat | string

export interface ClickEvent {
  action:
    | 'open_url'
    | 'open_file'
    | 'run_command'
    | 'suggest_command'
    | 'change_page'
    | 'copy_to_clipboard'
  value: string
}

// LOW-TODO: How can we display this in EnderChat?
export interface HoverEvent {
  action: 'show_text' | 'show_item' | 'show_entity' | 'show_achievement' // <1.12
  value: MinecraftChat
}

const hasColorCodes = (s: string) => /§[0-9a-fk-orx]/.test(s)
// const stripColorCodes = (s: string) => s.replace(/§[0-9a-fk-orx]/g, '').trim()
const parseColorCodes = (arg: string | PlainTextChat): PlainTextChat[] => {
  let s: string
  let state: PlainTextChat = { text: '' }
  if (typeof arg !== 'string') {
    state = arg
    state.text = ''
    s = arg.text ?? ''
  } else s = arg
  const components: PlainTextChat[] = []
  for (let i = 0; i < s.length; i++) {
    const char = s[i]
    if (char === '§') {
      if (i + 1 === s.length) continue
      const info = s[i + 1]
      if (i > 0) {
        // Move the state into array.
        components.push(Object.assign({}, state))
      }
      // Clear text in state.
      state.text = ''
      // Apply new properties to state.
      if (info === 'k') state.obfuscated = true
      else if (info === 'l') state.bold = true
      else if (info === 'm') state.strikethrough = true
      else if (info === 'n') state.underlined = true
      else if (info === 'o') state.italic = true
      else if (info === 'r') {
        state = { text: '' }
      } else if (info === '0') state = { text: '', color: 'black' }
      else if (info === '1') state = { text: '', color: 'dark_blue' }
      else if (info === '2') state = { text: '', color: 'dark_green' }
      else if (info === '3') state = { text: '', color: 'dark_aqua' }
      else if (info === '4') state = { text: '', color: 'dark_red' }
      else if (info === '5') state = { text: '', color: 'dark_purple' }
      else if (info === '6') state = { text: '', color: 'gold' }
      else if (info === '7') state = { text: '', color: 'gray' }
      else if (info === '8') state = { text: '', color: 'dark_gray' }
      else if (info === '9') state = { text: '', color: 'blue' }
      else if (info === 'a') state = { text: '', color: 'green' }
      else if (info === 'b') state = { text: '', color: 'aqua' }
      else if (info === 'c') state = { text: '', color: 'red' }
      else if (info === 'd') state = { text: '', color: 'light_purple' }
      else if (info === 'e') state = { text: '', color: 'yellow' }
      else if (info === 'f') state = { text: '', color: 'white' }
    } else if (i > 0 && s[i - 1] === '§') continue
    else state.text += char
  }
  components.push(state)
  return components
}

const trimLines = (s: string) =>
  s.includes('\n')
    ? s
        .split('\n')
        .map(k => k.trim())
        .join('\n')
    : s.trimLeft() // LOW-TODO: This is problematic, temporary workaround until this can be refined.

const flattenExtraComponents = (chat: PlainTextChat): PlainTextChat[] => {
  const { extra, ...c } = chat
  const arr =
    c.text && hasColorCodes(c.text)
      ? parseColorCodes(c.text).map(e => ({ ...c, ...e }))
      : c.text
      ? [c]
      : []
  if (!extra) return arr
  const flattenedExtra = extra.flatMap(e =>
    flattenExtraComponents({ ...c, ...e })
  )
  return [...arr, ...flattenedExtra]
}

const parseChatToJsx = (
  chat: MinecraftChat,
  Component: React.ComponentType<TextProps>,
  colorMap: ColorMap,
  clickEventHandler: (clickEvent: ClickEvent) => void = () => {},
  componentProps?: {},
  trim = false
) => {
  if (chat && typeof chat !== 'string' && (chat as TranslatedChat).translate) {
    const translatedChat = chat as TranslatedChat
    if (!translatedChat.with) translatedChat.with = []
    const translation = translations[translatedChat.translate]
      ?.split('%s')
      ?.map((text, index) => {
        let insert = translatedChat.with[index]
        if (typeof insert === 'string') insert = { text: insert }
        return [{ text }, insert]
      })
      ?.flat()
      ?.filter(component => !!component)
    chat = {
      extra: translation ?? [
        { text: `[EnderChat] Unknown translation ${translatedChat.translate}.` }
      ]
    }
  }
  const flat =
    typeof chat === 'string'
      ? parseColorCodes(chat)
      : flattenExtraComponents(chat as PlainTextChat)
  return (
    <Component {...componentProps}>
      {flat.map((c, i) => {
        const style: StyleProp<TextStyle> = {}
        if (c.bold) style.fontWeight = 'bold'
        if (c.italic) style.fontStyle = 'italic'
        if (c.obfuscated) c.text = (c.text || '').replace(/./g, '▒')
        if (c.underlined && c.strikethrough) {
          style.textDecorationLine = 'underline line-through'
        } else if (c.underlined) style.textDecorationLine = 'underline'
        else if (c.strikethrough) style.textDecorationLine = 'line-through'

        if (c.color && c.color.startsWith('#')) style.color = c.color
        else if (c.color && colorMap[c.color]) style.color = colorMap[c.color]

        const ce = c.clickEvent
        return (
          <Component
            key={i}
            style={style}
            selectable
            onPress={ce ? () => clickEventHandler(ce) : undefined}
            onLongPress={() => {}}
          >
            {c.text ? (trim ? trimLines(c.text) : c.text) : ''}
          </Component>
        )
      })}
    </Component>
  )
}

// React Component-ised.
const ChatToJsxNonMemo = (props: {
  chat?: MinecraftChat
  component: React.ComponentType<TextProps>
  colorMap: ColorMap
  componentProps?: {}
  clickEventHandler?: (clickEvent: ClickEvent) => void
  trim?: boolean
}) =>
  parseChatToJsx(
    props.chat ?? { text: '' },
    props.component,
    props.colorMap,
    props.clickEventHandler,
    props.componentProps,
    props.trim
  )
// Memoisation means this is only re-rendered if the props changed.
// TODO: This might be hurting memory usage.
export const ChatToJsx = React.memo(ChatToJsxNonMemo)

export const parseValidJson = (text: string) => {
  try {
    return JSON.parse(text)
  } catch (e) {
    return text
  }
}

export default parseChatToJsx
