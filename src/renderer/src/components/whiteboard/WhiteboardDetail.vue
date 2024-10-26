<!-- WhiteboardDetail.vue -->
<template>
  <div ref="whiteboardRef" class="whiteboard-detail">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar
        backgroundColor="var(--color-bg-whiteboard)"
        :whiteboardName="whiteboardName"
        @update:whiteboardName="updateWhiteboardName"
      />
    </div>
    <!-- 主容器 -->
    <div
      ref="containerRef"
      class="whiteboard-canvas"
      :class="{
        connecting: isConnecting,
        'mode-drag': currentMode === 'drag',
        'mode-select': currentMode === 'select'
      }"
      @v-click-outside="handleContainerClickOutside"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
      @dblclick="handleContainerDoubleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <!-- 变换层 -->
      <div ref="transformLayerRef" class="whiteboard-transform-layer" :style="transformLayerStyle">
        <template v-if="dataLoaded">
          <!-- 白板笔记 -->
          <WhiteboardNoteComponent
            v-for="item in whiteboardNotes"
            :key="item.id"
            :width="item.size.width"
            :height="item.size.height"
            :class="['whiteboard-item']"
            :style="getWhiteNoteStyle(item)"
            :item="item"
            :note-id="item.noteId"
            :is-hovered="isCreatingConnection && hoverNote?.id === item.id"
            :is-selected="selectedNotes.includes(item.id)"
            @drag-start="startDraggingItem(item, $event)"
            @resize-start="startResizingItem(item, $event)"
            @start-connection="startConnection"
            @note-interaction="handleNoteInteraction"
            @hover="handleNoteHover"
          />
          <CardConnection
            v-for="connection in connections"
            :key="connection.id"
            v-click-outside="deselectConnection"
            :connection="connection"
            strokeColor="var(--color-text-secondary)"
            :isSelected="selectedConnectionId === connection.id"
            @click="(event) => selectConnection(connection.id, event)"
            @contextmenu="showConnectionContextMenu"
            @update:description="updateConnectionDescription"
          />

          <CardConnection
            v-if="isCreatingConnection"
            :connection="temporaryConnection"
            strokeColor="var(--color-text-secondary)"
          />
        </template>
        <!-- 选择框 -->
        <div v-if="isSelecting" class="selection-box" :style="selectionBoxStyle"></div>
      </div>
    </div>
    <!-- 新增：适应视图按钮 -->
    <div
      v-tooltip.top="{ content: '适应视图', delay: { show: 1000 }, html: true }"
      class="fit-view-button"
      @click="fitView"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <div class="icon">
        <Aiming
          theme="outline"
          size="24"
          :fill="isHovered ? 'var(--color-text-primary)' : 'var(--color-icon-secondary)'"
          :stroke-width="2"
        />
      </div>
    </div>
    <!-- 新增：缩放控制器 -->
    <WhiteboardZoomControl
      v-model:scale="scale"
      class="zoom-control-position"
      @reset-view="fitView"
    />

    <!-- 新增：顶端对齐按钮 -->
    <SelectionToolbar
      v-if="showSelectionToolbar"
      :selected-notes="selectedNotes"
      :whiteboard-notes="whiteboardNotes"
      @update:notes="updateNotes"
      @update-connections="updateAllConnectionPositions"
    />
    <WhiteboardToolbarLeft
      v-else
      v-model:mode="currentMode"
      @add-note="openSearchModal"
      @search="handleSearch"
    />
    <WhiteboardSearchModal
      ref="whiteboardSearchModalRef"
      :create-whiteboard-note="createWhiteboardNoteFromSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, markRaw, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import {
  CreateWhiteboardNoteInput,
  WhiteboardNote,
  // WhiteboardGroup,
  // Whiteboard,
  Connection,
  ConnectionCreateData
} from '@renderer/types/Note'
import WhiteboardNoteComponent from '@renderer/components/whiteboard/WhiteboardNoteComponent.vue'
import { Add, Aiming, Delete } from '@icon-park/vue-next'
import WhiteboardZoomControl from '@renderer/components/whiteboard/WhiteboardZoomControl.vue'
import CardConnection from './CardConnection.vue'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { debounce } from 'lodash-es'
import SelectionToolbar from '@renderer/components/whiteboard/SelectionToolbar.vue'
import WhiteboardToolbarLeft from '@renderer/components/whiteboard/WhiteboardToolbarLeft.vue'
import WhiteboardSearchModal from '@renderer/components/whiteboard/WhiteboardSearchModal.vue'

