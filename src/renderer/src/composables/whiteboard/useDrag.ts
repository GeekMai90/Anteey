import { ref } from 'vue'

interface UseDragOptions {
  onDragStart?: (event: MouseEvent) => void
  onDragMove?: (deltaX: number, deltaY: number) => void
  onDragEnd?: () => void
}

export function useDrag(options: UseDragOptions) {
  const isDragging = ref(false)
  let startX = 0
  let startY = 0

  const startDrag = (event: MouseEvent) => {
    isDragging.value = true
    startX = event.clientX
    startY = event.clientY
    options.onDragStart?.(event)

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', stopDrag)
  }

  const onDragMove = (event: MouseEvent) => {
    if (!isDragging.value) return

    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY

    options.onDragMove?.(deltaX, deltaY)

    startX = event.clientX
    startY = event.clientY
  }

  const stopDrag = () => {
    isDragging.value = false
    options.onDragEnd?.()
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', stopDrag)
  }

  return {
    isDragging,
    startDrag
  }
}
