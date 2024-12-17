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

        <ConnectionLine
          v-for="connection in mindBoard?.connections"
          :key="connection.id"
          :connection="connection"
          :scale="scale"
        />

        <TextCardElement
          v-for="element in textElements"
          :key="element.id"
          :card="element"
          :scale="scale"
          :selected="element.id === selectedElementId"
          :is-connecting="isConnecting"
          :connecting-from-id="connectingFromId"
          :connecting-anchor="connectingAnchor"
          :target-anchor="targetAnchor"
          @select="selectedElementId = element.id"
          @delete="handleDeleteElement(element.id)"
          @focus="handleFocusElement"
          @update="updateElement"
          @start-connection="handleStartConnection"
          @end-connection="handleEndConnection"
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

    <div v-if="isConnecting" class="connection-preview" :style="connectionPreviewStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useMindBoardStore } from '@renderer/stores/mindboardStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { Notes, Book, Picture } from '@icon-park/vue-next'
import TextCardElement from '@renderer/components/mindboard/TextCardElement.vue'
import { TextCard } from '../types/mindboard'
import ConnectionLine from '@renderer/components/mindboard/ConnectionLine.vue'
import type { MindBoardConnection } from '@renderer/types/mindboard'

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

const isConnecting = ref(false)
const connectingFromId = ref<string | undefined>(undefined)
const connectingAnchor = ref<'top' | 'right' | 'bottom' | 'left' | null>(null)
const targetAnchor = ref<'top' | 'right' | 'bottom' | 'left' | null>(null)

const handleStartConnection = (elementId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
  isConnecting.value = true
  connectingFromId.value = elementId
  connectingAnchor.value = anchor
}

const handleEndConnection = async (
  elementId: string,
  anchor: 'top' | 'right' | 'bottom' | 'left'
) => {
  if (!isConnecting.value || !connectingFromId.value || !mindBoard.value) return

  const connection: Omit<MindBoardConnection, 'id'> = {
    fromId: connectingFromId.value,
    toId: elementId,
    boardId: mindBoard.value.id,
    fromAnchor: connectingAnchor.value!,
    toAnchor: anchor,
    style: {
      color: 'var(--color-text-secondary)',
      size: 2,
      path: 'fluid',
      startPlug: 'behind',
      endPlug: 'arrow1'
    }
  }

  try {
    await mindBoardStore.createConnection(mindBoard.value.id, connection)
  } catch (error) {
    console.error('创建连线失败:', error)
  }

  isConnecting.value = false
  connectingFromId.value = undefined
  connectingAnchor.value = null
  targetAnchor.value = null
}

const connectionPreviewStyle = ref({
  display: 'none',
  left: '0px',
  top: '0px',
  width: '0px',
  height: '0px',
  transform: 'rotate(0deg)'
})

const updateConnectionPreview = (e: MouseEvent) => {
  if (!isConnecting.value || !connectingFromId.value) return

  const sourceElement = document.querySelector(`[data-element-id="${connectingFromId.value}"]`)
  if (!sourceElement) return

  const sourceRect = sourceElement.getBoundingClientRect()
  const sourceCenter = {
    x: sourceRect.left + sourceRect.width / 2,
    y: sourceRect.top + sourceRect.height / 2
  }

  const dx = e.clientX - sourceCenter.x
  const dy = e.clientY - sourceCenter.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  connectionPreviewStyle.value = {
    display: 'block',
    left: `${sourceCenter.x}px`,
    top: `${sourceCenter.y}px`,
    width: `${distance}px`,
    height: '2px',
    transform: `rotate(${angle}deg)`
  }
}

watch(isConnecting, (newValue) => {
  if (newValue) {
    document.addEventListener('mousemove', updateConnectionPreview)
  } else {
    document.removeEventListener('mousemove', updateConnectionPreview)
    connectionPreviewStyle.value.display = 'none'
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', updateConnectionPreview)
  window.removeEventListener('resize', initializeView)
})

const transformLayerStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px)`,
  transformOrigin: '0 0'
}))

const textElements = computed(() => {
  if (!mindBoard.value) return []
  return mindBoard.value.elements.filter((element): element is TextCard => element.type === 'text')
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
  position: fixed;
  pointer-events: none;
  background-color: var(--color-primary);
  transform-origin: left center;
  opacity: 0.5;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    right: -6px;
    top: -4px;
    width: 0;
    height: 0;
    border-left: 8px solid var(--color-primary);
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }
}
</style>
