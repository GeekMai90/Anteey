import { ref } from 'vue'
import type { WhiteboardNote } from '../../types/Whiteboard'
import { useWhiteboardStore } from '../../stores/whiteboardStores'
import type { Ref } from 'vue'

export function useDrag(
  whiteboardNotes: Ref<WhiteboardNote[]>,
  selectedNotes: Ref<string[]>,
  scale: Ref<number>,
  translateX: Ref<number>,
  translateY: Ref<number>,
  updateConnectionPositions: (id: string, position: { x: number; y: number }) => void,
  updateAllConnectionPositions: () => void
) {
  const whiteboardStore = useWhiteboardStore()

  // 拖拽状态
  const draggingItem = ref<{
    ids: string[]
    startPositions: { id: string; x: number; y: number }[]
  } | null>(null)

  const hasMoved = ref(false)
  const alignmentGuides = ref<{ direction: 'horizontal' | 'vertical'; position: number }[]>([])
  const SNAP_THRESHOLD = 5

  // 开始拖拽
  const startDragging = (
    item: WhiteboardNote,
    event: MouseEvent,
    containerRef: HTMLElement,
    isNoteInteracting: boolean
  ) => {
    // 如果当前有白板项正在交互，则不启动拖拽
    if (isNoteInteracting) {
      event.preventDefault()
      return
    }

    // 检查事件目标是否为连接按钮
    if ((event.target as HTMLElement).closest('.connection-button')) {
      return
    }

    event.preventDefault()
    const rect = containerRef.getBoundingClientRect()

    // 如果点击的笔记不在选中列表中,清空选中列表并只选中当前笔记
    if (!selectedNotes.value.includes(item.id)) {
      selectedNotes.value = [item.id]
    }

    // 记录所有选中笔记的初始位置
    const selectedItems = whiteboardNotes.value.filter((note) =>
      selectedNotes.value.includes(note.id)
    )

    draggingItem.value = {
      ids: selectedItems.map((note) => note.id),
      startPositions: selectedItems.map((note) => ({
        id: note.id,
        x: (event.clientX - rect.left - translateX.value) / scale.value - note.position.x,
        y: (event.clientY - rect.top - translateY.value) / scale.value - note.position.y
      }))
    }

    hasMoved.value = false
  }

  // 拖拽过程
  const onDrag = (event: MouseEvent, containerRef: HTMLElement) => {
    if (!draggingItem.value) return

    const rect = containerRef.getBoundingClientRect()
    const { ids, startPositions } = draggingItem.value
    alignmentGuides.value = [] // 清空对齐参考线

    // 遍历所有拖拽的项，更新它们的位置
    ids.forEach((id, index) => {
      const { x: startX, y: startY } = startPositions[index]
      const newX = (event.clientX - rect.left - translateX.value) / scale.value - startX
      const newY = (event.clientY - rect.top - translateY.value) / scale.value - startY

      const currentItem = whiteboardNotes.value.find((item) => item.id === id)
      if (!currentItem) return

      // 如果位置有变化，设置 hasMoved 为 true
      if (newX !== currentItem.position.x || newY !== currentItem.position.y) {
        hasMoved.value = true
      }

      // 计算对齐
      const { newX: snappedX, newY: snappedY } = calculateSnapping(
        currentItem,
        newX,
        newY,
        whiteboardNotes.value
      )

      // 更新连线位置和项目位置
      updateConnectionPositions(id, { x: snappedX, y: snappedY })
      updateItemPosition(id, snappedX, snappedY)
    })
  }

  // 停止拖拽
  const stopDragging = async () => {
    if (draggingItem.value) {
      const { ids } = draggingItem.value
      const updatedItems: WhiteboardNote[] = []

      for (const id of ids) {
        const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === id)
        if (itemIndex !== -1) {
          const item = whiteboardNotes.value[itemIndex]
          const updatedItem = { ...item }
          whiteboardNotes.value.splice(itemIndex, 1, updatedItem)
          updatedItems.push(updatedItem)
        }
      }

      // 更新连接线位置
      updateAllConnectionPositions()

      // 异步更新后端
      try {
        await Promise.all(
          updatedItems.map((item: WhiteboardNote) =>
            whiteboardStore.updateWhiteboardNotePosition(item.id, item.position.x, item.position.y)
          )
        )
      } catch (error) {
        console.error('更新笔记位置失败:', error)
      }
    }

    draggingItem.value = null
    hasMoved.value = false
    alignmentGuides.value = []
  }

  // 计算对齐
  const calculateSnapping = (
    currentItem: WhiteboardNote,
    newX: number,
    newY: number,
    allItems: WhiteboardNote[]
  ) => {
    const snapThreshold = SNAP_THRESHOLD / scale.value
    const currentCenterX = newX + currentItem.size.width / 2
    const currentCenterY = newY + currentItem.size.height / 2
    const SPACING = 5

    allItems.forEach((otherItem) => {
      if (otherItem.id !== currentItem.id) {
        const otherCenterX = otherItem.position.x + otherItem.size.width / 2
        const otherCenterY = otherItem.position.y + otherItem.size.height / 2

        // 左边对齐
        if (Math.abs(newX - otherItem.position.x) < snapThreshold) {
          newX = otherItem.position.x
          alignmentGuides.value.push({ direction: 'vertical', position: newX })
        }

        // 右边对齐
        if (
          Math.abs(newX + currentItem.size.width - (otherItem.position.x + otherItem.size.width)) <
          snapThreshold
        ) {
          newX = otherItem.position.x + otherItem.size.width - currentItem.size.width
          alignmentGuides.value.push({
            direction: 'vertical',
            position: newX + currentItem.size.width
          })
        }

        // 顶边对齐
        if (Math.abs(newY - otherItem.position.y) < snapThreshold) {
          newY = otherItem.position.y
          alignmentGuides.value.push({ direction: 'horizontal', position: newY })
        }

        // 底边对齐
        if (
          Math.abs(
            newY + currentItem.size.height - (otherItem.position.y + otherItem.size.height)
          ) < snapThreshold
        ) {
          newY = otherItem.position.y + otherItem.size.height - currentItem.size.height
          alignmentGuides.value.push({
            direction: 'horizontal',
            position: newY + currentItem.size.height
          })
        }

        // 中心对齐（水平和垂直）
        if (Math.abs(currentCenterX - otherCenterX) < snapThreshold) {
          newX = otherCenterX - currentItem.size.width / 2
          alignmentGuides.value.push({ direction: 'vertical', position: otherCenterX })
        }
        if (Math.abs(currentCenterY - otherCenterY) < snapThreshold) {
          newY = otherCenterY - currentItem.size.height / 2
          alignmentGuides.value.push({ direction: 'horizontal', position: otherCenterY })
        }

        // 间距对齐
        // 左边相邻
        if (
          Math.abs(newX - (otherItem.position.x + otherItem.size.width + SPACING)) < snapThreshold
        ) {
          newX = otherItem.position.x + otherItem.size.width + SPACING
          alignmentGuides.value.push({ direction: 'vertical', position: newX - SPACING })
        }
        // 右边相邻
        if (
          Math.abs(newX + currentItem.size.width + SPACING - otherItem.position.x) < snapThreshold
        ) {
          newX = otherItem.position.x - currentItem.size.width - SPACING
          alignmentGuides.value.push({
            direction: 'vertical',
            position: newX + currentItem.size.width + SPACING
          })
        }
        // 顶边相邻
        if (
          Math.abs(newY - (otherItem.position.y + otherItem.size.height + SPACING)) < snapThreshold
        ) {
          newY = otherItem.position.y + otherItem.size.height + SPACING
          alignmentGuides.value.push({ direction: 'horizontal', position: newY - SPACING })
        }
        // 底边相邻
        if (
          Math.abs(newY + currentItem.size.height + SPACING - otherItem.position.y) < snapThreshold
        ) {
          newY = otherItem.position.y - currentItem.size.height - SPACING
          alignmentGuides.value.push({
            direction: 'horizontal',
            position: newY + currentItem.size.height + SPACING
          })
        }
      }
    })

    return { newX, newY }
  }

  // 更新项目位置
  const updateItemPosition = (id: string, x: number, y: number) => {
    const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === id)
    if (itemIndex !== -1) {
      const updatedItem = { ...whiteboardNotes.value[itemIndex] }
      updatedItem.position = { x, y }
      whiteboardNotes.value.splice(itemIndex, 1, updatedItem)
    }
  }

  return {
    draggingItem,
    hasMoved,
    alignmentGuides,
    startDragging,
    onDrag,
    stopDragging,
    updateItemPosition
  }
}
