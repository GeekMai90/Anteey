import { type Ref } from 'vue'

export function useZoomAndTouch(
  scale: Ref<number>,
  translateX: Ref<number>,
  translateY: Ref<number>,
  isNoteInteracting: Ref<boolean>,
  debouncedSaveViewState: (whiteboardId?: string) => void,
  whiteboardId: Ref<string | null>,
  containerRef: Ref<HTMLElement | null>
) {
  let lastPinchDistance = 0
  let isDragging = false
  let lastX = 0
  let lastY = 0

  // 处理滚轮缩放
  const handleWheel = (event: WheelEvent) => {
    if (isNoteInteracting.value) {
      if (event.ctrlKey) event.preventDefault()
      return
    }

    if (event.ctrlKey) {
      event.preventDefault()
      const delta = event.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.5, Math.min(scale.value * delta, 2))

      if (!containerRef.value) return

      const rect = containerRef.value.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const contentX = (mouseX - translateX.value) / scale.value
      const contentY = (mouseY - translateY.value) / scale.value

      translateX.value = mouseX - contentX * newScale
      translateY.value = mouseY - contentY * newScale

      scale.value = newScale
    } else {
      translateX.value -= event.deltaX
      translateY.value -= event.deltaY
    }

    if (whiteboardId.value) {
      debouncedSaveViewState(whiteboardId.value)
    }
  }

  // 处理触摸开始
  const handleTouchStart = (event: TouchEvent) => {
    if (isNoteInteracting.value) {
      event.preventDefault()
      return
    }
    if (event.touches.length === 2) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      lastPinchDistance = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      )
    } else if (event.touches.length === 1) {
      isDragging = true
      lastX = event.touches[0].clientX
      lastY = event.touches[0].clientY
    }
  }

  // 处理触摸移动
  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault()
    if (isNoteInteracting.value) {
      return
    }

    if (event.touches.length === 2) {
      handlePinchZoom(event)
    } else if (event.touches.length === 1 && isDragging) {
      handleTouchDrag(event)
    }
    debouncedSaveViewState()
  }

  // 处理双指缩放
  const handlePinchZoom = (event: TouchEvent) => {
    if (!containerRef.value) return

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    )

    const rect = containerRef.value.getBoundingClientRect()
    const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
    const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top

    const delta = currentDistance / lastPinchDistance
    const newScale = Math.max(0.1, Math.min(scale.value * delta, 5))

    const contentX = (centerX - translateX.value) / scale.value
    const contentY = (centerY - translateY.value) / scale.value

    translateX.value = centerX - contentX * newScale
    translateY.value = centerY - contentY * newScale

    scale.value = newScale
    lastPinchDistance = currentDistance

    const avgDeltaX = (touch1.clientX + touch2.clientX) / 2 - (lastX + lastX) / 2
    const avgDeltaY = (touch1.clientY + touch2.clientY) / 2 - (lastY + lastY) / 2

    translateX.value += avgDeltaX
    translateY.value += avgDeltaY

    lastX = (touch1.clientX + touch2.clientX) / 2
    lastY = (touch1.clientY + touch2.clientY) / 2
  }

  // 处理触摸拖动
  const handleTouchDrag = (event: TouchEvent) => {
    const touch = event.touches[0]
    const deltaX = touch.clientX - lastX
    const deltaY = touch.clientY - lastY

    translateX.value += deltaX
    translateY.value += deltaY
    lastX = touch.clientX
    lastY = touch.clientY
  }

  // 处理触摸结束
  const handleTouchEnd = () => {
    isDragging = false
    lastPinchDistance = 0
  }

  return {
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}
