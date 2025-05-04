import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BulletTaskView from '@renderer/components/timeblock/BulletTaskView.vue'
import type { CommandProps } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bulletTask: {
      toggleBulletTask: () => ReturnType
      toggleTaskStatus: () => ReturnType
    }
  }
}

export const BulletTask = Node.create({
  name: 'bulletTask',

  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      status: {
        default: 'pending',
        parseHTML: (element) => element.getAttribute('data-status'),
        renderHTML: (attributes) => ({
          'data-status': attributes.status,
          class: `bullet-task bullet-task--${attributes.status}`
        })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bullet-task"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return {}
          const dom = element as HTMLElement
          return {
            status: dom.getAttribute('data-status') || 'pending'
          }
        }
      }
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'bullet-task',
          'data-status': node.attrs.status || 'pending',
          class: `bullet-task bullet-task--${node.attrs.status || 'pending'}`
        },
        HTMLAttributes
      ),
      0
    ]
  },

  toDOM(node: ProseMirrorNode) {
    return [
      'div',
      {
        'data-type': 'bullet-task',
        'data-status': node.attrs.status || 'pending',
        class: `bullet-task bullet-task--${node.attrs.status || 'pending'}`
      },
      0
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(BulletTaskView)
  },

  addCommands() {
    return {
      toggleBulletTask: () => (props: CommandProps) => {
        return props.commands.setNode(this.name)
      },

      toggleTaskStatus: () => (props: CommandProps) => {
        const { tr, dispatch } = props
        if (!dispatch) return false

        const { selection } = tr
        const node = tr.doc.nodeAt(selection.from)

        if (!node || node.type.name !== this.name) {
          console.log('No valid node found:', node?.type.name)
          return false
        }

        console.log('Current status:', node.attrs.status)
        const statuses = ['pending', 'completed', 'migrated', 'scheduled', 'abandoned']
        const currentStatus = node.attrs.status || 'pending'
        const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length]
        console.log('Next status:', nextStatus)

        tr.setNodeMarkup(selection.from, undefined, {
          ...node.attrs,
          status: nextStatus
        })

        dispatch(tr)
        return true
      }
    }
  }
})
