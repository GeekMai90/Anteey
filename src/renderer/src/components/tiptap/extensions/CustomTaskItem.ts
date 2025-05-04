import TaskItem from '@tiptap/extension-task-item'
// import confetti from 'canvas-confetti'
import { Plugin } from 'prosemirror-state'

export const CustomTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute('checked') === 'checked',
        renderHTML: (attributes) => (attributes.checked ? { checked: 'checked' } : {})
      }
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || []

    return [
      ...plugins,
      new Plugin({
        props: {
          handleDOMEvents: {
            click: (_view, event) => {
              if (!(event.target instanceof HTMLInputElement)) {
                return false
              }

              if (event.target.checked) {
                // 获取点击元素的位置
                // const rect = event.target.getBoundingClientRect()
                // 计算相对于窗口的位置
                // const x = rect.left / window.innerWidth
                // const y = rect.top / window.innerHeight
                // 触发礼花效果，禁用 Web Worker
                // confetti({
                //   particleCount: 100,
                //   spread: 70,
                //   origin: { x, y },
                //   gravity: 2,
                //   scalar: 0.7,
                //   useWorker: false // 禁用 Web Worker
                // })
              }

              return false
            }
          }
        }
      })
    ]
  }
})
