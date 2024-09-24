<!-- src/renderer/src/views/WhiteboardView.vue -->
<template>
  <div class="whiteboard-view">
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
        <!-- 白板缩略图 -->
        <WhiteboardThumbnail
          v-for="whiteboard in whiteboards"
          :key="whiteboard.id"
          :whiteboard="whiteboard"
          @click="openWhiteboard(whiteboard.id)"
          @update-position="updateWhiteboardPosition"
        />
      </div>
    </div>
    <!-- 适应视图按钮 -->

    <div class="fit-view-button" @click="fitView">
      <div class="icon">
        <Aiming theme="outline" size="24" fill="#333" />
      </div>
    </div>
    <ContextMenu />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, onUnmounted, computed } from 'vue'
import AppToolbar from '@renderer/components/AppToolbar.vue'
import { useRouter } from 'vue-router'
import WhiteboardThumbnail from '@renderer/components/WhiteboardThumbnail.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import type { CreateWhiteboardInput, Whiteboard } from '@renderer/types/Note'
import ContextMenu from '../components/ContexMenu.vue'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { Add, Aiming } from '@icon-park/vue-next'

const router = useRouter()
const whiteboardStore = useWhiteboardStore()
const contextMenuStore = useContextMenuStore()
const whiteboards = ref<Whiteboard[]>([])
const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

// 缩放和平移状态
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 计算内容样式
const contentStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px)`,
  transformOrigin: '0 0'
}))

// 拖动状态
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

// 组件挂载时获取顶层白板
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
  if (rootWhiteboard) {
    return
  }
  await whiteboardStore.createRootWhiteboard()
}

// 打开白板详情
const openWhiteboard = (id: string) => {
  router.push({ name: 'whiteboardDetail', params: { id } })
}

// 创建新白板
const createNewWhiteboard = async (x: number, y: number) => {
  const input: CreateWhiteboardInput = {
    name: '新白板',
    isRoot: true,
    position: { x, y }
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
  console.log('containerRef.value', containerRef.value)
  if (event.target === contentRef.value) {
    const rect = containerRef.value!.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale.value - translateX.value
    const y = (event.clientY - rect.top) / scale.value - translateY.value
    console.log('x', x)

    contextMenuStore.showMenu(event.clientX, event.clientY, [
      {
        label: '新建白板',
        icon: markRaw(Add),
        action: () => createNewWhiteboard(x, y)
      }
    ])
  }
}

// 更新白板位置
const updateWhiteboardPosition = (id: string, x: number, y: number) => {
  whiteboardStore.updateWhiteboardPosition(id, x, y)
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

// 处理滚轮事件
const handleWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    // 缩放
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(scale.value * delta, 5))

    const rect = containerRef.value!.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // 计算缩放前后的鼠标位置在内容坐标系中的位置
    const contentX = (mouseX - translateX.value * scale.value) / scale.value
    const contentY = (mouseY - translateY.value * scale.value) / scale.value

    // 调整平移量以保持鼠标位置不变
    translateX.value = mouseX / newScale - contentX
    translateY.value = mouseY / newScale - contentY

    scale.value = newScale
  } else {
    // 平移
    translateX.value -= event.deltaX / scale.value
    translateY.value -= event.deltaY / scale.value
  }
  saveViewState()
}

// 处理触摸开始事件
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 2) {
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    lastPinchDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
  } else if (event.touches.length === 1) {
    isDragging = true
    lastX = event.touches[0].clientX
    lastY = event.touches[0].clientY
  }
}

// 处理触摸移动事件
const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault() // 防止页面滚动
  if (event.touches.length === 2) {
    // 双指缩放
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    )

    const delta = currentDistance / lastPinchDistance
    const newScale = Math.max(0.1, Math.min(scale.value * delta, 5))

    const rect = containerRef.value!.getBoundingClientRect()
    const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
    const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top

    // 计算缩放前后的中心点在内容坐标系中的位置
    const contentX = (centerX - translateX.value * scale.value) / scale.value
    const contentY = (centerY - translateY.value * scale.value) / scale.value

    // 调整平移量以保持中心点不变
    translateX.value = centerX / newScale - contentX
    translateY.value = centerY / newScale - contentY

    scale.value = newScale
    lastPinchDistance = currentDistance
  } else if (event.touches.length === 1 && isDragging) {
    // 单指平移
    const touch = event.touches[0]
    const deltaX = touch.clientX - lastX
    const deltaY = touch.clientY - lastY
    translateX.value += deltaX / scale.value
    translateY.value += deltaY / scale.value
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

// 适应视图
const fitView = () => {
  if (!containerRef.value || !contentRef.value || whiteboards.value.length === 0) return

  const containerRect = containerRef.value.getBoundingClientRect()

  // 计算所有白板的边界
  const bounds = whiteboards.value.reduce(
    (acc, wb) => {
      if (wb.position) {
        acc.left = Math.min(acc.left, wb.position.x)
        acc.top = Math.min(acc.top, wb.position.y)
        acc.right = Math.max(acc.right, wb.position.x + (wb.size?.width || 200))
        acc.bottom = Math.max(acc.bottom, wb.position.y + (wb.size?.height || 150))
      }
      return acc
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
  )

  const contentWidth = bounds.right - bounds.left
  const contentHeight = bounds.bottom - bounds.top

  // 计算缩放比例
  const scaleX = containerRect.width / contentWidth
  const scaleY = containerRect.height / contentHeight
  scale.value = Math.min(scaleX, scaleY) * 0.9 // 留一些边距

  // 计算平移量，使内容居中
  translateX.value = (containerRect.width / scale.value - contentWidth) / 2 - bounds.left
  translateY.value = (containerRect.height / scale.value - contentHeight) / 2 - bounds.top

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
  // z-index: 1;
}

.whiteboard-content {
  position: absolute;
  width: 100%;
  height: 100%;
  // pointer-events: none; // 添加这行
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
