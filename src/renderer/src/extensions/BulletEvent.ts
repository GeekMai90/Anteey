import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BulletEventView from '../components/timeblock/BulletEventView.vue'
import type { CommandProps } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bulletEvent: {
      toggleBulletEvent: () => ReturnType
    }
  }
}

export const BulletEvent = Node.create({
  name: 'bulletEvent',

  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bullet-event"]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'bullet-event',
          class: 'bullet-event'
        },
        HTMLAttributes
      ),
      0
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(BulletEventView)
  },

  addCommands() {
    return {
      toggleBulletEvent: () => (props: CommandProps) => {
        return props.commands.setNode(this.name)
      }
    }
  }
})
