import DragHandle from '@tiptap-pro/extension-drag-handle'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const CustomDragHandle = DragHandle.extend({
  name: 'customDragHandle',
  addOptions() {
    return {
      ...this.parent?.(),
      dragHandleClass: 'custom-drag-handle',
      alwaysVisible: true // 新增选项,控制拖拽块是否始终可见
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || []

    return [
      ...plugins,
      new Plugin({
        key: new PluginKey('customDragHandleClick'),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const dragHandle = event.target.closest('.custom-drag-handle')
              if (dragHandle) {
                console.log('拖拽块被点击了!')
                event.preventDefault()
                event.stopPropagation()
                // 获取拖拽块的父元素（应该是段落或标题元素）
                const nodeElement = dragHandle.parentElement
                if (nodeElement) {
                  const pos = view.posAtDOM(nodeElement, 0)
                  const node = view.state.doc.nodeAt(pos)
                  console.log('节点信息:', node)
                  if (node) {
                    // 将节点信息存储在拖拽块的 dataset 中
                    dragHandle.dataset.nodePos = pos
                    dragHandle.dataset.nodeType = node.type.name
                  }
                }
                return true
              }
              return false
            }
          }
        }
      })
    ]
  }
})

export default CustomDragHandle