const containerRef = ref<HTMLElement | null>(null)
const route = useRoute()
const whiteboardId = ref<string | null>(null)
const whiteboardStore = useWhiteboardStore()
const whiteboardNotes = ref<WhiteboardNote[]>([])
const connections = ref<Connection[]>([])
const contextMenuStore = useContextMenuStore()
const whiteboardSearchModalRef = ref<InstanceType<typeof WhiteboardSearchModal> | null>(null)
const isHovered = ref(false)

const openSearchModal = () => {
  whiteboardSearchModalRef.value?.show()
}

const createWhiteboardNoteFromSearch = async (note: any) => {
  if (!containerRef.value || !whiteboardId.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const centerX = (rect.width / 2 - translateX.value) / scale.value
  const centerY = (rect.height / 2 - translateY.value) / scale.value

  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId.value,
    noteId: note.id,
    position: { x: centerX, y: centerY },
    size: { width: 350, height: 300 },
    zIndex: 1,
    rotation: 0,
    isAutoHeight: false,
    type: 'card'
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    if (newNote && newNote.id) {
      whiteboardNotes.value.push(newNote)
      await initializeData(whiteboardId.value)
    } else {
      console.error('Created note is invalid:', newNote)
    }
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
  }
}

// 拖拽项
const draggingItem = ref<{
  ids: string[]
  startPositions: { id: string; x: number; y: number }[]
} | null>(null)

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
const selectedConnectionId = ref<string | null>(null)

const descriptionInputRef = ref<HTMLInputElement | null>(null)
const measureSpan = ref<HTMLSpanElement | null>(null)

const isHoveringNote = ref(false)

const showSelectionToolbar = computed(() => {
  return selectedNotes.value.length > 1
})

const whiteboardName = ref('')

const updateWhiteboardName = async (newName: string) => {
  const id = route.params.whiteboardId
  if (typeof id === 'string') {
    await whiteboardStore.updateWhiteboardName(id, newName)
    whiteboardName.value = newName
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  const noteData = JSON.parse(event.dataTransfer!.getData('application/json'))

  if (!containerRef.value || !whiteboardId.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - translateX.value) / scale.value
  const y = (event.clientY - rect.top - translateY.value) / scale.value

  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId.value,
    noteId: noteData.id, // 直接使用拖拽笔记�� id
    position: { x, y },
    size: { width: 350, height: 300 },
    zIndex: 1,
    rotation: 0,
    isAutoHeight: false,
    type: 'card'
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    if (newNote && newNote.id) {
      whiteboardNotes.value.push(newNote)
      await initializeData(whiteboardId.value)
    } else {
      console.error('Created note is invalid:', newNote)
    }
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
  }
}

const handleSearch = () => {
  console.log('handleSearch')
}
// const openCardBox = async () => {
//   uiStore.toggleCardBox()
// }

// 批量选中功能
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })
const selectedNotes = ref<string[]>([])

