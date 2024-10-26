<!-- src/renderer/src/views/WhiteboardView.vue -->
<template>
  <div class="whiteboard-view">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <!-- 主容器 -->
    <div
      ref="containerRef"
      class="whiteboard-canvas"
      :class="{ grabbing: isDragging }"
      @dblclick="handleContainerDoubleClick"
      @contextmenu.prevent
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 变换层 -->
      <div ref="transformLayerRef" class="whiteboard-transform-layer" :style="transformLayerStyle">
        <!-- 白板项（缩略图） -->
        <WhiteboardThumbnail
          v-for="whiteboard in whiteboards"
          :key="whiteboard.id"
          :whiteboard="whiteboard"
          @click="openWhiteboard(whiteboard.id)"
          @mousedown.stop="startDraggingThumbnail(whiteboard, $event)"
        />
      </div>
    </div>
    <!-- 适应视图按钮 -->
    <div class="fit-view-button" @click="fitView">
      <div class="icon">
        <Aiming theme="outline" size="24" fill="#333" />
      </div>
    </div>
    <!-- 上下文菜单组件 -->
    <ContextMenu />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, onUnmounted, computed, watch } from 'vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { useRouter } from 'vue-router'
import WhiteboardThumbnail from '@renderer/components/WhiteboardThumbnail.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import type { CreateWhiteboardInput, Whiteboard } from '@renderer/types/Note'
import ContextMenu from '../components/ContexMenu.vue'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { Add, Aiming } from '@icon-park/vue-next'

// 初始化路由和状态管理
const router = useRouter()
const whiteboardStore = useWhiteboardStore()
const contextMenuStore = useContextMenuStore()

// 定义响应式变量
const whiteboards = ref<Whiteboard[]>([])
const containerRef = ref<HTMLElement | null>(null)
const transformLayerRef = ref<HTMLElement | null>(null)

// 缩放和平移状态
const scale = ref<number>(1)
const translateX = ref(0)
const translateY = ref(0)
let isDragging = false
const isMouseDown = ref(false)
let lastX = 0
let lastY = 0

// 计算内容样式
const transformLayerStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

// 实现平移逻辑
// 组件挂载时执行的操作
onMounted(async () => {
  await checkAndCreateRootWhiteboard()
  await whiteboardStore.getTopLevelWhiteboards()
  whiteboards.value = whiteboardStore.whiteboards
  loadViewState()
  console.log('whiteboards', whiteboards.value)
})

// 检查并创建根白板
const checkAndCreateRootWhiteboard = async () => {
  const rootWhiteboard = await whiteboardStore.getRootWhiteboard()
  console.log('根白板的值是：', rootWhiteboard)
  if (rootWhiteboard) {
    return
  }
  await whiteboardStore.createRootWhiteboard()
}

// 打开白板详情
const openWhiteboard = (id: string) => {
  console.log('打开白板详情', id)
  router.push({ name: 'whiteboardDetail', params: { whiteboardId: id } })
}

// 创建新白板
const createNewWhiteboard = async (x: number, y: number) => {
  const input: CreateWhiteboardInput = {
    name: '新白板',
    isTopLevel: true,
    position: { x, y },
    size: { width: 300, height: 150 },
    zoomLevel: 1,
    scrollPosition: { x, y },
    scale: 1,
    translateX: 0,
    translateY: 0,
    parentId: 'root'
  }
  try {
    await whiteboardStore.createWhiteboard(input)
    whiteboards.value = whiteboardStore.whiteboards
    contextMenuStore.closeMenu()
  } catch (error) {
    console.error('Failed to create whiteboard:', error)
  }
}

// 双击空白处新增白板
const handleContainerDoubleClick = (event: MouseEvent) => {
  console.log('handleContainerDoubleClick', event)
  event.preventDefault()
  event.stopPropagation()

  if (!containerRef.value) {
    console.error('containerRef is null')
    return
  }
  // 检查事件目标是否是 contentRef 或其子元素
  if (event.target === containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()

    const x = (event.clientX - rect.left) / scale.value - translateX.value
    const y = (event.clientY - rect.top) / scale.value - translateY.value

    contextMenuStore.showMenu(event.clientX, event.clientY, [
      {
        label: '新建白板',
        icon: markRaw(Add),
        action: () => createNewWhiteboard(x, y)
      }
    ])
  } else {
    console.log('双击事件的目标不是 contentRef 或其子元素')
  }
}

