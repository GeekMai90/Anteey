<template>
  <div class="mindboard-detail">
    <AppToolbar :showBackButton="true" :showForwardButton="true" class="toolbar">
      <template #left>
        <div class="board-title">{{ mindBoard?.name || '加载中...' }}</div>
      </template>
      <template #right>
        <button class="zoom-button" @click="resetZoom">{{ Math.round(scale * 100) }}%</button>
      </template>
    </AppToolbar>

    <div
      ref="canvasRef"
      class="canvas-container"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="pan"
      @mouseup="stopPan"
      @mouseleave="stopPan"
    >
      <div ref="transformLayerRef" class="transform-layer" :style="transformLayerStyle">
        <div class="grid-background"></div>

        <template v-for="connection in validConnections" :key="connection.id">
          <ConnectionLine
            :startX="connection.points.start.x"
            :startY="connection.points.start.y"
            :endX="connection.points.end.x"
            :endY="connection.points.end.y"
            :label="connection.label"
            :style="{
              color: connection.style?.color,
              width: connection.style?.size,
              dashArray: connection.style?.dash ? [4, 4] : undefined
            }"
          />
        </template>

        <TextCardElement
          v-for="element in textElements"
          :key="element.id"
          :card="element"
          :scale="scale"
          :selected="element.id === selectedElementId"
          :isConnectingSource="connectingSource?.elementId === element.id"
          :isConnectingTarget="isConnecting && connectingSource?.elementId !== element.id"
          @select="handleTextCardSelect"
          @delete="handleDeleteElement"
          @focus="handleFocusElement"
          @update="updateElement"
          @startConnection="startConnection"
          @endConnection="finishConnection"
        />
      </div>
    </div>

    <div class="bottom-toolbar">
      <div class="toolbar-buttons">
        <button
          class="toolbar-button"
          @mousedown="(e) => startDragging('text', e)"
          v-tooltip.top="'插入卡片'"
        >
          <Notes theme="outline" size="20" :strokeWidth="3" />
        </button>
        <button class="toolbar-button" @click="insertNoteCard" v-tooltip.top="'插入笔记'">
          <Book theme="outline" size="20" :strokeWidth="3" />
        </button>
        <button class="toolbar-button" @click="insertImageCard" v-tooltip.top="'插入图片'">
          <Picture theme="outline" size="20" :strokeWidth="3" />
        </button>
      </div>
    </div>

    <div
      v-if="draggingPreview"
      class="dragging-preview"
      :style="{
        left: `${previewPosition.x}px`,
        top: `${previewPosition.y}px`
      }"
    >
      <Notes theme="outline" size="20" :strokeWidth="3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useMindBoardStore } from '@renderer/stores/mindboardStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { Notes, Book, Picture } from '@icon-park/vue-next'
import TextCardElement from '@renderer/components/mindboard/TextCardElement.vue'
import ConnectionLine from '@renderer/components/mindboard/ConnectionLine.vue'
import type { TextCard } from '../types/mindboard'

const route = useRoute()
const mindBoardStore = useMindBoardStore()
const canvasRef = ref<HTMLDivElement | null>(null)
const transformLayerRef = ref<HTMLDivElement | null>(null)

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)
const lastX = ref(0)
const lastY = ref(0)

const draggingPreview = ref(false)
const previewPosition = ref({ x: 0, y: 0 })
const draggingType = ref<'text' | 'note' | 'image' | null>(null)

const selectedElementId = ref<string | null>(null)

const mindBoard = computed(() => mindBoardStore.currentMindBoard)

const initializeView = () => {
  if (!mindBoard.value || !canvasRef.value) return

  if (mindBoard.value.elements.length === 0) return

  const bounds = mindBoard.value.elements.reduce(
    (acc, element) => {
      acc.left = Math.min(acc.left, element.position.x)
      acc.right = Math.max(acc.right, element.position.x + element.size.width)
      acc.top = Math.min(acc.top, element.position.y)
      acc.bottom = Math.max(acc.bottom, element.position.y + element.size.height)
      return acc
    },
    {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity
    }
  )

  if (bounds.left === Infinity) return

  const contentCenterX = (bounds.left + bounds.right) / 2
  const contentCenterY = (bounds.top + bounds.bottom) / 2

  const containerRect = canvasRef.value.getBoundingClientRect()
  const containerCenterX = containerRect.width / 2
  const containerCenterY = containerRect.height / 2

  translateX.value = containerCenterX / scale.value - contentCenterX
  translateY.value = containerCenterY / scale.value - contentCenterY
}