const selectionBoxStyle = computed(() => {
  const left = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const top = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const width = Math.abs(selectionEnd.value.x - selectionStart.value.x)
  const height = Math.abs(selectionEnd.value.y - selectionStart.value.y)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

const transformLayerRef = ref<HTMLDivElement | null>(null)
const startSelection = (event: MouseEvent) => {
  if (event.button !== 0) return // 只响应左键
  isSelecting.value = true
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    // 修改这里的坐标计算
    const startX = (event.clientX - rect.left - translateX.value) / scale.value
    const startY = (event.clientY - rect.top - translateY.value) / scale.value
    selectionStart.value = { x: startX, y: startY }
    selectionEnd.value = { x: startX, y: startY }
    console.log('Start Selection:', {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX,
      startY,
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value
    })
  }
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', endSelection)
}

const endSelection = () => {
  isSelecting.value = false
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  updateSelectedNotes() // 确保在结束选择时更新选中的笔记
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', endSelection)
}

const updateSelectedNotes = () => {
  const selectionLeft = Math.min(selectionStart.value.x, selectionEnd.value.x)
  const selectionRight = Math.max(selectionStart.value.x, selectionEnd.value.x)
  const selectionTop = Math.min(selectionStart.value.y, selectionEnd.value.y)
  const selectionBottom = Math.max(selectionStart.value.y, selectionEnd.value.y)

  selectedNotes.value = whiteboardNotes.value
    .filter(
      (note) =>
        note.position.x < selectionRight &&
        note.position.x + note.size.width > selectionLeft &&
        note.position.y < selectionBottom &&
        note.position.y + note.size.height > selectionTop
    )
    .map((note) => note.id)
  console.log('Selected notes:', selectedNotes.value) // 添加这行来调试
}

const handleContainerClickOutside = (event: MouseEvent) => {
  if (event.target === containerRef.value) {
    selectedNotes.value = []
  }
}
const updateNotes = (updatedNotes: WhiteboardNote[]) => {
  whiteboardNotes.value = updatedNotes
  // 可能需要在这里添加保存到后端的逻辑
  updatedNotes.forEach((note) => {
    if (selectedNotes.value.includes(note.id)) {
      whiteboardStore.updateWhiteboardNotePosition(note.id, note.position.x, note.position.y)
    }
  })
}

// 数据是否加载完成
const dataLoaded = ref(false)

// 监听 whiteboardStore.whiteboardNotes 的变化，立刻更新视图
watch(
  () => whiteboardStore.whiteboardNotes,
  (newNotes) => {
    console.log('更新后的白板笔记:', newNotes)
    whiteboardNotes.value = newNotes
  },
  { deep: true }
)

const handleNoteHover = (hovering: boolean) => {
  isHoveringNote.value = hovering
}

const isNoteInteracting = ref(false)
console.log('isNoteInteracting', isNoteInteracting.value)
const handleNoteInteraction = (interacting: boolean) => {
  isNoteInteracting.value = interacting
}

const updateConnectionDescription = async (id: string, description: string) => {
  console.log('updateConnectionDescription', id, description)
  await whiteboardStore.updateConnectionDescription(id, description)
  const index = connections.value.findIndex((c) => c.id === id)
  if (index !== -1) {
    connections.value[index].description = description
  }
}

const adjustInputWidth = () => {
  if (measureSpan.value && descriptionInputRef.value) {
    const contentWidth = measureSpan.value.offsetWidth
    descriptionInputRef.value.style.width = `${Math.max(30, contentWidth + 10)}px`
  }
}
onMounted(() => {
  nextTick(() => {
    adjustInputWidth()
  })
})

const deselectConnection = () => {
  if (selectedConnectionId.value) {
    selectedConnectionId.value = null
  }
}

const selectConnection = (connectionId: string, event?: Event) => {
  if (event) {
    event.stopPropagation()
  }
  console.log('Connection selected:', connectionId)
  if (selectedConnectionId.value === connectionId) {
    selectedConnectionId.value = null
  } else {
    selectedConnectionId.value = connectionId
  }
}

// 显示连线上下文菜单
const showConnectionContextMenu = (event: MouseEvent, connection: Connection) => {
  selectedConnectionId.value = connection.id
  contextMenuStore.showMenu(event.clientX, event.clientY, [
    {
      label: '删除连线',
      icon: markRaw(Delete),
      action: () => deleteSelectedConnection(connection.id)
    }
    // 可以在这里添加更多的菜单项
  ])
}
// 删除连线
const deleteSelectedConnection = async (connectionId: string) => {
  try {
    await whiteboardStore.deleteConnection(connectionId)
    connections.value = connections.value.filter((c) => c.id !== connectionId)
    selectedConnectionId.value = null
    contextMenuStore.closeMenu()
  } catch (error) {
    console.error('Failed to delete connection:', error)
    // 这里可以添加错误处理，比如显示一个错误提示
  }
}

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

const initializeData = async (whiteboardId: string) => {
  try {
    await loadViewState()
    await whiteboardStore.initializeWhiteboardData(whiteboardId)
    whiteboardNotes.value = whiteboardStore.whiteboardNotes
    connections.value = whiteboardStore.connections
    whiteboardName.value =
      whiteboardStore.whiteboards.find((whiteboard) => whiteboard.id === whiteboardId)?.name ||
      '未命名白板'
    // await preloadNotes()
    updateAllConnectionPositions()
    dataLoaded.value = true
  } catch (error) {
    console.error('Failed to initialize data:', error)
  }
}

// 组件挂载时获取白板内容
onMounted(async () => {
  const id = route.params.whiteboardId
  console.log('WhiteboardDetail 组件挂载时获取白板内容', id)
  if (id && typeof id === 'string') {
    whiteboardId.value = id
    await initializeData(whiteboardId.value)
    // await preloadNotes()
  }
  updateAllConnectionPositions()
})

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
      // 更新白板笔记的自动高度
      console.log('更新白板笔记的自动高度', { id: item.id, isAutoHeight: false })
      await whiteboardStore.updateWhiteboardNoteAutoHeight(item.id, false)
      item.isAutoHeight = false
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

// 拖拽白板笔记的功能
const hasMoved = ref(false)

const startDraggingItem = (item: WhiteboardNote, event: MouseEvent) => {
  // 如果当前有白板项正在交互，则不启动拖拽
  if (isNoteInteracting.value) {
    event.preventDefault()
    return
  }
  // 检查事件目标是否为连接按钮
  if ((event.target as HTMLElement).closest('.connection-button')) {
    return // 如果是连接按钮，不启动拖拽
  }
  event.preventDefault() // 添加这行
  // 如果 containerRef 不存在，则不启动拖拽
  if (!containerRef.value) return

  // 获取 containerRef 的边界矩形
  const rect = containerRef.value.getBoundingClientRect()

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
  hasMoved.value = false // 初始化为未移动
  // 监听鼠标移动和抬起事件
  document.addEventListener('mousemove', onDragItem)
  document.addEventListener('mouseup', stopDraggingItem)
}

const onDragItem = (event: MouseEvent) => {
  // 如果 draggingItem 不存在，则不启动拖拽
  if (!draggingItem.value || !containerRef.value) return

  // 获取 containerRef 的边界矩形
  const rect = containerRef.value.getBoundingClientRect()
  const { ids, startPositions } = draggingItem.value

  // 遍历所有拖拽的项，更新它们的位置
  ids.forEach((id, index) => {
    const { x: startX, y: startY } = startPositions[index]
    let newX = (event.clientX - rect.left - translateX.value) / scale.value - startX
    let newY = (event.clientY - rect.top - translateY.value) / scale.value - startY
    const currentItem = whiteboardNotes.value.find((item) => item.id === id)
    if (!currentItem) return

    // 如果位置有变化，设置 hasMoved 为 true
    if (newX !== currentItem.position.x || newY !== currentItem.position.y) {
      hasMoved.value = true
    }

    // 计算对齐阈值
    const snapThreshold = SNAP_THRESHOLD / scale.value
    // 计算当前项的中心点
    const currentCenterX = newX + currentItem.size.width / 2
    const currentCenterY = newY + currentItem.size.height / 2
    // 定义缩略图之间的间距
    const SPACING = 5
    // 遍历所有项，检查是否与其他项对齐
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
        if (
          Math.abs(newX + otherItem.size.width + SPACING - otherItem.position.x) < snapThreshold
        ) {
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
        if (
          Math.abs(newY + otherItem.size.height + SPACING - otherItem.position.y) < snapThreshold
        ) {
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
  })
}

// 停止拖拽
const stopDraggingItem = async () => {
  if (draggingItem.value) {
    const { ids } = draggingItem.value
    const updatedItems: WhiteboardNote[] = []

    for (const id of ids) {
      const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === id)
      if (itemIndex !== -1 && whiteboardId.value) {
        const item = whiteboardNotes.value[itemIndex]

        // 更新本地状态
        const updatedItem = { ...item } as WhiteboardNote
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
      // 可以在这里添加错误处理，比如显示一个错误提示
    }
  }

  draggingItem.value = null
  hasMoved.value = false
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

// 双击空白处新增白板笔记
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

    // const x = (event.clientX - rect.left) / scale.value - translateX.value
    // const y = (event.clientY - rect.top) / scale.value - translateY.value
    const x = (event.clientX - rect.left - translateX.value) / scale.value
    const y = (event.clientY - rect.top - translateY.value) / scale.value

    contextMenuStore.showMenu(event.clientX, event.clientY, [
      {
        label: '新建笔记',
        icon: markRaw(Add),
        action: () => createWhiteboardNote(x, y)
      }
    ])
  } else {
    console.log('双击事件的目标不是 contentRef 或其子元素')
  }
}

// 创建白板笔记的函数
const createWhiteboardNote = async (x: number, y: number) => {
  if (!whiteboardId.value) return
  console.log('创建白板笔记', whiteboardId.value)
  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId.value,
    noteId: '',
    position: { x, y }, // 默认位置，你可以根据需要调整
    size: { width: 350, height: 300 }, // 默认大小，你可以根据需要调整
    zIndex: 1,
    rotation: 0,
    isAutoHeight: false,
    type: 'card'
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    console.log('创建白板笔记成功', newNote)
    // 确保 newNote 包含所有必要的属性
    if (newNote && newNote.id) {
      console.log('创建白板笔记成功, 添加到白板笔记列表中', newNote)
      // whiteboardNotes.value.push(newNote)
      whiteboardNotes.value = [...whiteboardNotes.value, newNote]
      console.log('创建白板笔记成功, 添加到白板笔记列表中, 重新获取白板项', whiteboardNotes.value)
      // await initializeData(whiteboardId.value)

      await nextTick()
      console.log('白板笔记列表更新后', whiteboardNotes.value)
      contextMenuStore.closeMenu()

      // 如果需要，可以在这里添加创建关联笔记的逻辑
      // 例如：await whiteboardStore.createReferenceNote(newNote.id)
    } else {
      console.error('Created note is invalid:', newNote)
    }
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
  }
}

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

let rafId: number | null = null

const currentMode = ref<'select' | 'drag'>('select')

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    // 左键
    if (currentMode.value === 'select') {
      startSelection(event)
    } else if (currentMode.value === 'drag') {
      isDragging = true
      lastX = event.clientX
      lastY = event.clientY
    }
  } else if (event.button === 2) {
    // 右键
    // 保持原有的右键拖动功能
    isDragging = true
    lastX = event.clientX
    lastY = event.clientY
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (isNoteInteracting.value) {
    event.preventDefault()
    return
  }
  console.log('Mouse moving', isCreatingConnection.value)
  if (currentMode.value === 'select' && isSelecting.value) {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    rafId = requestAnimationFrame(() => {
      const rect = containerRef.value?.getBoundingClientRect()
      if (rect) {
        // 修改这里的坐标计算
        const currentX = (event.clientX - rect.left - translateX.value) / scale.value
        const currentY = (event.clientY - rect.top - translateY.value) / scale.value
        console.log('Mouse move:', {
          clientX: event.clientX,
          clientY: event.clientY,
          currentX,
          currentY,
          scale: scale.value,
          translateX: translateX.value,
          translateY: translateY.value
        })
        selectionEnd.value = { x: currentX, y: currentY }
        updateSelectedNotes()
      }
    })
  } else if (isCreatingConnection.value) {
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
  } else if (currentMode.value === 'drag' && isDragging) {
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
const handleMouseUp = async (event: MouseEvent) => {
  if (isCreatingConnection.value && startNote.value) {
    const endNote = findNoteUnderMouse(event)
    if (endNote && endNote.id !== startNote.value.id) {
      const { startPoint, endPoint } = calculateConnectionPoints(startNote.value, endNote)
      const newConnection: ConnectionCreateData = {
        whiteboardId: whiteboardId.value as string,
        startItemId: startNote.value.id,
        endItemId: endNote.id,
        startPoint,
        endPoint,
        description: ''
      }
      const createdConnection = await whiteboardStore.createConnection(newConnection)
      connections.value.push(createdConnection)
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
  if (isNoteInteracting.value) {
    // 只有在进行缩放操作时才阻止默认行为
    if (event.ctrlKey) {
      event.preventDefault()
    }
    // 允许正常的滚动行为
    return
  }
  if (event.ctrlKey) {
    // 缩放
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(scale.value * delta, 2))

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
  debouncedSaveViewState()
}

const handleTouchStart = (event: TouchEvent) => {
  if (isNoteInteracting.value) {
    event.preventDefault()
    return
  }
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
  console.log('isNoteInteracting', isNoteInteracting.value)
  if (isNoteInteracting.value) {
    event.preventDefault()
    return
  }
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
  debouncedSaveViewState()
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
  debouncedSaveViewState()
}
// 保存视图状态
const debouncedSaveViewState = debounce(async () => {
  if (whiteboardId.value) {
    await whiteboardStore.saveViewStateToWhiteboard(
      whiteboardId.value,
      scale.value,
      translateX.value,
      translateY.value
    )
  }
}, 200) // 200ms 的延迟，可以根据需要调整

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
watch(
  () => whiteboardStore.connections,
  (newConnections) => {
    connections.value = newConnections
  },
  { deep: true }
)

// 组件卸载时移除事件监听器
onUnmounted(() => {
  debouncedSaveViewState.flush()

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
  background-color: var(--color-bg-whiteboard);
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
  background-color: var(--color-bg-whiteboard);
  overflow: hidden;
  touch-action: none;
  user-select: none;
  cursor: default;
  &:active {
    cursor: default;
  }
  &.connecting {
    cursor: crosshair;
  }
  &.mode-drag {
    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }
  &.mode-select {
    cursor: default;
  }
}

.whiteboard-transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transition: transform 0.05s linear;
}

.whiteboard-item {
  position: absolute;
  transition: transform 0.1s ease-out;
  cursor: grab;

  &:active {
    cursor: grabbing;
    // opacity: 0.8;
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
  bottom: 10px;
  right: 10px;
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
  bottom: 10px;
  right: 50px;
  z-index: 100;
}
.connection-line {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
.connection-description-input {
  position: absolute;
  z-index: 1000;
  display: inline-block; // 添加这行

  input {
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    min-width: 20px;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    color: var(--color-text-primary);
    outline: none;
    transition: width 0.2s ease;

    &:focus {
      border-color: var(--color-primary);
    }
  }
  .measure-span {
    visibility: hidden;
    position: absolute;
    white-space: pre;
    font-size: 12px;
    padding: 4px 8px;
  }
}

.selection-box {
  position: absolute;
  border: 1px solid var(--color-primary);
  background-color: rgba(0, 123, 255, 0.1);
  pointer-events: none;
  transition: all 0.05s linear; // 添加这行
}

.whiteboard-item.selected {
  outline: 2px solid var(--color-primary);
}

.align-top-button {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  padding: 8px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);

  .icon {
    margin-bottom: 4px;
  }

  span {
    font-size: 12px;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
}
</style>
