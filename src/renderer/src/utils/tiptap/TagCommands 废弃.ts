import { Editor, Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from 'prosemirror-state' // 导入 PluginKey

const tagSuggestionKey = new PluginKey('tagSuggestion')
export const TagCommands = Extension.create({
  name: 'tagCommands',

  addOptions() {
    return {
      suggestion: {
        char: '#',
        pluginKey: tagSuggestionKey, // 使用 PluginKey 实例
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: any }) => {
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
