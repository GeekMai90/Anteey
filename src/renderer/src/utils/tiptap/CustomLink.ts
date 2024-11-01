import { Link } from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'
import { Node as ProsemirrorNode, Mark } from 'prosemirror-model'

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
      validate: (url: string) => {
        return /^(https?:\/\/|note:\/\/)/.test(url) || /^\[\[([0-9a-f-]+):(.+?)\]\]$/.test(url)
      }
    }
  },

  addStorage() {
    return {
      previousLinks: new Set<string>()
    }
  },

  onCreate() {
    // 初始化时收集当前文档中的所有链接
    const links = new Set<string>()
    this.editor.state.doc.descendants((node: ProsemirrorNode) => {
      if (node.type.name === 'text' && node.marks.length > 0) {
        node.marks.forEach((mark: Mark) => {
          if (mark.type.name === 'link' && mark.attrs.href?.startsWith('note://')) {
            const noteId = mark.attrs['data-note-id']
            if (noteId) {
              links.add(noteId)
            }
          }
        })
      }
    })
    this.storage.previousLinks = links
  },

  onUpdate() {
    // 获取当前文档中所有的引用链接
    const currentLinks = new Set<string>()
    this.editor.state.doc.descendants((node: ProsemirrorNode) => {
      if (node.type.name === 'text' && node.marks.length > 0) {
        node.marks.forEach((mark: Mark) => {
          if (mark.type.name === 'link' && mark.attrs.href?.startsWith('note://')) {
            const noteId = mark.attrs['data-note-id']
            if (noteId) {
              currentLinks.add(noteId)
            }
          }
        })
      }
    })

    // 对比找出被删除的链接
    const deletedLinks = Array.from(this.storage.previousLinks).filter(
      (id) => !currentLinks.has(id as string)
    )

    // 处理删除的链接
    if (deletedLinks.length > 0 && this.options.noteId) {
      deletedLinks.forEach((targetNoteId) => {
        setTimeout(async () => {
          try {
            await window.electronAPI.deleteNoteReference({
              sourceNoteId: this.options.noteId!,
              targetNoteId: targetNoteId as string
            })
            console.log('引用关系删除成功:', targetNoteId)
          } catch (error) {
            console.error('删除引用关系失败:', error)
          }
        }, 0)
      })
    }

    // 更新存储的链接集合
    this.storage.previousLinks = currentLinks
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      href: { default: null },
      target: { default: null },
      class: { default: null },
      'data-note-id': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => {
          if (!attributes['data-note-id']) {
            return {}
          }
          return { 'data-note-id': attributes['data-note-id'] }
        }
      }
    }
  },

  addPasteRules() {
    return [
      {
        find: /\[\[([0-9a-f-]+):(.+?)\]\]/g,
        handler: ({ state, range, match }) => {
          // 解构匹配结果
          const [, noteId, title] = match
          const currentNoteId = this.options.noteId

          // 1. 创建链接节点
          const href = `note://${noteId}`
          const mark = this.type.create({
            href,
            class: 'note-reference-link',
            'data-note-id': noteId
          })

          // 2. 获取引用上下文（前后50个字符）
          const contextStart = Math.max(0, range.from - 50)
          const contextEnd = Math.min(state.doc.content.size, range.to + 50)
          const context = state.doc.textBetween(contextStart, contextEnd)

          // 3. 创建并插入节点
          const text = state.schema.text(title)
          const node = text.mark([mark])
          state.tr.replaceWith(range.from, range.to, node)

          // 4. 创建引用关系（异步操作移到外部）
          if (currentNoteId) {
            setTimeout(async () => {
              try {
                await window.electronAPI.createNoteReference({
                  sourceNoteId: currentNoteId,
                  targetNoteId: noteId,
                  type: 'reference',
                  context: {
                    text: context,
                    position: range.from
                  },
                  metadata: {
                    title,
                    preview: context,
                    cardType: 'reference'
                  }
                })
              } catch (error) {
                console.error('创建引用关系失败:', error)
              }
            }, 0)
          }
        }
      },
      ...(this.parent?.() || [])
    ]
  },

  parseHTML() {
    return [{ tag: 'a[href]:not([href *= "javascript:" i])' }]
  },

  renderHTML({ HTMLAttributes }) {
    // 处理不同类型的链接
    if (HTMLAttributes.href?.startsWith('note://')) {
      HTMLAttributes.class = (HTMLAttributes.class || '') + ' note-reference-link'
      // 添加交互属性
      HTMLAttributes['data-tooltip'] = '点击查看笔记'
      HTMLAttributes['role'] = 'button'
    }

    return ['a', mergeAttributes(HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-k': () => {
        // 这里可以添加自定义的链接插入逻辑
        return true
      }
    }
  }
})

// 添加样式
const style = document.createElement('style')
style.textContent = `
  .note-reference-link {
    color: var(--note-link-color, #3b82f6);
    text-decoration: none;
    border-bottom: 1px dashed currentColor;
    cursor: pointer;
  }
  
  .note-reference-link:hover {
    background-color: rgba(59, 130, 246, 0.1);
  }
`
document.head.appendChild(style)
