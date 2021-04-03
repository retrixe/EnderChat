import React from 'react'

export interface PlainTextChat {
  text: string
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

// const hasColorCodes = (s: string) => /§[0-9a-fk-orx]/.test(s)
const stripColorCodes = (s: string) => s.replace(/§[0-9a-fk-orx]/g, '').trim() // TODO: Parse instead.
const trimLines = (s: string) =>
  s
    .split('\n')
    .map(k => k.trim())
    .join('\n')
const flattenExtraComponents = (chat: PlainTextChat): PlainTextChat[] => {
  if (!chat.extra) return [chat]
  const { extra, ...c } = chat
  return [
    c,
    ...extra.flatMap(e => {
      return flattenExtraComponents(Object.assign(c, e))
    })
  ]
}

const parseChatToJsx = (
  chat: PlainTextChat | string,
  Component: React.ComponentType,
  componentProps?: {}
) => {
  if (typeof chat === 'string') {
    return (
      <Component {...componentProps}>
        {trimLines(stripColorCodes(chat))}
      </Component>
    )
  }
  const flat = flattenExtraComponents(chat)
  return flat.map((c, i) => (
    <Component key={i} {...componentProps}>
      {trimLines(stripColorCodes(c.text))}
    </Component>
  ))
}

export default parseChatToJsx
