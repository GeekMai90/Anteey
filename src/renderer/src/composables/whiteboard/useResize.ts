import { ref, type Ref } from 'vue'
import type { WhiteboardNote } from '@renderer/types/Note'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'

export function useResize(
  whiteboardNotes: Ref<WhiteboardNote[]>,
  scale: Ref<number>,
  whiteboardId: Ref<string | null>
) {
  const whiteboardStore = useWhiteboardStore()
  const resizingItem = ref<{
    id: string
    direction: string
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)
  const visualAdjustment = ref({ x: 0, y: 0 })

  const startResizingItem = ({
    item,
    direction,
    event
  }: {
    item: WhiteboardNote
    direction: string
    event: MouseEvent
  }) => {
    event.preventDefault()
    event.stopPropagation()

    resizingItem.value = {
      id: item.id,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: item.size.width,
      startHeight: item.size.height
    }

    window.addEventListener('mousemove', onResizeItem)
    window.addEventListener('mouseup', stopResizingItem)
  }

  const onResizeItem = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!resizingItem.value) return

    const { id, direction, startX, startY, startWidth, startHeight } = resizingItem.value
    const dx = (event.clientX - startX) / scale.value
    const dy = (event.clientY - startY) / scale.value

    const item = whiteboardNotes.value.find((item) => item.id === id)
    if (!item) return

    let newWidth = startWidth
    let newHeight = startHeight
    visualAdjustment.value = { x: 0, y: 0 }

    switch (direction) {
      case 'e':
        newWidth = Math.max(100, startWidth + dx)
        break
      case 'w':
        newWidth = Math.max(100, startWidth - dx)
        visualAdjustment.value.x = startWidth - newWidth
        break
      case 's':
        newHeight = Math.max(100, startHeight + dy)
        break
      case 'n':
        newHeight = Math.max(100, startHeight - dy)
        visualAdjustment.value.y = startHeight - newHeight
        break
      case 'se':
        newWidth = Math.max(100, startWidth + dx)
        newHeight = Math.max(100, startHeight + dy)
        break
      case 'sw':
        newWidth = Math.max(100, startWidth - dx)
        newHeight = Math.max(100, startHeight + dy)
        visualAdjustment.value.x = startWidth - newWidth
        break
      case 'ne':
        newWidth = Math.max(100, startWidth + dx)
        newHeight = Math.max(100, startHeight - dy)
        visualAdjustment.value.y = startHeight - newHeight
        break
      case 'nw':
        newWidth = Math.max(100, startWidth - dx)
        newHeight = Math.max(100, startHeight - dy)
        visualAdjustment.value.x = startWidth - newWidth
        visualAdjustment.value.y = startHeight - newHeight
        break
    }

    item.size.width = newWidth
    item.size.height = newHeight
  }

  const stopResizingItem = async (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (resizingItem.value) {
      const item = whiteboardNotes.value.find((item) => item.id === resizingItem.value?.id)
      if (item && whiteboardId.value) {
        await whiteboardStore.updateWhiteboardNoteSize(item.id, item.size.width, item.size.height)
        if (visualAdjustment.value.x !== 0 || visualAdjustment.value.y !== 0) {
          const newX = item.position.x + visualAdjustment.value.x
          const newY = item.position.y + visualAdjustment.value.y
          await whiteboardStore.updateWhiteboardNotePosition(item.id, newX, newY)
          item.position.x = newX
          item.position.y = newY
        }
      }
    }

    resizingItem.value = null
    visualAdjustment.value = { x: 0, y: 0 }
    window.removeEventListener('mousemove', onResizeItem)
    window.removeEventListener('mouseup', stopResizingItem)
  }

  const getWhiteNoteStyle = (item: WhiteboardNote) => {
    return {
      left: `${item.position.x + (resizingItem.value?.id === item.id ? visualAdjustment.value.x : 0)}px`,
      top: `${item.position.y + (resizingItem.value?.id === item.id ? visualAdjustment.value.y : 0)}px`,
      width: `${item.size.width}px`,
      height: `${item.size.height}px`,
      zIndex: `${item.zIndex}`,
      transform: `rotate(${item.rotation || 0}deg)`
    }
  }

  return {
    startResizingItem,
    onResizeItem,
    stopResizingItem,
    getWhiteNoteStyle
  }
}