// 处理鼠标按下事件
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0 || event.button === 2) {
    isMouseDown.value = true
    // 左键或右键
    event.preventDefault()
    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

// 处理鼠标移动事件
const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging) return
  if (isMouseDown.value) {
    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY
    translateX.value += deltaX
    translateY.value += deltaY
    lastX = event.clientX
    lastY = event.clientY
  }
}
// 处理鼠标松开事件
const handleMouseUp = () => {
  isMouseDown.value = false
  isDragging = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 处理滚轮事件（用于缩放和平移）
const handleWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault()

    // 使用较小的缩放增量来使缩放更平滑
    const zoomIntensity = 0.1
    const delta = event.deltaY > 0 ? -zoomIntensity : zoomIntensity
    const newScale = Math.max(0.1, Math.min(scale.value * (1 + delta), 5))

    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // 计算新的平移值
    const newTranslateX = mouseX - (mouseX - translateX.value) * (newScale / scale.value)
    const newTranslateY = mouseY - (mouseY - translateY.value) * (newScale / scale.value)

    // 应用新的缩放和平移值
    scale.value = newScale
    translateX.value = newTranslateX
    translateY.value = newTranslateY
  } else {
    // 平移逻辑保持不变
    translateX.value -= event.deltaX
    translateY.value -= event.deltaY
  }
}

// 处理触摸开始事件
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 1) {
    event.preventDefault()
    isDragging = true
    lastX = event.touches[0].clientX
    lastY = event.touches[0].clientY
  }
}

// 处理触摸移动事件
const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging || event.touches.length !== 1) return
  event.preventDefault()
  const touch = event.touches[0]
  const deltaX = touch.clientX - lastX
  const deltaY = touch.clientY - lastY
  translateX.value += deltaX
  translateY.value += deltaY
  lastX = touch.clientX
  lastY = touch.clientY
}

// 处理触摸结束事件
const handleTouchEnd = () => {
  isDragging = false
}

