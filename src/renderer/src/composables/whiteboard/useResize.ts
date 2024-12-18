export type ResizeDirection = 'right' | 'bottom' | 'bottom-right'

export const useResize = ({
  onResizeStart,
  onResize,
  onResizeEnd
}: {
  onResizeStart?: (event: MouseEvent) => void
  onResize: (newSize: { width: number; height: number }, offset: { x: number; y: number }) => void
  onResizeEnd?: () => void
}) => {
  let isResizing = false
  let startX = 0
  let startY = 0
  let startWidth = 0
  let startHeight = 0
  let direction: ResizeDirection | null = null

  const startResize = (
    event: MouseEvent,
    resizeDirection: ResizeDirection,
    initialSize: { width: number; height: number }
  ) => {
    isResizing = true
    direction = resizeDirection
    startX = event.clientX
    startY = event.clientY
    startWidth = initialSize.width
    startHeight = initialSize.height

    onResizeStart?.(event)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizing || !direction) return

    const deltaX = event.clientX - startX
    const deltaY = event.clientY - startY

    let newWidth = startWidth
    let newHeight = startHeight
    const offsetX = 0
    const offsetY = 0

    // 根据调整方向计算新的尺寸
    switch (direction) {
      case 'right':
        newWidth = startWidth + deltaX
        break
      case 'bottom':
        newHeight = startHeight + deltaY
        break
      case 'bottom-right':
        newWidth = startWidth + deltaX
        newHeight = startHeight + deltaY
        break
    }

    // 调用回调函数更新尺寸
    onResize({ width: newWidth, height: newHeight }, { x: offsetX, y: offsetY })
  }

  const handleMouseUp = () => {
    isResizing = false
    direction = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    onResizeEnd?.()
  }

  return {
    startResize
  }
}
