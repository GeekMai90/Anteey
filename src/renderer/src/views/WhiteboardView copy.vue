<!-- src/renderer/src/views/WhiteboardView.vue -->
<template>
  <div class="whiteboard-view">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <!-- 白板容器 -->
    <div
      ref="containerRef"
      class="whiteboard-container"
      @dblclick="handleContainerDoubleClick"
      @contextmenu.prevent
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 白板内容 -->
      <div ref="contentRef" class="whiteboard-content" :style="contentStyle">
        <!-- 遍历渲染白板缩略图 -->
        <WhiteboardThumbnail
          v-for="whiteboard in whiteboards"
          :key="whiteboard.id"
          :whiteboard="whiteboard"
          :scale="scale"
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
import AppToolbar from '@renderer/components/AppToolbar.vue'
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
const contentRef = ref<HTMLElement | null>(null)

// 缩放和平移状态
const scale = ref<number>(1)
const translateX = ref(0)
const translateY = ref(0)

// 计算内容样式
const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

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
    isRoot: true,
    position: { x, y },
    size: { width: 300, height: 150 },
    zoomLevel: 1,
    scrollPosition: { x, y },
    scale: 1,
    translateX: 0,
    translateY: 0
  }
  try {
    await whiteboardStore.createWhiteboard(input)
    whiteboards.value = whiteboardStore.whiteboards
    contextMenuStore.closeMenu()
  } catch (error) {
    console.error('Failed to create whiteboard:', error)
  }
}

// 处理容器双击事件
const handleContainerDoubleClick = (event: MouseEvent) => {
  console.log('handleContainerDoubleClick', event)
  event.preventDefault()
  event.stopPropagation()

  if (!containerRef.value) {
    console.error('containerRef is null')
    return
  }
  // 检查事件目标是否是 contentRef 或其子元素
  if (event.target === contentRef.value || event.target === containerRef.value) {
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
  event.preventDefault()
  if (event.button === 2) {
    // 右键
    event.preventDefault()
    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
  }
}

// 处理鼠标移动事件
const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging) return
  event.preventDefault()
  const deltaX = event.clientX - lastX
  const deltaY = event.clientY - lastY
  translateX.value += deltaX / scale.value
  translateY.value += deltaY / scale.value
  lastX = event.clientX
  lastY = event.clientY
  saveViewState()
}

// 处理鼠标松开事件
const handleMouseUp = () => {
  isDragging = false
}

// 处理滚轮事件（用于缩放和平移）
const handleWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    // 缩放
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(scale.value * delta, 5))

    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // 计算鼠标位置在缩放前内容坐标系中的位置
    const contentX = (mouseX - translateX.value) / scale.value
    const contentY = (mouseY - translateY.value) / scale.value

    // 调整平移量以保持鼠标位置不变
    translateX.value = mouseX - contentX * newScale
    translateY.value = mouseY - contentY * newScale

    scale.value = newScale
  } else {
    // 平移
    translateX.value -= event.deltaX
    translateY.value -= event.deltaY
  }
  saveViewState()
}

// 处理触摸开始事件
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    // 双指触摸，准备缩放
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    lastPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
  } else if (event.touches.length === 1) {
    // 单指触摸，准备拖动
    isDragging = true
    lastX = event.touches[0].clientX
    lastY = event.touches[0].clientY
  }
}

