import { Extension } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'
import { PluginKey } from 'prosemirror-state'
import { mentionSuggestion } from './mentionSuggestion'

// 扩展 EditorOptions 类型
declare module '@tiptap/core' {
  interface EditorOptions {
    noteId?: string
  }
}

// 创建一个唯一的插件键
const MentionPluginKey = new PluginKey('mention-suggestion')

export interface MentionResult {
  id: string
  title: string
  address: string
  cardType?: string
}

interface MentionOptions {
  suggestion: Partial<SuggestionOptions<MentionResult>>
}

export const CustomMention = Extension.create<MentionOptions>({
  name: 'mention',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        pluginKey: MentionPluginKey,
        command: async ({ editor, range, props }) => {
          console.log('Mention command triggered with props:', props)

          // 删除 @ 字符和后面的搜索文本
          editor.chain().focus().deleteRange(range).run()

          // 获取当前节点的文本内容作为上下文
          const { state } = editor
          const $pos = state.doc.resolve(range.from)
          const currentNode = $pos.node()
          const context = currentNode.textContent || props.title
          console.log('Context:', context)

          // 插入双链格式的文本
          const linkText = props.title || props.address
          console.log('Inserting link text:', linkText)
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'text',
              text: linkText,
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: `note://${props.id}`,
                    class: 'note-reference-link',
                    'data-note-id': props.id
                  }
                }
              ]
            })
            .run()
        },
        ...mentionSuggestion
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
