/**
 * CustomLink 扩展
 * 这是一个基于 Tiptap Link 扩展的自定义链接组件
 * 主要功能：
 * 1. 支持笔记间的双向链接（通过 @提及 或 [[id:title]] 语法）
 * 2. 支持外部链接（http/https）
 * 3. 支持 DevonThink 链接
 * 4. 自动维护笔记间的引用关系
 */

import { Link } from '@tiptap/extension-link'
import { mergeAttributes } from '@tiptap/core'
import { Node as ProsemirrorNode, Mark } from 'prosemirror-model'
import { useNoteStore } from '../../stores/noteStore'
import { useEventBus } from '@vueuse/core'
import { TextSelection } from '@tiptap/pm/state'

// 创建一个事件总线实例，用于在引用关系更新时通知相关组件
const referencesUpdatedBus = useEventBus('references-updated')

// 定义链接扩展的配置选项接口
interface CustomLinkOptions {
  noteId?: string // 当前笔记的 ID
  openOnClick: boolean // 是否在点击时打开链接
  linkOnPaste: boolean // 是否在粘贴时自动创建链接
  validate: (url: string) => boolean // 链接验证函数
}

export const CustomLink = Link.extend<CustomLinkOptions>({
  name: 'link',
  inclusive: false, // 设置为 false，防止链接吸收后续文本

  // 配置选项
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      linkOnPaste: true,
      noteId: '',
      // 验证链接格式：支持 http/https、note://、devonthink 链接和 [[id:title]] 格式
      validate: (url: string) => {
        return (
          /^(https?:\/\/|note:\/\/|x-devonthink-item:\/\/)/.test(url) ||
          /^\[\[([0-9a-f-]+):(.+?)\]\]$/.test(url)
        )
      }
    }
  },

  // 添加存储，用于跟踪链接的变化
  addStorage() {
    return {
      previousLinks: new Set<string>() // 存储上一次的链接集合，用于检测变化
    }
  },

  // 组件创建时的处理
  onCreate() {
    // 初始化时收集当前文档中的所有笔记链接
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

  // 内容更新时的处理
  onUpdate() {
    // 获取当前文档中所有的笔记链接
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

    // 对比找出新增和删除的链接
    const addedLinks = Array.from(currentLinks).filter((id) => !this.storage.previousLinks.has(id))
    const deletedLinks = Array.from(this.storage.previousLinks).filter(
      (id) => !currentLinks.has(id as string)
    )

    if (this.options.noteId) {
      const noteStore = useNoteStore()
      const currentNoteId = this.options.noteId

      // 处理新增的链接：创建引用关系
      addedLinks.forEach((targetNoteId) => {
        setTimeout(async () => {
          try {
            // 获取目标笔记的信息
            const targetNote = await noteStore.fetchNote(targetNoteId)
            if (!targetNote) return

            // 构造显示文本：编码地址 + 标题
            const displayText = `${targetNote.address || '未设置编码地址'} ${targetNote.metadata?.title || '未命名笔记'}`

            // 更新链接文本
            let position = 0
            this.editor.state.doc.descendants((node: ProsemirrorNode, pos: number) => {
              if (node.type.name === 'text' && node.marks.length > 0) {
                node.marks.forEach((mark: Mark) => {
                  if (mark.type.name === 'link' && mark.attrs['data-note-id'] === targetNoteId) {
                    position = pos
                    // 创建文本选区并更新链接文本，保持链接标记
                    const transaction = this.editor.state.tr

                    // 创建带有链接标记的新文本节点
                    const text = this.editor.state.schema.text(displayText)
                    const linkMark = mark.type.create({
                      ...mark.attrs,
                      href: `note://${targetNoteId}`,
                      class: 'note-reference-link',
                      'data-note-id': targetNoteId
                    })
                    const newNode = text.mark([linkMark])

                    // 替换原有节点
                    transaction.replaceWith(pos, pos + node.nodeSize, newNode)

                    // 先应用替换操作
                    this.editor.view.dispatch(transaction)

                    // 然后创建新的 transaction 来设置光标位置
                    const moveSelection = this.editor.state.tr.setSelection(
                      TextSelection.create(this.editor.state.doc, pos + displayText.length)
                    )
                    this.editor.view.dispatch(moveSelection)
                  }
                })
              }
            })

            // 创建笔记引用关系
            await noteStore.createNoteReference({
              sourceNoteId: currentNoteId,
              targetNoteId: targetNoteId,
              type: 'reference',
              context: {
                text: displayText,
                position: position
              },
              metadata: {
                title: targetNote.title || '未命名笔记',
                preview: displayText,
                cardType: targetNote.cardType,
                address: targetNote.address
              }
            })

            // 通知其他组件引用关系已更新
            referencesUpdatedBus.emit(currentNoteId)
          } catch (error) {
            console.error('创建引用关系失败:', error)
          }
        }, 0)
      })

      // 处理删除的链接：删除引用关系
      deletedLinks.forEach((targetNoteId) => {
        setTimeout(async () => {
          try {
            await noteStore.deleteNoteReference({
              sourceNoteId: currentNoteId,
              targetNoteId: targetNoteId as string
            })
            console.log('引用关系删除成功:', targetNoteId)

            // 通知其他组件引用关系已更新
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

  // 添加链接属性
  addAttributes() {
    return {
      ...this.parent?.(),
      href: { default: null },
      target: { default: null },
      class: { default: null },
      // 添加笔记 ID 属性，用于标识链接对应的笔记
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

  // 添加粘贴规则
  addPasteRules() {
    return [
      {
        // DevonThink 链接的识别规则
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
        // Obsidian 链接的识别规则 - 支持 open 和 advanced-uri 两种格式
        find: /(obsidian:\/\/(open|advanced-uri)\?[^"\s]+)/g,
        handler: ({ state, range, match }) => {
          const [url] = match

          // 从 URL 中提取文件名或标题作为显示文本
          let displayText = url
          try {
            const urlObj = new URL(url)
            if (urlObj.protocol === 'obsidian:') {
              if (urlObj.pathname === '/open') {
                // 处理 open 格式链接
                const file = urlObj.searchParams.get('file')
                if (file) {
                  displayText = decodeURIComponent(file).split('/').pop() || url
                }
              } else if (urlObj.pathname === '/advanced-uri') {
                // 处理 advanced-uri 格式链接
                const uid = urlObj.searchParams.get('uid')
                if (uid) {
                  displayText = `Obsidian Note: ${uid}`
                }
              }
            }
          } catch (e) {
            console.error('解析 Obsidian URL 失败:', e)
          }

          const mark = this.type.create({
            href: url,
            class: 'obsidian-link',
            target: '_blank',
            rel: 'noopener noreferrer'
          })

          const text = state.schema.text(displayText)
          const node = text.mark([mark])
          state.tr.replaceWith(range.from, range.to, node)
        }
      },
      {
        // 笔记链接的识别规则：[[id:title]] 格式
        find: /\[\[([0-9a-f-]+):(.+?)\]\]/g,
        handler: ({ state, range, match }) => {
          const [, noteId, title] = match

          // 只创建链接节点,不创建引用关系
          const href = `note://${noteId}`
          const mark = this.type.create({
            href,
            class: 'note-reference-link',
            'data-note-id': noteId
          })

          const text = state.schema.text(title)
          const node = text.mark([mark])
          state.tr.replaceWith(range.from, range.to, node)
        }
      },
      ...(this.parent?.() || [])
    ]
  },

  // HTML 解析规则
  parseHTML() {
    return [{ tag: 'a[href]:not([href *= "javascript:" i])' }]
  },

  // HTML 渲染规则
  renderHTML({ HTMLAttributes }) {
    // 根据链接类型添加不同的样式和交互提示
    if (HTMLAttributes.href?.startsWith('note://')) {
      HTMLAttributes.class = (HTMLAttributes.class || '') + ' note-reference-link'
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
    } else if (HTMLAttributes.href?.startsWith('obsidian://')) {
      HTMLAttributes.class = (HTMLAttributes.class || '') + ' obsidian-link'
      HTMLAttributes['data-tooltip'] = '点击打开 Obsidian 中的笔记'
      HTMLAttributes['role'] = 'button'
      HTMLAttributes.target = '_blank'
      HTMLAttributes.rel = 'noopener noreferrer'
    }

    return ['a', mergeAttributes(HTMLAttributes), 0]
  },

  // 添加键盘快捷键
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-k': () => {
        // 可以添加自定义的链接插入逻辑
        return true
      },
      // 处理退格键：在链接末尾时删除整个链接
      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection
        if (!empty) return false

        const marks = $anchor.nodeBefore?.marks || []
        const linkMark = marks.find((mark) => mark.type.name === 'link')

        if (linkMark) {
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
      // 处理删除键：在链接开始时删除整个链接
      Delete: () => {
        const { empty, $anchor } = this.editor.state.selection
        if (!empty) return false

        const marks = $anchor.nodeAfter?.marks || []
        const linkMark = marks.find((mark) => mark.type.name === 'link')

        if (linkMark) {
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
