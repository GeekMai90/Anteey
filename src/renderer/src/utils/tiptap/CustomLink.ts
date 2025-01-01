import { Link } from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'
import { Node as ProsemirrorNode, Mark } from 'prosemirror-model'
import { useNoteStore } from '../../stores/noteStores'
import { useEventBus } from '@vueuse/core'

// 创建一个事件总线实例
const referencesUpdatedBus = useEventBus('references-updated')

// 扩展 LinkOptions 类型
interface CustomLinkOptions {
  noteId?: string
  openOnClick: boolean
  linkOnPaste: boolean
  validate: (url: string) => boolean
}

export const CustomLink = Link.extend<CustomLinkOptions>({
  name: 'link',
  inclusive: true, // 设置为 true，使链接作为一个整体

  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      linkOnPaste: true,
      noteId: '',
      validate: (url: string) => {
        return (
          /^(https?:\/\/|note:\/\/|x-devonthink-item:\/\/)/.test(url) ||
          /^\[\[([0-9a-f-]+):(.+?)\]\]$/.test(url)
        )
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
      const noteStore = useNoteStore()
      const currentNoteId = this.options.noteId

      deletedLinks.forEach((targetNoteId) => {
        setTimeout(async () => {
          try {
            await noteStore.deleteNoteReference({
              sourceNoteId: currentNoteId,
              targetNoteId: targetNoteId as string
            })
            console.log('引用关系删除成功:', targetNoteId)

            // 删除引用关系后触发更新事件
            referencesUpdatedBus.emit(currentNoteId)
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
        // 添加 DevonThink 链接的识别规则
        find: /(x-devonthink-item:\/\/[A-F0-9-]+)/g,
        handler: ({ state, range, match }) => {
          const [url] = match
          const mark = this.type.create({
            href: url,
            class: 'devonthink-link'
          })

          const text = state.schema.text(url)
          const node = text.mark([mark])
          state.tr.replaceWith(range.from, range.to, node)
        }
      },
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

          // 2. 获取当前节点的文本内容作为上下文
          const $pos = state.doc.resolve(range.from)
          const currentNode = $pos.node()
          const context = currentNode.textContent || title // 如果节点没有文本内容，就使用标题作为上下文

          // 3. 创建并插入节点
          const text = state.schema.text(title)
          const node = text.mark([mark])
          state.tr.replaceWith(range.from, range.to, node)

          // 4. 创建引用关系（异步操作移到外部）
          if (currentNoteId) {
            setTimeout(async () => {
              try {
                const noteStore = useNoteStore()
                // 先获取目标笔记的信息
                const targetNote = await noteStore.fetchNote(noteId)

                await noteStore.createNoteReference({
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
                    cardType: targetNote?.cardType, // 使用目标笔记的类型
                    address: targetNote?.address // 同时也添加地址
                  }
                })

                // 使用外部创建的事件总线实例
                referencesUpdatedBus.emit(currentNoteId)
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
      HTMLAttributes['data-tooltip'] = `
      点击: 在右侧边栏查看
      Alt + 点击: 在主编辑器打开
      Command/Ctrl + 点击: 链接设置
    `.trim()
      HTMLAttributes['role'] = 'button'
    } else if (HTMLAttributes.href?.startsWith('x-devonthink-item://')) {
      HTMLAttributes.class = (HTMLAttributes.class || '') + ' devonthink-link'
      HTMLAttributes['data-tooltip'] = '点击打开 DevonThink 中的项目'
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
      },
      // 添加退格键处理
      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection
        if (!empty) return false

        // 检查光标前面的标记
        const marks = $anchor.nodeBefore?.marks || []
        const linkMark = marks.find((mark) => mark.type.name === 'link')

        if (linkMark) {
          // 如果光标在链接的末尾，删除整个链接
          const pos = $anchor.pos
          const resolvedPos = this.editor.state.doc.resolve(pos)
          const before = resolvedPos.nodeBefore

          if (before) {
            this.editor
              .chain()
              .focus()
              .deleteRange({ from: pos - before.nodeSize, to: pos })
              .run()

            return true
          }
        }

        return false
      },
      // 添加删除键处理
      Delete: () => {
        const { empty, $anchor } = this.editor.state.selection
        if (!empty) return false

        // 检查光标后面的标记
        const marks = $anchor.nodeAfter?.marks || []
        const linkMark = marks.find((mark) => mark.type.name === 'link')

        if (linkMark) {
          // 如果光标在链接的开始，删除整个链接
          const pos = $anchor.pos
          const resolvedPos = this.editor.state.doc.resolve(pos)
          const after = resolvedPos.nodeAfter

          if (after) {
            this.editor
              .chain()
              .focus()
              .deleteRange({ from: pos, to: pos + after.nodeSize })
              .run()

            return true
          }
        }

        return false
      }
    }
  }
})

// 添加样式
// const style = document.createElement('style')
// style.textContent = `
//   .note-reference-link {
//     color: var(--note-link-color, #3b82f6);
//     text-decoration: none;
//     border-bottom: 1px dashed currentColor;
//     cursor: pointer;
//   }

//   .note-reference-link:hover {
//     background-color: rgba(59, 130, 246, 0.1);
//   }
// `
// document.head.appendChild(style)
