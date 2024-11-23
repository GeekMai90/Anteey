import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockComponent from '@renderer/components/tiptap/CodeBlockComponent.vue'
import { all, createLowlight } from 'lowlight'

const lowlight = createLowlight(all)

export const CustomCodeBlock = CodeBlockLowlight.extend({
  name: 'codeBlock',

  addNodeView() {
    return VueNodeViewRenderer(CodeBlockComponent)
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'plaintext',
        parseHTML: (element) => element.getAttribute('language') || 'plaintext',
        renderHTML: (attributes) => ({
          language: attributes.language
        })
      }
    }
  }
}).configure({ lowlight })
