import { ref } from 'vue'
import { debounce } from 'lodash-es'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import type { WhiteboardNote } from '@renderer/types/Note'

export function useWhiteboardViewState() {
  const whiteboardStore = useWhiteboardStore()
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)

  // 保存视图状态
  const debouncedSaveViewState = debounce(async (whiteboardId: string) => {
    await whiteboardStore.saveViewStateToWhiteboard(
      whiteboardId,
      scale.value,
      translateX.value,
      translateY.value
    )
  }, 200)

  // 加载视图状态
  const loadViewState = async (whiteboardId: string) => {
    const savedState = await whiteboardStore.getWhiteboardViewState(whiteboardId)
    if (savedState) {
      scale.value = savedState.scale
      translateX.value = savedState.translateX
      translateY.value = savedState.translateY
    }
  }

  // 适应视图
  const fitView = (containerRef: HTMLElement, notes: WhiteboardNote[]) => {
    if (!containerRef || notes.length === 0) return

    const containerRect = containerRef.getBoundingClientRect()
    const bounds = notes.reduce(
      (acc, item) => {
        acc.left = Math.min(acc.left, item.position.x)
        acc.top = Math.min(acc.top, item.position.y)
        acc.right = Math.max(acc.right, item.position.x + item.size.width)
        acc.bottom = Math.max(acc.bottom, item.position.y + item.size.height)
        return acc
      },
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    )

    const contentWidth = bounds.right - bounds.left
    const contentHeight = bounds.bottom - bounds.top

    const padding = 50
    const scaleX = (containerRect.width - padding * 2) / contentWidth
    const scaleY = (containerRect.height - padding * 2) / contentHeight
    scale.value = Math.min(scaleX, scaleY, 1)

    translateX.value =
      (containerRect.width - contentWidth * scale.value) / 2 - bounds.left * scale.value
    translateY.value =
      (containerRect.height - contentHeight * scale.value) / 2 - bounds.top * scale.value
  }

  return {
    scale,
    translateX,
    translateY,
    debouncedSaveViewState,
    loadViewState,
    fitView
  }
}
