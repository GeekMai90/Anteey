import { DragHandle, DragHandleOptions } from '@tiptap-pro/extension-drag-handle'
import { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

interface CustomDragHandleOptions extends DragHandleOptions {
  canvasScale: number
}

export const CustomDragHandle = DragHandle.extend<CustomDragHandleOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      canvasScale: 1
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || []
    return plugins.map((plugin) => {
      if (
        plugin instanceof Plugin &&
        plugin.spec.key instanceof PluginKey &&
        (plugin.spec.key as any).key === 'dragHandle'
      ) {
        return new Plugin({
          key: plugin.spec.key,
          props: {
            ...plugin.spec.props,
            handleDOMEvents: {
              ...plugin.spec.props?.handleDOMEvents,
              mousemove: (view: EditorView, event: MouseEvent) => {
                const scaledEvent = new MouseEvent(event.type, {
                  ...event,
                  // 调整鼠标事件的坐标
                  clientX: event.clientX / this.options.canvasScale,
                  clientY: event.clientY / this.options.canvasScale
                })
                return plugin.spec.props?.handleDOMEvents?.mousemove?.call(
                  plugin,
                  view,
                  scaledEvent
                )
              }
            }
          }
        })
      }
      return plugin
    })
  }
})

export const updateDragHandlePosition = (editor: Editor, scale: number) => {
  const { view } = editor
  const dragHandlePlugin = view.state.plugins.find(
    (plugin) =>
      plugin instanceof Plugin &&
      plugin.spec.key instanceof PluginKey &&
      (plugin.spec.key as any).key === 'dragHandle'
  )
  if (dragHandlePlugin instanceof Plugin) {
    const pluginState = dragHandlePlugin.getState(view.state)
    if (pluginState && 'element' in pluginState) {
      const { element } = pluginState as { element: HTMLElement }
      const rect = element.getBoundingClientRect()
      // 调整拖拽块的位置和大小
      element.style.transform = `scale(${1 / scale})`
      element.style.transformOrigin = 'top left'
      element.style.top = `${rect.top * scale}px`
      element.style.left = `${rect.left * scale}px`
    }
  }
}
