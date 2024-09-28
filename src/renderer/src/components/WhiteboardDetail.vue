<!-- WhiteboardDetail.vue -->
<template>
  <div class="whiteboard-detail">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <!-- 主容器 -->
    <div
      ref="containerRef"
      class="whiteboard-canvas"
      :class="{ connecting: isConnecting }"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 变换层 -->
      <div ref="transformLayerRef" class="whiteboard-transform-layer" :style="transformLayerStyle">
        <!-- 白板笔记 -->
        <WhiteboardNoteComponent
          v-for="item in whiteboardNotes"
          :key="item.id"
          :width="item.size.width"
          :height="item.size.height"
          :class="['whiteboard-item']"
          :style="getWhiteNoteStyle(item)"
          :item="item"
          :note="whiteboardStore.getReferenceNotes(item.noteId)"
          :is-hovered="isCreatingConnection && hoverNote?.id === item.id"
          @mousedown.stop="startDraggingItem(item, $event)"
          @resize-start="startResizingItem(item, $event)"
          @start-connection="startConnection"
        />
        <CardConnection
          v-for="connection in connections"
          :key="connection.id"
          :connection="connection"
          strokeColor="red"
          :strokeWidth="5"
          textColor="#333333"
        />
        <CardConnection
          v-if="isCreatingConnection"
          :connection="temporaryConnection"
          strokeColor="red"
          :strokeWidth="2"
          textColor="#333333"
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
    <WhiteboardZoomControl
      v-model:scale="scale"
      class="zoom-control-position"
      @reset-view="fitView"
    />
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
import {
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  WhiteboardGroup,
  Whiteboard,
  Connection
} from '@renderer/types/Note'
import WhiteboardNoteComponent from './WhiteboardNoteComponent.vue'
// import WhiteboardSubboard from './WhiteboardSubboard.vue'
// import WhiteboardGroupComponent from './WhiteboardGroupComponent.vue'
// import WhiteboardConnection from './WhiteboardConnection.vue'
import { Add, Aiming } from '@icon-park/vue-next'
import WhiteboardZoomControl from './WhiteboardZoomControl.vue'
import CardConnection from './CardConnection.vue'

const containerRef = ref<HTMLElement | null>(null)
const route = useRoute()
const whiteboardId = ref<string | null>(null)
const whiteboardStore = useWhiteboardStore()
const whiteboardNotes = ref<WhiteboardNote[]>([])
const whiteboardGroups = ref<WhiteboardGroup[]>([])
const whiteboardSubboards = ref<Whiteboard[]>([])
const connections = ref<Connection[]>([])

const draggingItem = ref<{ id: string; startX: number; startY: number } | null>(null)
const alignmentGuides = ref<{ direction: 'horizontal' | 'vertical'; position: number }[]>([])

const SNAP_THRESHOLD = 5
const scale = ref(1) // 添加缩放状态
const translateX = ref(0)
const translateY = ref(0)

// 连线相关状态
const isCreatingConnection = ref(false)
const connectionStart = ref({ x: 0, y: 0 })
const connectionEnd = ref({ x: 0, y: 0 })
const startNote = ref<WhiteboardNote | null>(null)
const isConnecting = ref(false)
const hoverNote = ref<WhiteboardNote | null>(null)

const temporaryConnection = computed(() => ({
  id: 'temp',
  whiteboardId: whiteboardId.value as string,
  startItemId: startNote.value?.id || '',
  endItemId: '',
  startPoint: connectionStart.value,
  endPoint: connectionEnd.value,
  description: ''
}))

// 计算连线两端的点
const calculateConnectionPoints = (startNote: WhiteboardNote, endNote: WhiteboardNote) => {
  const getEdgeCenterPoint = (note: WhiteboardNote, angle: number) => {
    const center = {
      x: note.position.x + note.size.width / 2,
      y: note.position.y + note.size.height / 2
    }
    const w = note.size.width / 2
    const h = note.size.height / 2

    // 确定连接边并返回其中心点
    if (Math.abs(Math.tan(angle)) < h / w) {
      // 连接到左边或右边
      return {
        x: center.x + w * Math.sign(Math.cos(angle)),
        y: center.y
      }
    } else {
      // 连接到上边或下边
      return {
        x: center.x,
        y: center.y + h * Math.sign(Math.sin(angle))
      }
    }
  }

  const dx = endNote.position.x - startNote.position.x
  const dy = endNote.position.y - startNote.position.y
  const angle = Math.atan2(dy, dx)

  const startPoint = getEdgeCenterPoint(startNote, angle)
  const endPoint = getEdgeCenterPoint(endNote, angle + Math.PI)

  return { startPoint, endPoint }
}