// 适应视图（使所有白板缩略图适应当前视图）
const fitView = async () => {
  // 确保白板数据是最新的
  await whiteboardStore.getTopLevelWhiteboards()
  whiteboards.value = whiteboardStore.whiteboards

  if (!containerRef.value || whiteboards.value.length === 0) return

  const containerRect = containerRef.value.getBoundingClientRect()

  // 计算所有白板的边界
  const bounds = whiteboards.value.reduce(
    (acc, wb) => {
      acc.left = Math.min(acc.left, wb.position.x)
      acc.top = Math.min(acc.top, wb.position.y)
      acc.right = Math.max(acc.right, wb.position.x + wb.size.width)
      acc.bottom = Math.max(acc.bottom, wb.position.y + wb.size.height)
      return acc
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  )

  const contentWidth = bounds.right - bounds.left
  const contentHeight = bounds.bottom - bounds.top

  // 计算内容的中心点
  const contentCenterX = (bounds.left + bounds.right) / 2
  const contentCenterY = (bounds.top + bounds.bottom) / 2

  // 计算缩放比例
  const padding = 50 // 边距
  const scaleX = (containerRect.width - padding * 2) / contentWidth
  const scaleY = (containerRect.height - padding * 2) / contentHeight
  const newScale = Math.min(scaleX, scaleY, 1) // 限制最大缩放为 1

  // 计算新的平移值，使内容居中
  const newTranslateX = containerRect.width / 2 - contentCenterX * newScale
  const newTranslateY = containerRect.height / 2 - contentCenterY * newScale

  // 应用新的缩放和平移值
  scale.value = newScale
  translateX.value = newTranslateX
  translateY.value = newTranslateY

  // 保存新的视图状态
  saveViewState()
}

// 保存视图状态
const saveViewState = async () => {
  await whiteboardStore.saveViewStateToRootWhiteboard(
    scale.value,
    translateX.value,
    translateY.value
  )
}

// 加载视图状态
const loadViewState = async () => {
  const savedState = await whiteboardStore.getRootWhiteboardViewState()
  console.log('savedState', savedState)
  if (savedState) {
    scale.value = savedState.scale
    translateX.value = savedState.translateX
    translateY.value = savedState.translateY
  }
}

// 拖动缩略图相关逻辑
const draggingThumbnail = ref<{ id: string; startX: number; startY: number } | null>(null)
// 磁性吸附和对齐辅助
const SNAP_THRESHOLD = 10 // 吸附阈值（像素）
const alignmentGuides = ref<{ direction: 'horizontal' | 'vertical'; position: number }[]>([])

// 开始拖动缩略图
const startDraggingThumbnail = (whiteboard: Whiteboard, event: MouseEvent) => {
  if (!transformLayerRef.value) return
  const rect = transformLayerRef.value.getBoundingClientRect()
  draggingThumbnail.value = {
    id: whiteboard.id,
    startX: (event.clientX - rect.left - translateX.value) / scale.value - whiteboard.position.x,
    startY: (event.clientY - rect.top - translateY.value) / scale.value - whiteboard.position.y
  }

  document.addEventListener('mousemove', onDragThumbnail)
  document.addEventListener('mouseup', stopDraggingThumbnail)
}

// 拖动缩略图过程中，有磁性吸附的效果
const SPACING = 5 // 定义缩略图之间的间距
const onDragThumbnail = (event: MouseEvent) => {
  if (!draggingThumbnail.value || !transformLayerRef.value) return

  const { id, startX, startY } = draggingThumbnail.value
  const rect = transformLayerRef.value.getBoundingClientRect()

  let newCenterX = (event.clientX - rect.left - translateX.value) / scale.value - startX
  let newCenterY = (event.clientY - rect.top - translateY.value) / scale.value - startY

  alignmentGuides.value = []

  const currentWhiteboard = whiteboards.value.find((wb) => wb.id === id)
  if (!currentWhiteboard) return

  const snapThreshold = SNAP_THRESHOLD / scale.value

  whiteboards.value.forEach((otherWhiteboard) => {
    if (otherWhiteboard.id !== id) {
      // 左边对齐
      if (
        Math.abs(
          newCenterX -
            currentWhiteboard.size.width / 2 -
            (otherWhiteboard.position.x - otherWhiteboard.size.width / 2)
        ) < snapThreshold
      ) {
        newCenterX =
          otherWhiteboard.position.x -
          otherWhiteboard.size.width / 2 +
          currentWhiteboard.size.width / 2
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newCenterX - currentWhiteboard.size.width / 2
        })
      }
      // 右边对齐
      if (
        Math.abs(
          newCenterX +
            currentWhiteboard.size.width / 2 -
            (otherWhiteboard.position.x + otherWhiteboard.size.width / 2)
        ) < snapThreshold
      ) {
        newCenterX =
          otherWhiteboard.position.x +
          otherWhiteboard.size.width / 2 -
          currentWhiteboard.size.width / 2
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newCenterX + currentWhiteboard.size.width / 2
        })
      }
      // 顶边对齐
      if (
        Math.abs(
          newCenterY -
            currentWhiteboard.size.height / 2 -
            (otherWhiteboard.position.y - otherWhiteboard.size.height / 2)
        ) < snapThreshold
      ) {
        newCenterY =
          otherWhiteboard.position.y -
          otherWhiteboard.size.height / 2 +
          currentWhiteboard.size.height / 2
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newCenterY - currentWhiteboard.size.height / 2
        })
      }
      // 底边对齐
      if (
        Math.abs(
          newCenterY +
            currentWhiteboard.size.height / 2 -
            (otherWhiteboard.position.y + otherWhiteboard.size.height / 2)
        ) < snapThreshold
      ) {
        newCenterY =
          otherWhiteboard.position.y +
          otherWhiteboard.size.height / 2 -
          currentWhiteboard.size.height / 2
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newCenterY + currentWhiteboard.size.height / 2
        })
      }
      // 中间对齐（水平）
      if (Math.abs(newCenterX - otherWhiteboard.position.x) < snapThreshold) {
        newCenterX = otherWhiteboard.position.x
        alignmentGuides.value.push({ direction: 'vertical', position: newCenterX })
      }
      // 中间对齐（垂直）
      if (Math.abs(newCenterY - otherWhiteboard.position.y) < snapThreshold) {
        newCenterY = otherWhiteboard.position.y
        alignmentGuides.value.push({ direction: 'horizontal', position: newCenterY })
      }
      // 左边相邻
      if (
        Math.abs(
          newCenterX -
            currentWhiteboard.size.width / 2 -
            (otherWhiteboard.position.x + otherWhiteboard.size.width / 2 + SPACING)
        ) < snapThreshold
      ) {
        newCenterX =
          otherWhiteboard.position.x +
          otherWhiteboard.size.width / 2 +
          SPACING +
          currentWhiteboard.size.width / 2
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newCenterX - currentWhiteboard.size.width / 2 - SPACING
        })
      }
      // 右边相邻
      if (
        Math.abs(
          newCenterX +
            currentWhiteboard.size.width / 2 +
            SPACING -
            (otherWhiteboard.position.x - otherWhiteboard.size.width / 2)
        ) < snapThreshold
      ) {
        newCenterX =
          otherWhiteboard.position.x -
          otherWhiteboard.size.width / 2 -
          SPACING -
          currentWhiteboard.size.width / 2
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newCenterX + currentWhiteboard.size.width / 2 + SPACING
        })
      }
      // 顶边相邻
      if (
        Math.abs(
          newCenterY -
            currentWhiteboard.size.height / 2 -
            (otherWhiteboard.position.y + otherWhiteboard.size.height / 2 + SPACING)
        ) < snapThreshold
      ) {
        newCenterY =
          otherWhiteboard.position.y +
          otherWhiteboard.size.height / 2 +
          SPACING +
          currentWhiteboard.size.height / 2
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newCenterY - currentWhiteboard.size.height / 2 - SPACING
        })
      }
      // 底边相邻
      if (
        Math.abs(
          newCenterY +
            currentWhiteboard.size.height / 2 +
            SPACING -
            (otherWhiteboard.position.y - otherWhiteboard.size.height / 2)
        ) < snapThreshold
      ) {
        newCenterY =
          otherWhiteboard.position.y -
          otherWhiteboard.size.height / 2 -
          SPACING -
          currentWhiteboard.size.height / 2
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newCenterY + currentWhiteboard.size.height / 2 + SPACING
        })
      }
    }
  })

  updateWhiteboardPosition(id, newCenterX, newCenterY)
}

