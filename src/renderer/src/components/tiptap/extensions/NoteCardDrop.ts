import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { useNoteStore } from '@renderer/stores/noteStore'

export interface NoteCardDropOptions {
  noteId?: string // 当前笔记的ID
}

/**
 * NoteCardDrop扩展
 * 用于处理从右侧边栏卡片盒拖拽卡片到编辑器创建双链引用
 */
export default Extension.create<NoteCardDropOptions>({
  name: 'noteCardDrop',

  addOptions() {
    return {
      noteId: undefined
    }
  },

  addProseMirrorPlugins() {
    const { noteId } = this.options
    const pluginKey = new PluginKey('noteCardDrop')

    // 创建拖拽提示元素
    let dropHint: HTMLElement | null = null

    const createDropHint = () => {
      if (!dropHint) {
        dropHint = document.createElement('div')
        dropHint.className = 'note-drop-hint'
        dropHint.style.cssText = `
          position: absolute;
          background-color: rgba(var(--color-primary-rgb), 0.1);
          border: 1px dashed var(--color-primary);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          color: var(--color-primary);
          pointer-events: none;
          z-index: 1000;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0;
          transition: opacity 0.2s ease;
        `
        document.body.appendChild(dropHint)
      }
      return dropHint
    }

    const updateDropHint = (event: DragEvent, text: string) => {
      const hint = createDropHint()
      hint.textContent = `创建引用: ${text}`
      hint.style.top = `${event.clientY + 10}px`
      hint.style.left = `${event.clientX + 10}px`
      hint.style.opacity = '1'
    }

    const removeDropHint = () => {
      if (dropHint) {
        dropHint.style.opacity = '0'
        setTimeout(() => {
          if (dropHint && dropHint.parentNode) {
            dropHint.parentNode.removeChild(dropHint)
          }
          dropHint = null
        }, 200)
      }
    }

    // 用于添加和移除视觉反馈的辅助函数
    const addDraggingClass = (view: any) => {
      const editorWrapper = view.dom.closest('.editor-wrapper')
      if (editorWrapper) {
        editorWrapper.classList.add('card-dragging-over')
      }
    }

    const removeDraggingClass = (view: any) => {
      const editorWrapper = view.dom.closest('.editor-wrapper')
      if (editorWrapper) {
        editorWrapper.classList.remove('card-dragging-over')
      }
    }

    // 用于缓存笔记数据的对象
    const noteCache: Record<string, any> = {}

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              // 移除拖拽样式和提示
              removeDraggingClass(view)
              removeDropHint()

              const noteStore = useNoteStore()

              // 获取拖拽数据
              if (!event.dataTransfer) return false

              try {
                // 尝试解析卡片数据
                const jsonData = event.dataTransfer.getData('application/json')
                if (!jsonData) return false

                const data = JSON.parse(jsonData)
                if (!data.id) return false

                // 获取放置位置（相对于编辑器）
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
                if (!pos) return false

                // 防止拖放自己（如果当前编辑的笔记就是被拖放的笔记）
                if (data.id === noteId) return false

                // 立即处理事件，防止被其他处理器捕获
                event.preventDefault()
                event.stopPropagation()

                // 异步获取目标笔记信息并创建链接
                setTimeout(async () => {
                  try {
                    // 获取目标笔记信息（先尝试使用缓存）
                    let targetNote = noteCache[data.id]
                    if (!targetNote) {
                      targetNote = await noteStore.fetchNote(data.id)
                      if (targetNote) {
                        noteCache[data.id] = targetNote
                      }
                    }

                    if (!targetNote) {
                      console.error('未找到目标笔记:', data.id)
                      return
                    }

                    // 创建链接显示文本
                    const displayText = targetNote.address
                      ? `${targetNote.address} ${targetNote.metadata?.title || ''}`.trim()
                      : targetNote.metadata?.title || '未命名笔记'

                    // 通过编辑器API插入链接
                    this.editor
                      .chain()
                      .focus()
                      .insertContentAt(pos.pos, {
                        type: 'text',
                        text: displayText,
                        marks: [
                          {
                            type: 'link',
                            attrs: {
                              href: `note://${data.id}`,
                              class: 'note-reference-link',
                              'data-note-id': data.id
                            }
                          }
                        ]
                      })
                      .run()

                    // 引用关系由CustomLink扩展的onUpdate钩子自动处理
                    console.log('成功插入笔记引用:', displayText)
                  } catch (error) {
                    console.error('插入笔记引用失败:', error)
                  }
                }, 0)

                return true
              } catch (error) {
                console.error('处理卡片拖拽失败:', error)
                return false
              }
            },

            // 添加dragover处理，以显示可放置指示
            dragover: (view, event) => {
              if (!event.dataTransfer) return false

              try {
                // 检查是否有我们需要的数据格式
                const types = event.dataTransfer.types
                if (types.includes('application/json')) {
                  // 表明此位置可以放置
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'copy'

                  // 添加拖拽样式
                  addDraggingClass(view)

                  // 尝试获取笔记信息并显示提示
                  try {
                    const jsonData = event.dataTransfer?.getData('application/json')
                    if (jsonData) {
                      const data = JSON.parse(jsonData)
                      if (data.id && data.id !== noteId) {
                        // 如果有缓存使用缓存，否则异步获取
                        if (noteCache[data.id]) {
                          const note = noteCache[data.id]
                          const displayText = note.address
                            ? `${note.address} ${note.metadata?.title || ''}`.trim()
                            : note.metadata?.title || '未命名笔记'
                          updateDropHint(event, displayText)
                        } else {
                          // 在拖拽过程中尝试预加载笔记数据
                          const noteStore = useNoteStore()
                          noteStore
                            .fetchNote(data.id)
                            .then((note) => {
                              if (note) {
                                noteCache[data.id] = note
                                const displayText = note.address
                                  ? `${note.address} ${note.metadata?.title || ''}`.trim()
                                  : note.metadata?.title || '未命名笔记'
                                updateDropHint(event, displayText)
                              }
                            })
                            .catch((err) => {
                              console.error('获取笔记信息失败:', err)
                              updateDropHint(event, '创建引用...')
                            })
                        }
                      }
                    }
                  } catch (e) {
                    // Firefox不允许在dragover中访问dataTransfer.getData
                    // 只显示通用提示
                    updateDropHint(event, '创建引用...')
                  }

                  return true
                }
              } catch (error) {
                console.error('处理dragover事件失败:', error)
              }

              return false
            },

            // 当拖拽离开编辑器时移除样式
            dragleave: (view) => {
              removeDraggingClass(view)
              removeDropHint()
              return false
            },

            // 当拖拽结束时移除样式（以防其他事件没有触发）
            dragend: (view) => {
              removeDraggingClass(view)
              removeDropHint()
              return false
            }
          }
        },

        // 插件销毁时清理
        destroy() {
          removeDropHint()
        }
      })
    ]
  }
})