// 更新连线位置
const updateConnectionPositions = (movedNoteId: string, newPosition: { x: number; y: number }) => {
  // 首先更新移动的笔记的位置
  const movedNoteIndex = whiteboardNotes.value.findIndex((note) => note.id === movedNoteId)
  if (movedNoteIndex !== -1) {
    whiteboardNotes.value[movedNoteIndex] = {
      ...whiteboardNotes.value[movedNoteIndex],
      position: newPosition
    }
  }

  // 然后更新受影响的连接
  connections.value = connections.value.map((connection) => {
    if (connection.startItemId === movedNoteId || connection.endItemId === movedNoteId) {
      const startNote = whiteboardNotes.value.find((note) => note.id === connection.startItemId)
      const endNote = whiteboardNotes.value.find((note) => note.id === connection.endItemId)

      if (startNote && endNote) {
        const { startPoint, endPoint } = calculateConnectionPoints(startNote, endNote)
        return { ...connection, startPoint, endPoint }
      }
    }
    return connection
  })
}

// 开始连线
const startConnection = (note: WhiteboardNote) => {
  console.log('Start connection in WhiteboardDetail', note)
  isCreatingConnection.value = true
  isConnecting.value = true // 添加这行
  hoverNote.value = null
  console.log('isCreatingConnection', isCreatingConnection.value)
  startNote.value = note
  connectionStart.value = {
    x: note.position.x + note.size.width,
    y: note.position.y + note.size.height / 2
  }
  connectionEnd.value = { ...connectionStart.value }

  // 添加这些行来绑定鼠标移动和鼠标抬起事件
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
// 更新所有连线的位置
const updateAllConnectionPositions = () => {
  connections.value = connections.value.map((connection) => {
    const startNote = whiteboardNotes.value.find((note) => note.id === connection.startItemId)
    const endNote = whiteboardNotes.value.find((note) => note.id === connection.endItemId)
    if (startNote && endNote) {
      const { startPoint, endPoint } = calculateConnectionPoints(startNote, endNote)
      return { ...connection, startPoint, endPoint }
    }
    return connection
  })
}
// 监听白板笔记的变化来更新所有连线的位置
watch(
  () => whiteboardNotes.value,
  () => {
    updateAllConnectionPositions()
  },
  { deep: true }
)

// 关于获取白板内容的功能
// 封装获取白板内容的函数
const fetchWhiteboardItems = async () => {
  if (whiteboardId.value) {
    console.log('WhiteboardDetail 开始获取组件项，whiteboardId：')
    whiteboardNotes.value = await whiteboardStore.getWhiteboardNotes(whiteboardId.value)
    whiteboardGroups.value = await whiteboardStore.getWhiteboardGroups(whiteboardId.value)
    whiteboardSubboards.value = await whiteboardStore.getWhiteboardSubboards(whiteboardId.value)
    connections.value = await whiteboardStore.getConnections(whiteboardId.value)
    console.log('connections', connections.value)
  }
}

// 组件挂载时获取白板内容
onMounted(async () => {
  console.log('WhiteboardDetail 组件挂载时获取白板内容', whiteboardId.value)
  await fetchWhiteboardItems()
  updateAllConnectionPositions()
})

// 监听路由参数变化来获取白板内容
watch(
  () => route.params.whiteboardId,
  (newId) => {
    console.log('WhiteboardDetail 监听路由参数变化', newId)
    if (newId && typeof newId === 'string') {
      whiteboardId.value = newId
      fetchWhiteboardItems()
      updateAllConnectionPositions()
    }
  },
  { immediate: true }
)

// 获取 item 的 style
const getWhiteNoteStyle = (item: WhiteboardNote) => {
  return {
    // 当拖拽改变大小的时候，item 的 position 会加上 visualAdjustment 的值
    left: `${item.position.x + (resizingItem.value?.id === item.id ? visualAdjustment.value.x : 0)}px`, // 适配拖拽改变大小
    top: `${item.position.y + (resizingItem.value?.id === item.id ? visualAdjustment.value.y : 0)}px`, // 适配拖拽改变大小
    width: `${item.size.width}px`,
    height: `${item.size.height}px`,
    zIndex: `${item.zIndex}`,
    transform: `rotate(${item.rotation || 0}deg)`
  }
}

//开始实现拖拽改变大小的能
// 需要在模板中将 width 和 height 绑定到 item 的 size 上
// resizingItem ref 来存储拖拽改变大小的信息
const resizingItem = ref<{
  id: string
  direction: string
  startX: number
  startY: number
  startWidth: number
  startHeight: number
} | null>(null)

// visualAdjustment ref 来存储视觉调整
const visualAdjustment = ref({ x: 0, y: 0 })

// 开始拖拽改变大小
const startResizingItem = (
  item: WhiteboardNote,
  { direction, event }: { direction: string; event: MouseEvent }
) => {
  event.preventDefault()
  event.stopPropagation()
  if (!containerRef.value) return
  // 存储开始拖拽之前的 item 信息
  resizingItem.value = {
    id: item.id,
    direction,
    startX: event.clientX,
    startY: event.clientY,
    startWidth: item.size.width,
    startHeight: item.size.height
  }
  // 监听鼠标移动和抬起事件
  document.addEventListener('mousemove', onResizeItem)
  document.addEventListener('mouseup', stopResizingItem)
}

// 计算拖拽改变大小的位置和大小
const onResizeItem = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!resizingItem.value || !containerRef.value) return

  // 获取拖拽改变大小的信息
  const { id, direction, startX, startY, startWidth, startHeight } = resizingItem.value
  // 计算拖拽改变大小的位置和大小
  const dx = (event.clientX - startX) / scale.value
  const dy = (event.clientY - startY) / scale.value

  // 获取拖拽改变大小的 item
  const item = whiteboardNotes.value.find((item) => item.id === id)
  if (!item) return

  // 初始化新的宽度和高度
  let newWidth = startWidth
  let newHeight = startHeight

  // 根据拖拽改变大小的方向来计算新的宽度和高度
  switch (direction) {
    case 'right':
      newWidth = Math.max(startWidth + dx, 100)
      break
    case 'bottom':
      newHeight = Math.max(startHeight + dy, 100)
      break
    case 'left':
      newWidth = Math.max(startWidth - dx, 100)
      // 当拖拽改变大小的方向为左边时，因为会导致 item 的 position 发生变化，所以将需要调整的视觉偏移量存储到 visualAdjustment 中
      visualAdjustment.value.x = startWidth - newWidth
      break
    case 'top':
      newHeight = Math.max(startHeight - dy, 100)
      // 当拖拽改变大小的方向为顶边时，因为会导致 item 的 position 发生变化，所以将需要调整的视觉偏移量存储到 visualAdjustment 中
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'top-left':
      newWidth = Math.max(startWidth - dx, 100)
      newHeight = Math.max(startHeight - dy, 100)
      // 当拖拽改变大小的方向为顶边和左边时，因为会导致 item 的 position 发生变化，所以将需要调整的视觉偏移量存储到 visualAdjustment 中
      visualAdjustment.value.x = startWidth - newWidth
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'top-right':
      newWidth = Math.max(startWidth + dx, 100)
      newHeight = Math.max(startHeight - dy, 100)
      // 当拖拽改变大小的方向为顶边和右边时，因为会导致 item 的 position 发生变化，所以将需要调整的视觉偏移量存储到 visualAdjustment 中
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'bottom-right':
      newWidth = Math.max(startWidth + dx, 100)
      newHeight = Math.max(startHeight + dy, 100)
      break
    case 'bottom-left':
      newWidth = Math.max(startWidth - dx, 100)
      newHeight = Math.max(startHeight + dy, 100)
      // 当拖拽改变大小的方向为底边和左边时，因为会导致 item 的 position 发生变化，所以将需要调整的视觉偏移量存储到 visualAdjustment 中
      visualAdjustment.value.x = startWidth - newWidth
      break
  }

  // 更新 item 的 size，注意，这里不改变 item 的 position
  item.size.width = newWidth
  item.size.height = newHeight
}

