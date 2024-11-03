import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Node as ProsemirrorNode } from 'prosemirror-model'
import { useNoteStore } from '../../stores/noteStores'

export interface TagOptions {
  HTMLAttributes: Record<string, any>
  noteId?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tag: {
      setTag: (attributes?: { id?: string; name: string }) => ReturnType
      unsetTag: () => ReturnType
    }
  }
}

export const Tag = Mark.create<TagOptions>({
  name: 'tag',

  addOptions() {
    return {
      HTMLAttributes: {},
      noteId: undefined
    }
  },

  addStorage() {
    return {
      previousTags: new Set<string>()
    }
  },

  onCreate() {
    // 初始化时收集当前文档中的所有标签
    const tags = new Set<string>()
    this.editor.state.doc.descendants((node: ProsemirrorNode) => {
      if (node.isText) {
        const matches = Array.from(node.text!.matchAll(/#[^\s#]+/g))
        matches.forEach((match) => {
          const tagName = match[0].slice(1) // 移除#号
          tags.add(tagName)
        })
      }
    })
    this.storage.previousTags = tags
  },

  onUpdate() {
    // 获取当前文档中所有的标签
    const currentTags = new Set<string>()
    this.editor.state.doc.descendants((node: ProsemirrorNode) => {
      if (node.isText) {
        const matches = Array.from(node.text!.matchAll(/#[^\s#]+/g))
        matches.forEach((match) => {
          const tagName = match[0].slice(1)
          currentTags.add(tagName)
        })
      }
    })

    // 对比找出被删除的标签
    const deletedTags = Array.from(this.storage.previousTags).filter(
      (tag) => !currentTags.has(tag as string)
    )

    // 处理删除的标签
    if (deletedTags.length > 0 && this.options.noteId) {
      const noteStore = useNoteStore()
      deletedTags.forEach((tagName) => {
        setTimeout(async () => {
          try {
            await noteStore.removeTagFromNote(this.options.noteId!, tagName as string)
            console.log('标签删除成功:', tagName)
          } catch (error) {
            console.error('删除标签失败:', error)
          }
        }, 0)
      })
    }

    // 更新存储的标签集合
    this.storage.previousTags = currentTags
  },

  addAttributes() {
    return {
      id: {
        default: null
      },
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag-name'),
        renderHTML: (attributes) => {
          if (!attributes.name) {
            return {}
          }

          return {
            'data-tag-name': attributes.name
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="tag"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': 'tag',
          class: 'tag-node',
          'data-tooltip': '点击查看相关笔记',
          role: 'button'
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0
    ]
  },

  addCommands() {
    return {
      setTag:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetTag:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        }
    }
  },

  addProseMirrorPlugins() {
    const tagRegex = /#[^\s#]+/g

    return [
      new Plugin({
        key: new PluginKey('tag-decoration'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr) {
            const { doc } = tr
            const decos: Decoration[] = []

            doc.descendants((node, pos) => {
              if (!node.isText) return

              const matches = Array.from(node.text!.matchAll(tagRegex))
              matches.forEach((match) => {
                const start = pos + match.index!
                const end = start + match[0].length
                decos.push(
                  Decoration.inline(start, end, {
                    class: 'tag-highlight'
                  })
                )
              })
            })

            return DecorationSet.create(doc, decos)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
          handleClick(view, pos) {
            const { doc } = view.state
            let tagText = null

            doc.nodesBetween(pos, pos, (node, nodePos) => {
              if (node.isText) {
                const text = node.text!
                let match
                const regex = /#[^\s#]+/g
                while ((match = regex.exec(text)) !== null) {
                  const start = nodePos + match.index
                  const end = start + match[0].length
                  if (pos >= start && pos <= end) {
                    tagText = match[0].slice(1) // 移除#号
                    return false
                  }
                }
              }
            })

            if (tagText) {
              const noteStore = useNoteStore()
              noteStore.openTaggedNotes(tagText)
              return true
            }

            return false
          }
        }
      })
    ]
  }
})
