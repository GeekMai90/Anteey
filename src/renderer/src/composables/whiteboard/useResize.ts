import { ref } from 'vue'

interface UseResizeOptions {
  onResizeStart?: (event: MouseEvent) => void
  onResize?: (newSize: { width: number; height: number }, offset: { x: number; y: number }) => void
  onResizeEnd?: () => void
}

interface InitialSize {
  width: number
  height: number
}

export type ResizeDirection =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-right'
  | 'bottom-left'

export function useResize(options: UseResizeOptions) {
  const isResizing = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const startWidth = ref(0)
  const startHeight = ref(0)
  const currentDirection = ref<ResizeDirection>('top')

  const startResize = (event: MouseEvent, direction: ResizeDirection, initialSize: InitialSize) => {
    event.preventDefault()
    event.stopPropagation()

    isResizing.value = true
    currentDirection.value = direction
    startX.value = event.clientX
    startY.value = event.clientY
    startWidth.value = initialSize.width
    startHeight.value = initialSize.height

    options.onResizeStart?.(event)

    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
  }

  const onResize = (event: MouseEvent) => {
    if (!isResizing.value) return

    const deltaX = event.clientX - startX.value
    const deltaY = event.clientY - startY.value

    const { newSize, offset } = calculateNewSizeAndOffset(
      currentDirection.value,
      deltaX,
      deltaY,
      startWidth.value,
      startHeight.value
    )

    options.onResize?.(newSize, offset)
  }

  const stopResize = () => {
    isResizing.value = false
    options.onResizeEnd?.()
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
  }

  return {
    isResizing,
    startResize
  }
}

function calculateNewSizeAndOffset(
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
  startWidth: number,
  startHeight: number
): { newSize: { width: number; height: number }; offset: { x: number; y: number } } {
  let width = startWidth
  let height = startHeight
  let offsetX = 0
  let offsetY = 0

  switch (direction) {
    case 'right':
      width = startWidth + deltaX
      break
    case 'left':
      width = startWidth - deltaX
      offsetX = deltaX
      break
    case 'bottom':
      height = startHeight + deltaY
      break
    case 'top':
      height = startHeight - deltaY
      offsetY = deltaY
      break
    case 'top-left':
      width = startWidth - deltaX
      height = startHeight - deltaY
      offsetX = deltaX
      offsetY = deltaY
      break
    case 'top-right':
      width = startWidth + deltaX
      height = startHeight - deltaY
      offsetY = deltaY
      break
    case 'bottom-right':
      width = startWidth + deltaX
      height = startHeight + deltaY
      break
    case 'bottom-left':
      width = startWidth - deltaX
      height = startHeight + deltaY
      offsetX = deltaX
      break
  }

  return {
    newSize: { width, height },
    offset: { x: offsetX, y: offsetY }
  }
}