// 停止拖拽改变大小
const stopResizingItem = async (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (resizingItem.value) {
    // 获取拖拽改变大小后的 item
    const item = whiteboardNotes.value.find((item) => item.id === resizingItem.value?.id)
    if (item && whiteboardId.value) {
      // 更新白板项的大小和位置
      await whiteboardStore.updateWhiteboardNoteSize(item.id, item.size.width, item.size.height)
      await whiteboardStore.updateWhiteboardNotePosition(item.id, item.position.x, item.position.y)
      // 应用视觉调整到实际位置
      item.position.x += visualAdjustment.value.x
      item.position.y += visualAdjustment.value.y
    }
  }
  // 重置视觉调整
  resizingItem.value = null
  visualAdjustment.value = { x: 0, y: 0 }
  // 移除事件监听器
  document.removeEventListener('mousemove', onResizeItem)
  document.removeEventListener('mouseup', stopResizingItem)
}

// 拖拽改变大小的功能结束

const transformLayerStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

const startDraggingItem = (item: WhiteboardNote, event: MouseEvent) => {
  // 检查事件目标是否为连接按钮
  if ((event.target as HTMLElement).closest('.connection-button')) {
    return // 如果是连接按钮，不启动拖拽
  }
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

  const currentItem = whiteboardNotes.value.find((item) => item.id === id)
  if (!currentItem) return

  const snapThreshold = SNAP_THRESHOLD / scale.value

  const currentCenterX = newX + currentItem.size.width / 2
  const currentCenterY = newY + currentItem.size.height / 2
  const SPACING = 5 // 定义缩略图之间的间距
  whiteboardNotes.value.forEach((otherItem) => {
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
  // 更新连线位置
  updateConnectionPositions(id, { x: newX, y: newY })
  updateItemPosition(id, newX, newY)
}

const stopDraggingItem = async () => {
  if (draggingItem.value) {
    const item = whiteboardNotes.value.find((item) => item.id === draggingItem.value?.id)
    if (item && whiteboardId.value) {
      console.log('WhiteboardDetail 停止拖拽白板项', whiteboardId.value)
      await whiteboardStore.updateWhiteboardNotePosition(item.id, item.position.x, item.position.y)
    }
  }
  draggingItem.value = null
  alignmentGuides.value = []
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
}

const updateItemPosition = (id: string, x: number, y: number) => {
  const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === id)
  if (itemIndex !== -1) {
    const updatedItem = { ...whiteboardNotes.value[itemIndex] }
    updatedItem.position = { x, y }
    whiteboardNotes.value.splice(itemIndex, 1, updatedItem)
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
})

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
    whiteboardNotes.value.push(newNote)
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
  console.log('Mouse moving', isCreatingConnection.value)
  if (isCreatingConnection.value) {
    // console.log('Creating connection')
    // const rect = containerRef.value?.getBoundingClientRect()
    // if (rect) {
    //   connectionEnd.value = {
    //     x: (event.clientX - rect.left - translateX.value) / scale.value,
    //     y: (event.clientY - rect.top - translateY.value) / scale.value
    //   }
    // }
    const rect = containerRef.value?.getBoundingClientRect()
    if (rect) {
      const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
      const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

      hoverNote.value = findNoteUnderMouse(event)

      if (hoverNote.value && hoverNote.value.id !== startNote.value?.id) {
        // 如果鼠标悬停在一个卡片上（不是起始卡片），将线吸附到卡片边缘
        const { endPoint } = calculateConnectionPoints(startNote.value!, hoverNote.value)
        connectionEnd.value = endPoint
      } else {
        // 否则，线跟随鼠标移动
        connectionEnd.value = { x: mouseX, y: mouseY }
      }
    }
  } else if (isDragging) {
    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY
    translateX.value += deltaX
    translateY.value += deltaY
    lastX = event.clientX
    lastY = event.clientY
  }
}

