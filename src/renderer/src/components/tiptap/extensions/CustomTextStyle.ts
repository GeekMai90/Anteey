import { Mark } from '@tiptap/core'

export const CustomTextStyle = Mark.create({
  name: 'textStyle',

  addOptions() {
    return {
      types: ['textStyle']
    }
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color?.toString(),
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {}
          }
          return {
            style: `color: ${attributes.color}`
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="color"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false
          const color = (element as HTMLElement).style.color
          return color ? { color } : false
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },

  // 添加全局属性
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => element.style.color?.toString(),
            renderHTML: (attributes) => {
              if (!attributes.color) return {}
              return {
                style: `color: ${attributes.color}`
              }
            }
          }
        }
      }
    ]
  }
})
