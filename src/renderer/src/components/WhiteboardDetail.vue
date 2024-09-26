<!-- WhiteboardDetail.vue -->
<template>
  <div class="whiteboard-detail">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <div ref="containerRef" class="whiteboard-container">
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
import { Add } from '@icon-park/vue-next'

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
</style>
