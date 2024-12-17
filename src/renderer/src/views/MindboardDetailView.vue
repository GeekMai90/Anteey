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
      <div
        class="canvas"
        :style="{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          cursor: isPanning ? 'grabbing' : 'grab'
        }"
      >
        <!-- 网格背景 -->
        <div class="grid-background"></div>

        <!-- 元素容器 -->
        <div class="elements-container">
          <template v-if="mindBoard">
            <template v-for="element in mindBoard.elements" :key="element.id">
              <TextCardElement
                v-if="element.type === 'text'"
                :card="element"
                :scale="scale"
                :selected="element.id === selectedElementId"
                @select="selectedElementId = element.id"
                @delete="handleDeleteElement(element.id)"
                @focus="handleFocusElement(element)"
                @update="updateElement"
              />
              <!-- 后续添加其他类型的元素 -->
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
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

    <!-- 拖动预览 -->
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMindBoardStore } from '@renderer/stores/mindboardStore'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { Notes, Book, Picture } from '@icon-park/vue-next'
import TextCardElement from '@renderer/components/mindboard/TextCardElement.vue'
import { TextCard } from '../types/mindboard'

const route = useRoute()
const mindBoardStore = useMindBoardStore()
const canvasRef = ref<HTMLDivElement | null>(null)

// 画布状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)
const lastX = ref(0)
const lastY = ref(0)

// 拖动相关状态
const draggingPreview = ref(false)
const previewPosition = ref({ x: 0, y: 0 })
const draggingType = ref<'text' | 'note' | 'image' | null>(null)

// 状态管理
const selectedElementId = ref<string | null>(null)

// 获取思维板数据
const mindBoard = computed(() => mindBoardStore.currentMindBoard)

const loadMindBoard = async () => {
  const boardId = route.params.id as string
  try {
    await mindBoardStore.fetchMindBoard(boardId)
    console.log('Loaded mindboard:', mindBoardStore.currentMindBoard)
  } catch (error) {
    console.error('Failed to load mindboard:', error)
  }
}

onMounted(() => {
  loadMindBoard()
})

// 监听路由变化，重新加载数据
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadMindBoard()
    }
  }
)

// 画布缩放
const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale.value = Math.min(Math.max(0.1, scale.value * delta), 5)
  }
}

// 重置缩放
const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 画布平移
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

// 辅助函数：计算画布坐标
const calculateCanvasPosition = (clientX: number, clientY: number) => {
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (!canvasRect) return null

  // 计算相对于画布容器的位置
  const x = (clientX - canvasRect.left) / scale.value - translateX.value
  const y = (clientY - canvasRect.top) / scale.value - translateY.value

  return { x, y }
}

// 插入卡片方法
const insertTextCard = () => {
  const canvasRect = canvasRef.value?.getBoundingClientRect()
  if (!canvasRect) return

  // 计算画布中心位置
  const center = calculateCanvasPosition(
    canvasRect.left + canvasRect.width / 2,
    canvasRect.top + canvasRect.height / 2
  )

  if (center) {
    createElementAtPosition(center.x, center.y)
  }
}

const insertNoteCard = () => {
  // TODO: 实现插入笔记卡片
  console.log('插入笔记卡片')
}

const insertImageCard = () => {
  // TODO: 实现插入图片卡片
  console.log('插入图片卡片')
}

// 更新元素
const updateElement = async (updateData: Partial<TextCard>) => {
  if (!mindBoard.value || !updateData.id) return
  await mindBoardStore.updateElement(updateData)
}

// 开始拖动
const startDragging = (type: 'text' | 'note' | 'image', e: MouseEvent) => {
  // 阻止点击事件
  e.preventDefault()
  e.stopPropagation()

  // 记录初始位置
  const startX = e.clientX
  const startY = e.clientY

  // 是否已经开始拖动
  let isDragging = false

  draggingType.value = type
  // draggingPreview.value = true

  const handleDrag = (e: MouseEvent) => {
    // 计算移动距离
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    // 如果移动距离超过阈值，则认为是拖动
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

    // 如果没有拖动，则视为点击
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
      // 后续可以添加其他类型的处理
    } else {
      // 拖动结束，在释放位置创建元素
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

// 在指定位置创建元素
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

// 处理鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  // 先处理取消选中
  const target = e.target as HTMLElement
  if (
    target.classList.contains('canvas-container') ||
    target.classList.contains('canvas') ||
    target.classList.contains('grid-background') ||
    target.classList.contains('elements-container')
  ) {
    selectedElementId.value = null
  }

  // 再处理画布拖动
  if (target.closest('.text-content[contenteditable="true"]')) {
    return
  }

  isPanning.value = true
  lastX.value = e.clientX
  lastY.value = e.clientY
}

// 处理删除元素
const handleDeleteElement = async (elementId: string) => {
  if (!mindBoard.value) return

  try {
    await mindBoardStore.deleteElement(elementId)
    // 如果删除的是当前选中的元素，取消选中状态
    if (selectedElementId.value === elementId) {
      selectedElementId.value = null
    }
  } catch (error) {
    console.error('删除元素失败:', error)
  }
}

// 处理聚焦元素
const handleFocusElement = (element: TextCard) => {
  if (!canvasRef.value) return

  // 获取画布元素
  const canvas = canvasRef.value.querySelector('.canvas') as HTMLElement
  if (!canvas) return

  // 添加过渡效果
  canvas.style.transition = 'transform 0.3s ease'

  // 先重置缩放
  scale.value = 1

  // 获取画布容器的中心点
  const containerRect = canvasRef.value.getBoundingClientRect()
  const containerCenterX = containerRect.width / 2
  const containerCenterY = containerRect.height / 2

  // 计算元素中心点到容器中心点的距离
  const elementCenterX = element.position.x + element.size.width / 2
  const elementCenterY = element.position.y + element.size.height / 2

  // 计算需要的平移量，使元素中心与容器中心对齐
  translateX.value = containerCenterX / scale.value - elementCenterX
  translateY.value = containerCenterY / scale.value - elementCenterY

  // 恢复默认过渡效果
  setTimeout(() => {
    canvas.style.transition = 'transform 0.1s ease'
  }, 300)
}
</script>

<style lang="scss" scoped>
.mindboard-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
}

.toolbar {
  // border-bottom: 1px solid var(--color-border);
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
  overflow: hidden;
  position: relative;
  background-color: var(--color-bg-secondary);
}

.canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-origin: center;
  transition: transform 0.1s ease;
}

.grid-background {
  position: absolute;
  width: 100%;
  height: 100%;
}

.elements-container {
  position: relative;
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
</style>
