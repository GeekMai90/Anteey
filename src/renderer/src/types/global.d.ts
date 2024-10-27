declare module 'lodash-es'
declare module 'leader-line'
declare module 'leader-line-vue'
declare module 'canvas-confetti'
declare module 'vue3-shortkey'
declare module 'vue-virtual-scroller'
declare module 'qrcode'
declare module 'segmentit'
declare module '@themaximalist/embeddings.js'
declare module '@themaximalist/embeddings'
// 为 slashCommandSuggestion 添加类型声明
declare module 'tiptap/slashCommandSuggestion' {
  import { Editor, Range } from '@tiptap/core'
  import { Component } from 'vue'

  interface Command {
    title: string
    icon: Component
    command: ({ editor, range }: { editor: Editor; range: Range }) => void
  }

  interface Separator {
    type: 'separator'
    title: string
  }

  type CommandItem = Command | Separator

  interface SuggestionProps {
    editor: Editor
    range: Range
    query: string
    clientRect: () => DOMRect
    event: KeyboardEvent
  }

  interface SlashCommandSuggestion {
    items: (props: { query: string }) => CommandItem[]
    render: () => {
      onStart: (props: SuggestionProps) => void
      onUpdate: (props: SuggestionProps) => void
      onKeyDown: (props: SuggestionProps) => boolean
      onExit: () => void
    }
  }

  const slashCommandSuggestion: SlashCommandSuggestion
  export { slashCommandSuggestion }
}
