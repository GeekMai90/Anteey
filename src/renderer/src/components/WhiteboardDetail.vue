<!-- WhiteboardDetail.vue -->
<template>
  <div class="whiteboard-detail">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <div
      ref="containerRef"
      class="whiteboard-container"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="whiteboard-detail-content" :style="contentStyle">
        <component
          :is="getItemComponent(item)"
          v-for="item in whiteboardItems"
          :key="item.id"
          :class="['whiteboard-item', item.type]"
          :style="getItemStyle(item)"
          :note="item.type === 'note' ? whiteboardStore.getReferenceNotes(item.noteId) : null"
          @mousedown.stop="startDraggingItem(item, $event)"
        />
      </div>
    </div>
    <!-- 新增：适应视图按钮 -->
    <div class="fit-view-button" @click="fitView">
      <div class="icon">
        <Aiming theme="outline" size="24" fill="#333" />
      </div>
    </div>
    <!-- 新增：缩放控制器 -->
    <WhiteboardZoomControl v-model:scale="scale" class="zoom-control-position" />
    <!-- 新增：创建白板笔记按钮 -->
    <div class="create-note-button" @click="createWhiteboardNote">
      <div class="icon">
        <Add theme="outline" size="24" fill="#333" />
      </div>
      <span>创建笔记</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppToolbar from '@renderer/components/AppToolbar.vue'
import { useWhiteboardStore } from '../stores/whiteboardStores'
import { CreateWhiteboardNoteInput, WhiteboardItem } from '@renderer/types/Note'
import WhiteboardNote from './WhiteboardNote.vue'
import WhiteboardSubboard from './WhiteboardSubboard.vue'
import WhiteboardGroup from './WhiteboardGroup.vue'
import WhiteboardConnection from './WhiteboardConnection.vue'
import { Add, Aiming } from '@icon-park/vue-next'
import WhiteboardZoomControl from './WhiteboardZoomControl.vue'

const containerRef = ref<HTMLElement | null>(null)
const route = useRoute()
const whiteboardId = ref<string | null>(null)
const whiteboardItems = ref<WhiteboardItem[]>([])

const whiteboardStore = useWhiteboardStore()

const draggingItem = ref<{ id: string; startX: number; startY: number } | null>(null)
const alignmentGuides = ref<{ direction: 'horizontal' | 'vertical'; position: number }[]>([])

const SNAP_THRESHOLD = 5
const scale = ref(1) // 添加缩放状态
const translateX = ref(0)
const translateY = ref(0)

const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

const startDraggingItem = (item: WhiteboardItem, event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  draggingItem.value = {
    id: item.id,
    startX: (event.clientX - rect.left - translateX.value) / scale.value - item.position.x,
    startY: (event.clientY - rect.top - translateY.value) / scale.value - item.position.y
  }

  document.addEventListener('mousemove', onDragItem)
  document.addEventListener('mouseup', stopDraggingItem)
}