const loadMindBoard = async () => {
  const boardId = route.params.id as string
  try {
    await mindBoardStore.fetchMindBoard(boardId)
    console.log('Loaded mindboard:', mindBoardStore.currentMindBoard)
    nextTick(initializeView)
  } catch (error) {
    console.error('Failed to load mindboard:', error)
  }
}

onMounted(() => {
  loadMindBoard()
  window.addEventListener('resize', initializeView)
})

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadMindBoard()
    }
  }
)

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()

    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const contentX = (mouseX - translateX.value * scale.value) / scale.value
    const contentY = (mouseY - translateY.value * scale.value) / scale.value

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(0.1, scale.value * delta), 5)

    scale.value = newScale
    translateX.value = (mouseX - contentX * newScale) / newScale
    translateY.value = (mouseY - contentY * newScale) / newScale
  }
}

const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const pan = (e: MouseEvent) => {
  if (!isPanning.value) return
  const dx = e.clientX - lastX.value
  const dy = e.clientY - lastY.value
  translateX.value += dx / scale.value
  translateY.value += dy / scale.value
  lastX.value = e.clientX
  lastY.value = e.clientY
}

const stopPan = () => {
  isPanning.value = false
}

const calculateCanvasPosition = (clientX: number, clientY: number) => {
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (!canvasRect) return null

  const x = (clientX - canvasRect.left) / scale.value - translateX.value
  const y = (clientY - canvasRect.top) / scale.value - translateY.value

  return { x, y }
}

const insertTextCard = () => {
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (!canvasRect) return

  const center = calculateCanvasPosition(
    canvasRect.left + canvasRect.width / 2,
    canvasRect.top + canvasRect.height / 2
  )

  if (center) {
    createElementAtPosition(center.x, center.y)
  }
}

const insertNoteCard = () => {
  console.log('插入笔记卡片')
}

const insertImageCard = () => {
  console.log('插入图片卡片')
}

const updateElement = async (updateData: Partial<TextCard>) => {
  if (!mindBoard.value || !updateData.id) return

  try {
    await mindBoardStore.updateElement(updateData)
  } catch (error) {
    console.error('更新元素失败:', error)
  }
}

const startDragging = (type: 'text' | 'note' | 'image', e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const startX = e.clientX
  const startY = e.clientY

  let isDragging = false

  draggingType.value = type
  draggingPreview.value = true

  const handleDrag = (e: MouseEvent) => {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isDragging = true
      draggingPreview.value = true
    }

    if (!isDragging) return

    previewPosition.value = {
      x: e.clientX,
      y: e.clientY
    }
  }

  const handleDragEnd = (e: MouseEvent) => {
    draggingPreview.value = false
    draggingType.value = null

    if (!isDragging) {
      switch (type) {
        case 'text':
          insertTextCard()
          break
        case 'note':
          insertNoteCard()
          break
        case 'image':
          insertImageCard()
          break
      }
    } else {
      const pos = calculateCanvasPosition(e.clientX, e.clientY)
      if (pos) {
        createElementAtPosition(pos.x, pos.y)
      }
    }

    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
}

const createElementAtPosition = async (x: number, y: number) => {
  if (!mindBoard.value) return

  const element: TextCard = {
    id: crypto.randomUUID(),
    type: 'text',
    boardId: mindBoard.value.id,
    position: { x, y },
    size: { width: 200, height: 36 },
    content: '',
    zIndex: 1,
    style: {}
  }

  await mindBoardStore.createElement(mindBoard.value.id, element)
}

const handleMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (
    target.classList.contains('canvas-container') ||
    target.classList.contains('canvas') ||
    target.classList.contains('grid-background') ||
    target.classList.contains('elements-container')
  ) {
    selectedElementId.value = null
  }

  if (target.closest('.text-content[contenteditable="true"]')) {
    return
  }

  isPanning.value = true
  lastX.value = e.clientX
  lastY.value = e.clientY
}

