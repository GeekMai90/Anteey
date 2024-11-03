import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExcalidrawComponent from '@renderer/components/tiptap/ExcalidrawComponent.vue'
import { v4 as uuidv4 } from 'uuid'
import { Component } from 'vue'
import type { ExcalidrawDocument } from '../../types/Note'

export interface ExcalidrawOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      insertExcalidraw: () => ReturnType
    }
  }
}

const defaultAppState = {
  gridSize: null,
  viewBackgroundColor: '#ffffff',
  theme: 'light'
} as const

export const ExcalidrawExtension = Node.create<ExcalidrawOptions>({
  name: 'excalidraw',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'excalidraw-editor'
      }
    }
  },

  addAttributes() {
    return {
      id: {
        default: null
      },
      excalidrawId: {
        default: null
      },
      thumbnail: {
        default: null
      },
      isFullscreen: {
        default: false
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
        getAttrs: () => ({})
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-type': 'excalidraw' }, HTMLAttributes),
      0
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(ExcalidrawComponent as Component)
  },

  addCommands() {
    return {
      insertExcalidraw:
        () =>
        ({ commands, editor }) => {
          const noteId = editor.getAttributes('note')?.id
          if (!noteId) {
            console.error('No note ID found')
            return false
          }

          // 先插入节点，获取生成的 ID
          const excalidrawNodeId = uuidv4()
          const success = commands.insertContent({
            type: 'excalidraw',
            attrs: {
              id: excalidrawNodeId,
              excalidrawId: null,
              thumbnail: null,
              isFullscreen: false
            }
          })

          if (!success) {
            return false
          }

          // 创建新的 Excalidraw 文档
          const initialData: Partial<ExcalidrawDocument> = {
            elements: [],
            appState: defaultAppState
          }

          // 异步创建 Excalidraw 文档
          window.electronAPI
            .createExcalidrawDocument({
              noteId,
              data: initialData
            })
            .then((result) => {
              if (!result.success || !result.document) {
                console.error('Failed to create excalidraw document')
                return
              }

              // 更新节点的 excalidrawId
              editor
                .chain()
                .updateAttributes('excalidraw', {
                  excalidrawId: result.document.id
                })
                .run()
            })
            .catch((error) => {
              console.error('Failed to create excalidraw document:', error)
            })

          return true
        }
    }
  }
})

export default ExcalidrawExtension