const onDragItem = (event: MouseEvent) => {
  if (!draggingItem.value || !containerRef.value) return

  const { id, startX, startY } = draggingItem.value
  const rect = containerRef.value.getBoundingClientRect()

  let newX = (event.clientX - rect.left - translateX.value) / scale.value - startX
  let newY = (event.clientY - rect.top - translateY.value) / scale.value - startY

  alignmentGuides.value = []

  const currentItem = whiteboardItems.value.find((item) => item.id === id)
  if (!currentItem) return

  const snapThreshold = SNAP_THRESHOLD / scale.value

  const currentCenterX = newX + currentItem.size.width / 2
  const currentCenterY = newY + currentItem.size.height / 2
  const SPACING = 5 // 定义缩略图之间的间距
  whiteboardItems.value.forEach((otherItem) => {
    if (otherItem.id !== id) {
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
        Math.abs(newY + currentItem.size.height - (otherItem.position.y + otherItem.size.height)) <
        snapThreshold
      ) {
        newY = otherItem.position.y + otherItem.size.height - currentItem.size.height
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newY + currentItem.size.height
        })
      }

      // 中间对齐（水平和垂直）
      if (Math.abs(currentCenterX - otherCenterX) < snapThreshold) {
        newX = otherCenterX - currentItem.size.width / 2
        alignmentGuides.value.push({ direction: 'vertical', position: otherCenterX })
      }
      if (Math.abs(currentCenterY - otherCenterY) < snapThreshold) {
        newY = otherCenterY - currentItem.size.height / 2
        alignmentGuides.value.push({ direction: 'horizontal', position: otherCenterY })
      }
      // 左边相邻
      if (
        Math.abs(newX - (otherItem.position.x + otherItem.size.width + SPACING)) < snapThreshold
      ) {
        newX = otherItem.position.x + otherItem.size.width + SPACING
        alignmentGuides.value.push({ direction: 'vertical', position: newX - SPACING })
      }
      // 右边相邻
      if (Math.abs(newX + otherItem.size.width + SPACING - otherItem.position.x) < snapThreshold) {
        newX = otherItem.position.x - otherItem.size.width - SPACING
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newX + otherItem.size.width + SPACING
        })
      }
      // 顶边相邻
      if (
        Math.abs(newY - (otherItem.position.y + otherItem.size.height + SPACING)) < snapThreshold
      ) {
        newY = otherItem.position.y + otherItem.size.height + SPACING
        alignmentGuides.value.push({ direction: 'horizontal', position: newY - SPACING })
      }
      // 底边相邻（修正）
      if (Math.abs(newY + otherItem.size.height + SPACING - otherItem.position.y) < snapThreshold) {
        newY = otherItem.position.y - otherItem.size.height - SPACING
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newY + otherItem.size.height + SPACING
        })
      }
      // 顶边与左边中间对齐
      if (Math.abs(newY - otherCenterY) < snapThreshold) {
        newY = otherCenterY
        alignmentGuides.value.push({ direction: 'horizontal', position: newY })
      }
      // 底边与左边中间对齐
      if (Math.abs(newY + otherItem.size.height - otherCenterY) < snapThreshold) {
        newY = otherCenterY - otherItem.size.height
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: otherCenterY
        })
      }
      // 左边与顶边中间对齐
      if (Math.abs(newX - otherCenterX) < snapThreshold) {
        newX = otherCenterX
        alignmentGuides.value.push({ direction: 'vertical', position: newX })
      }
      // 右边与顶边中间对齐
      if (Math.abs(newX + otherItem.size.width - otherCenterX) < snapThreshold) {
        newX = otherCenterX - otherItem.size.width
        alignmentGuides.value.push({
          direction: 'vertical',
          position: otherCenterX
        })
      }
    }
  })

  updateItemPosition(id, newX, newY)
}

const stopDraggingItem = async () => {
  if (draggingItem.value) {
    const item = whiteboardItems.value.find((item) => item.id === draggingItem.value?.id)
    if (item && whiteboardId.value) {
      console.log('WhiteboardDetail 停止拖拽白板项', whiteboardId.value)
      await whiteboardStore.updateWhiteboardItemPosition(item.id, item.position.x, item.position.y)
    }
  }
  draggingItem.value = null
  alignmentGuides.value = []
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
}

const updateItemPosition = (id: string, x: number, y: number) => {
  const itemIndex = whiteboardItems.value.findIndex((item) => item.id === id)
  if (itemIndex !== -1) {
    const updatedItem = { ...whiteboardItems.value[itemIndex] }
    updatedItem.position = { x, y }
    whiteboardItems.value.splice(itemIndex, 1, updatedItem)
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
})

// 监听路由参数变化
watch(
  () => route.params.whiteboardId,
  (newId) => {
    console.log('WhiteboardDetail 监听路由参数变化', newId)
    if (newId && typeof newId === 'string') {
      whiteboardId.value = newId
      fetchWhiteboardItems()
    }
  },
  { immediate: true }
)

// 封装获取白板内容的函数
const fetchWhiteboardItems = async () => {
  if (whiteboardId.value) {
    console.log('WhiteboardDetail 开始获取组件项，whiteboardId：', whiteboardId.value)
    whiteboardItems.value = await whiteboardStore.getWhiteboardItems(whiteboardId.value)
    console.log('whiteboardItems', whiteboardItems.value)
  }
}