const handleDeleteElement = async (elementId: string) => {
  if (!mindBoard.value) return

  try {
    await mindBoardStore.deleteElement(elementId)
    if (selectedElementId.value === elementId) {
      selectedElementId.value = null
    }
  } catch (error) {
    console.error('删除元素失败:', error)
  }
}

const handleFocusElement = (element: TextCard) => {
  if (!canvasRef.value) return

  scale.value = 1

  const containerRect = canvasRef.value.getBoundingClientRect()
  const containerCenterX = containerRect.width / 2
  const containerCenterY = containerRect.height / 2

  const elementCenterX = element.position.x + element.size.width / 2
  const elementCenterY = element.position.y + element.size.height / 2

  translateX.value = containerCenterX - elementCenterX
  translateY.value = containerCenterY - elementCenterY
}

const transformLayerStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px)`,
  transformOrigin: '0 0'
}))

const textElements = computed(() => {
  return (
    mindBoard.value?.elements.filter((element): element is TextCard => element.type === 'text') ||
    []
  )
})

const isConnecting = ref(false)
const connectingSource = ref<{
  elementId: string
  anchor: 'top' | 'right' | 'bottom' | 'left'
} | null>(null)

const startConnection = (elementId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
  isConnecting.value = true
  connectingSource.value = {
    elementId,
    anchor
  }
}

const finishConnection = async (
  targetId: string,
  targetAnchor: 'top' | 'right' | 'bottom' | 'left'
) => {
  if (!connectingSource.value || !mindBoard.value) return

  try {
    await mindBoardStore.createConnection(mindBoard.value.id, {
      boardId: mindBoard.value.id,
      fromId: connectingSource.value.elementId,
      toId: targetId,
      fromAnchor: connectingSource.value.anchor,
      toAnchor: targetAnchor
    })
  } catch (error) {
    console.error('创建连接失败:', error)
  } finally {
    isConnecting.value = false
    connectingSource.value = null
  }
}

const getConnectionPoint = (
  elementId: string,
  anchor: 'top' | 'right' | 'bottom' | 'left'
): { x: number; y: number } | null => {
  const element = textElements.value.find((el) => el.id === elementId)
  if (!element) {
    console.warn(`找不到元素: ${elementId}`)
    return null
  }

  const { x, y } = element.position
  const { width, height } = element.size

  switch (anchor) {
    case 'top':
      return { x: x + width / 2, y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x, y: y + height / 2 }
  }
}

const handleTextCardSelect = (elementId: string) => {
  selectedElementId.value = elementId
}

const validConnections = computed(() => {
  const allConnections = mindBoard.value?.connections || []
  return allConnections
    .map((connection) => {
      const fromPoint = getConnectionPoint(connection.fromId, connection.fromAnchor)
      const toPoint = getConnectionPoint(connection.toId, connection.toAnchor)

      if (!fromPoint || !toPoint) {
        console.warn(`找不到连接 ${connection.id} 的端点坐标`)
        return null
      }

      return {
        ...connection,
        points: {
          start: fromPoint,
          end: toPoint
        }
      }
    })
    .filter((connection): connection is NonNullable<typeof connection> => connection !== null)
})
</script>

<style lang="scss" scoped>
.mindboard-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
}

.toolbar {
  background-color: var(--color-bg-secondary);

  .board-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .zoom-button {
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: none;
    cursor: pointer;
    color: var(--color-text-secondary);

    &:hover {
      background-color: var(--color-hover-bg);
    }
  }
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: var(--color-bg-secondary);
}

.transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.grid-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.bottom-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  padding: 6px;

  .toolbar-buttons {
    display: flex;
    gap: 4px;

    .toolbar-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: none;
      cursor: pointer;
      color: var(--color-text-primary);
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}

.dragging-preview {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  width: 40px;
  height: 40px;
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  box-shadow: var(--shadow-primary);
  opacity: 0.8;
}

.connection-preview {
  display: none;
}
</style>