const findNoteUnderMouse = (event: MouseEvent): WhiteboardNote | null => {
  if (!containerRef.value) return null

  const rect = containerRef.value.getBoundingClientRect()
  const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
  const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

  return (
    whiteboardNotes.value.find((note) => {
      return (
        mouseX >= note.position.x &&
        mouseX <= note.position.x + note.size.width &&
        mouseY >= note.position.y &&
        mouseY <= note.position.y + note.size.height
      )
    }) || null
  )
}
const handleMouseUp = (event: MouseEvent) => {
  if (isCreatingConnection.value && startNote.value) {
    const endNote = findNoteUnderMouse(event)
    if (endNote && endNote.id !== startNote.value.id) {
      const { startPoint, endPoint } = calculateConnectionPoints(startNote.value, endNote)
      const newConnection: Connection = {
        id: `connection-${Date.now()}`,
        whiteboardId: whiteboardId.value as string,
        startItemId: startNote.value.id,
        endItemId: endNote.id,
        startPoint,
        endPoint,
        description: ''
      }
      connections.value.push(newConnection)
      whiteboardStore.createConnection(newConnection)
    }
    isCreatingConnection.value = false
    isConnecting.value = false // 添加这行
    startNote.value = null
    hoverNote.value = null
  }

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
  if (!containerRef.value || whiteboardNotes.value.length === 0) return

  const containerRect = containerRef.value.getBoundingClientRect()

  const bounds = whiteboardNotes.value.reduce(
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

// 组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
  document.removeEventListener('mousemove', onResizeItem)
  document.removeEventListener('mouseup', stopResizingItem)
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

.whiteboard-canvas {
  flex: 1;
  position: relative;
  width: 100%;
  // height: 100%;
  height: 100vh; /* 或者设置一个固定的高度 */
  background-color: var(--color-bg-primary);
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
  &.connecting {
    cursor: crosshair;
  }
}

.whiteboard-transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  // width: 100%;
  // height: 100%;
  will-change: transform;
  transition: transform 0.05s linear;
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
// .connections-container {
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 1000px;
//   height: 1000px;
//   pointer-events: none;
// }
// .connection-line {
//   position: absolute;
//   overflow: visible;
// }

// .connection-line {
//   position: absolute;
//   top: 0;
//   left: 0;
//   width: 1000px;
//   height: 1000px;
//   pointer-events: none;
// }
.connection-line {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
</style>