// 处理触摸移动事件
const handleTouchMove = (event: TouchEvent) => {
  console.log('触摸移动，对象是：', event)
  event.preventDefault() // 阻止默认的触摸行为，如页面滚动
  if (event.touches.length === 2) {
    // 处理双指触摸移动（用于缩放和平移）
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    // 计算两个触摸点之间的当前距离
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    )

    if (!containerRef.value) return

    const rect = containerRef.value.getBoundingClientRect()
    // 计算两个触摸点的中心位置
    const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
    const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top

    // 计算缩放比例
    const delta = currentDistance / lastPinchDistance
    // 限制缩放范围在 0.1 到 5 之间
    const newScale = Math.max(0.1, Math.min(scale.value * delta, 5))

    // 计算缩放中心在内容坐标系中的位置
    const contentX = (centerX - translateX.value) / scale.value
    const contentY = (centerY - translateY.value) / scale.value

    // 调整平移量以保持缩放中心不变
    translateX.value = centerX - contentX * newScale
    translateY.value = centerY - contentY * newScale

    // 更新缩放值
    scale.value = newScale
    // 更新上次的触摸距离，用于下次计算缩放比例
    lastPinchDistance = currentDistance

    // 添加平移逻辑
    // 计算两个触摸点的平均移动距离
    const avgDeltaX = ((touch1.clientX + touch2.clientX) / 2 - (lastX + lastX) / 2) / scale.value
    const avgDeltaY = ((touch1.clientY + touch2.clientY) / 2 - (lastY + lastY) / 2) / scale.value

    // 更新平移量
    translateX.value += avgDeltaX
    translateY.value += avgDeltaY

    // 更新上次触摸点的位置
    lastX = (touch1.clientX + touch2.clientX) / 2
    lastY = (touch1.clientY + touch2.clientY) / 2
  } else if (event.touches.length === 1 && isDragging) {
    // 处理单指平移
    const touch = event.touches[0]
    // 计算触摸点移动的距离
    const deltaX = touch.clientX - lastX
    const deltaY = touch.clientY - lastY

    // 更新平移量，注意这里使用加法使移动方向与手指一致
    translateX.value += deltaX / scale.value
    translateY.value += deltaY / scale.value
    // 更新上次触摸点的位置
    lastX = touch.clientX
    lastY = touch.clientY
  }
  saveViewState()
}

// 处理触摸结束事件
const handleTouchEnd = () => {
  isDragging = false
  lastPinchDistance = 0
}

// 适应视图（使所有白板缩略图适应当前视图）
const fitView = async () => {
  // 确保白板数据是最新的
  await whiteboardStore.getTopLevelWhiteboards()
  whiteboards.value = whiteboardStore.whiteboards
  if (!containerRef.value || !contentRef.value || whiteboards.value.length === 0) return

  const containerRect = containerRef.value.getBoundingClientRect()

  // 计算所有白板的边界
  const bounds = whiteboards.value.reduce(
    (acc, wb) => {
      if (wb.position) {
        const left = wb.position.x - wb.size.width / 2
        const top = wb.position.y - wb.size.height / 2
        const right = wb.position.x + wb.size.width / 2
        const bottom = wb.position.y + wb.size.height / 2
        acc.left = Math.min(acc.left, left)
        acc.top = Math.min(acc.top, top)
        acc.right = Math.max(acc.right, right)
        acc.bottom = Math.max(acc.bottom, bottom)
      }
      return acc
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  )

  const contentWidth = bounds.right - bounds.left
  const contentHeight = bounds.bottom - bounds.top

  // 计算缩放比例
  const padding = 50
  const scaleX = (containerRect.width - padding * 2) / contentWidth
  const scaleY = (containerRect.height - padding * 2) / contentHeight
  scale.value = Math.min(scaleX, scaleY, 1) // 限制最大缩放为 1

  // 如果内容太大，自动缩小白板
  if (scale.value < 1) {
    scale.value = Math.min(scaleX, scaleY)
  }

  // 计算平移量，使内容居中
  translateX.value =
    (containerRect.width - contentWidth * scale.value) / 2 - bounds.left * scale.value
  translateY.value =
    (containerRect.height - contentHeight * scale.value) / 2 - bounds.top * scale.value

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
  if (!contentRef.value) return
  const rect = contentRef.value.getBoundingClientRect()
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
  if (!draggingThumbnail.value || !contentRef.value) return

  const { id, startX, startY } = draggingThumbnail.value
  const rect = contentRef.value.getBoundingClientRect()

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

.whiteboard-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  overflow: hidden;
  cursor: default;
}

.whiteboard-content {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

.whiteboard-container:active {
  cursor: grabbing;
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
