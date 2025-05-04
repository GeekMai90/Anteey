// src/renderer/src/extensions/SlashCommands.ts
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { Editor } from '@tiptap/core'
import type { Range } from '@tiptap/core'

interface CommandProps {
  editor: Editor
  range: Range
  props: {
    command: (props: { editor: Editor; range: Range }) => void
  }
}

interface SuggestionOptions {
  char: string
  command: (props: CommandProps) => void
}

export const SlashCommands = Extension.create<{ suggestion: SuggestionOptions }>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: CommandProps) => {
          props.command({ editor, range })
        }
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})
