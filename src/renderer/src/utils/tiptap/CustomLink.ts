// import { Link } from '@tiptap/extension-link'

// export const CustomLink = Link.extend({
//   name: 'link',

//   addOptions() {
//     return {
//       ...this.parent?.(),
//       openOnClick: false,
//       linkOnPaste: true,
//       validate: (url: string) => /^(https?:\/\/|note:\/\/)/.test(url)
//     }
//   },

//   parseHTML() {
//     return [{ tag: 'a[href]:not([href *= "javascript:" i])' }]
//   },

//   renderHTML({ HTMLAttributes }) {
//     return ['a', HTMLAttributes, 0]
//   }
// })
import { Link } from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'
import { useNoteStore } from '../../stores/note-store'

// 扩展 LinkOptions 类型
interface CustomLinkOptions {
  noteId?: string
  openOnClick: boolean
  linkOnPaste: boolean
  validate: (url: string) => boolean
}

export const CustomLink = Link.extend<CustomLinkOptions>({
  name: 'link',

  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      linkOnPaste: true,
      noteId: '',
      // 修改验证规则，增加对引用格式的支持
      validate: (url: string) => {
        // 支持普通链接和笔记引用两种格式
        return /^(https?:\/\/|note:\/\/)/.test(url) || /^\[\[([0-9a-f-]+):(.+?)\]\]$/.test(url)
      }
    }
  },

  addPasteRules() {
    const noteStore = useNoteStore()
    return [
      {
        find: /\[\[([0-9a-f-]+):(.+?)\]\]/g,
        handler: ({ state, range, match }) => {
          // 解构匹配结果，忽略 fullMatch
          const [, noteId, title] = match

          // 创建笔记引用链接
          const href = `note://${noteId}`

          // 使用 this.type.create() 创建标记
          const mark = this.type.create({ href })

          // 创建文本节点并应用标记
          const text = state.schema.text(title)
          const node = text.mark([mark])

          // 获取当前编辑的笔记 ID
          const currentNoteId = this.options.noteId

          if (currentNoteId) {
            console.log('当前编辑的笔记 ID:', currentNoteId)
            console.log('目标笔记 ID:', noteId)
            // 创建引用关系

            noteStore.createNoteReference(currentNoteId, noteId)
          }

          // 插入节点
          state.tr.replaceWith(range.from, range.to, node)
        }
      },
      ...(this.parent?.() || []) // 修复父类规则的获取
    ]
  },

  parseHTML() {
    return [{ tag: 'a[href]:not([href *= "javascript:" i])' }]
  },

  renderHTML({ HTMLAttributes }) {
    // 为引用链接添加特殊的样式类
    if (HTMLAttributes.href?.startsWith('note://')) {
      HTMLAttributes.class = 'note-reference-link'
    }
    return ['a', mergeAttributes(HTMLAttributes), 0]
  }
})