// 组件挂载时获取白板内容
onMounted(async () => {
  console.log('WhiteboardDetail 组件挂载时获取白板内容', whiteboardId.value)
  await fetchWhiteboardItems()
})

// 根据 item 中的 type 来匹配组件
const getItemComponent = (item: WhiteboardItem) => {
  switch (item.type) {
    case 'note':
      return WhiteboardNote
    case 'subboard':
      return WhiteboardSubboard
    case 'group':
      return WhiteboardGroup
    case 'connection':
      return WhiteboardConnection
    default:
      return null
  }
}

// 根据 item 中的属性获取组件的 style
const getItemStyle = (item: WhiteboardItem) => {
  return {
    left: `${item.position.x}px`,
    top: `${item.position.y}px`,
    width: `${item.size.width}px`,
    height: `${item.size.height}px`,
    zIndex: `${item.zIndex}`,
    transform: `rotate(${item.rotation || 0}deg)`
  }
}

// 新增：创建白板笔记的函数
const createWhiteboardNote = async () => {
  if (!whiteboardId.value) return

  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId.value,
    noteId: '',
    position: { x: 100, y: 100 }, // 默认位置，你可以根据需要调整
    size: { width: 200, height: 150 }, // 默认大小，你可以根据需要调整
    zIndex: 1,
    rotation: 0
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    whiteboardItems.value.push(newNote)
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
  }
}

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    // 左键
    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging) return
  const deltaX = event.clientX - lastX
  const deltaY = event.clientY - lastY
  translateX.value += deltaX
  translateY.value += deltaY
  lastX = event.clientX
  lastY = event.clientY
}

const handleMouseUp = () => {
  isDragging = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

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

    const contentX = (mouseX - translateX.value) / scale.value
    const contentY = (mouseY - translateY.value) / scale.value

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

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault()
  if (event.touches.length === 2) {
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    )

    if (!containerRef.value) return

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
  } else if (event.touches.length === 1 && isDragging) {
    const touch = event.touches[0]
    const deltaX = touch.clientX - lastX
    const deltaY = touch.clientY - lastY

    translateX.value += deltaX
    translateY.value += deltaY
    lastX = touch.clientX
    lastY = touch.clientY
  }
  saveViewState()
}

const handleTouchEnd = () => {
  isDragging = false
  lastPinchDistance = 0
}

const fitView = async () => {
  if (!containerRef.value || whiteboardItems.value.length === 0) return

  const containerRect = containerRef.value.getBoundingClientRect()

  const bounds = whiteboardItems.value.reduce(
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
  saveViewState()
}
// 保存视图状态
const saveViewState = async () => {
  await whiteboardStore.saveViewStateToWhiteboard(
    whiteboardId.value as string,
    scale.value,
    translateX.value,
    translateY.value
  )
}

// 加载视图状态
const loadViewState = async () => {
  const savedState = await whiteboardStore.getWhiteboardViewState(whiteboardId.value as string)
  console.log('savedState', savedState)
  if (savedState) {
    scale.value = savedState.scale
    translateX.value = savedState.translateX
    translateY.value = savedState.translateY
  }
}

onMounted(async () => {
  await loadViewState()
})

onUnmounted(async () => {
  await saveViewState()
})
</script>

<style lang="scss" scoped>
.whiteboard-detail {
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
  display: flex;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}

.whiteboard-detail-content {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

.whiteboard-item {
  position: absolute;
  transition: transform 0.1s ease-out;

  &:active {
    cursor: grabbing;
    opacity: 0.8;
  }
}
.create-note-button {
  position: absolute;
  bottom: 8px;
  left: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  padding: 4px 8px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);

  .icon {
    margin-right: 4px;
  }

  span {
    font-size: 14px;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
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
.zoom-control-position {
  position: absolute;
  bottom: 11px;
  right: 63px;
  z-index: 100;
}
</style>
