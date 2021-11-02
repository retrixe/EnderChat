import React from 'react'
import { StyleProp, TextProps, TextStyle } from 'react-native'

// TODO: Add a better color map for light mode, as Mojang color map is terrible.

export const mojangColorMap: { [color: string]: string } = {
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
  // HoverEvent unsupported atm.
}

export interface PlainTextChat extends BaseChat {
  text?: string
}

export interface TranslatedChat extends PlainTextChat {
  translate: string
  with: PlainTextChat[]
}

export interface ClickEvent {
  // TODO: Build actual support for this.
  action:
    | 'open_url'
    | 'open_file'
    | 'run_command'
    | 'suggest_command'
    | 'change_page'
    | 'copy_to_clipboard'
  value: string
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
    : s.trimLeft() // TODO: This is problematic, temporary workaround until this can be refined.

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

// TODO: Support chat.type.* translations.
const parseChatToJsx = (
  chat: PlainTextChat | string,
  Component: React.ComponentType<TextProps>,
  colorMap: { [color: string]: string },
  componentProps?: {}
) => {
  const flat =
    typeof chat === 'string'
      ? parseColorCodes(chat)
      : flattenExtraComponents(chat)
  return (
    <Component {...componentProps}>
      {flat.map((c, i) => {
        const style: StyleProp<TextStyle> = {}
        if (c.bold) style.fontWeight = 'bold'
        if (c.italic) style.fontStyle = 'italic'
        // TODO: if (c.obfuscated) style.color = 'transparent'
        if (c.underlined && c.strikethrough) {
          style.textDecorationLine = 'underline line-through'
        } else if (c.underlined) style.textDecorationLine = 'underline'
        else if (c.strikethrough) style.textDecorationLine = 'line-through'

        if (c.color && c.color.startsWith('#')) style.color = c.color
        else if (c.color && colorMap[c.color]) style.color = colorMap[c.color]

        return (
          <Component key={i} style={style}>
            {c.text ? trimLines(c.text) : ''}
          </Component>
        )
      })}
    </Component>
  )
}

export default parseChatToJsx