// stopDraggingThumbnail 函数
const stopDraggingThumbnail = async () => {
  if (draggingThumbnail.value) {
    const whiteboard = whiteboards.value.find((wb) => wb.id === draggingThumbnail.value?.id)
    if (whiteboard) {
      await whiteboardStore.updateWhiteboardPosition(
        whiteboard.id,
        whiteboard.position.x,
        whiteboard.position.y
      )
    }
  }
  draggingThumbnail.value = null
  alignmentGuides.value = []
  document.removeEventListener('mousemove', onDragThumbnail)
  document.removeEventListener('mouseup', stopDraggingThumbnail)
}

// 更新白板位置
const updateWhiteboardPosition = (id: string, centerX: number, centerY: number) => {
  const index = whiteboards.value.findIndex((wb) => wb.id === id)
  if (index !== -1) {
    whiteboards.value[index] = {
      ...whiteboards.value[index],
      position: { x: centerX, y: centerY }
    }
  }
}

onMounted(async () => {
  await fetchWhiteboards()
  await loadViewState()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragThumbnail)
  document.removeEventListener('mouseup', stopDraggingThumbnail)
})

const fetchWhiteboards = async () => {
  whiteboards.value = await whiteboardStore.getTopLevelWhiteboards()
}

watch([scale, translateX, translateY], () => {
  saveViewState()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragThumbnail)
  document.removeEventListener('mouseup', stopDraggingThumbnail)
})

// 组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped lang="scss">
.whiteboard-view {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}

.fixed-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg-primary);
}

.whiteboard-canvas {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
}

.whiteboard-transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transition: transform 0.05s linear;
}

.fit-view-button {
  position: absolute;
  bottom: 8px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--default-text-color);
      font-size: 13px;
      font-weight: 400;
      margin-left: 6px;
      white-space: nowrap;
      writing-mode: horizontal-tb;
    }
    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
    &.delete {
      color: #ff4d4f;
    }
  }
  &:hover {
    background-color: var(--color-hover-button);
  }
}
</style>
