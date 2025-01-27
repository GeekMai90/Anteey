<!-- WhiteboardDetail.vue -->
<template>
  <div ref="whiteboardRef" class="whiteboard-detail">
    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar
        backgroundColor="var(--color-bg-whiteboard)"
        :whiteboardName="whiteboardName"
        :showBackButton="false"
        :showForwardButton="false"
        :showRefreshButton="false"
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
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
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
            :item="item"
            :scale="scale"
            :is-hovered="isHoveringNote && hoverNote?.id === item.id"
            :is-selected="selectedItems.includes(item.id)"
            @update:position="(x, y) => updateNotePosition(item.id, x, y)"
            @update:size="(width, height) => updateNoteSize(item.id, width, height)"
            @start-connection="handleStartConnection"
            @note-interaction="handleNoteInteraction"
            @hover="handleNoteHover"
            @stop-editing="handleStopEditing"
            @select="handleItemSelect"
            @start-drag="startDraggingItem"
            @focus="handleNoteFocus"
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
      @click="handleFitView"
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
      @reset-view="handleFitView"
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

    <!-- 添加底部创建菜单 -->
    <div class="create-menu">
      <div
        v-tooltip.top="{ content: '新建文字卡片', delay: { show: 1000 } }"
        class="create-button"
        @click="createTextNote"
      >
        <div class="icon">
          <FileText theme="outline" size="20" :stroke-width="3" />
        </div>
      </div>
      <div
        v-tooltip.top="{ content: '新建笔记卡片', delay: { show: 1000 } }"
        class="create-button"
        @click="openSearchModal"
      >
        <div class="icon">
          <Notes theme="outline" size="20" :stroke-width="3" />
        </div>
      </div>
      <div
        v-tooltip.top="{ content: '新建图片卡片', delay: { show: 1000 } }"
        class="create-button"
        @click="createImageNote"
      >
        <div class="icon">
          <PictureOne theme="outline" size="20" :stroke-width="3" />
        </div>
      </div>
    </div>
    <ImageUploadModal ref="imageUploadModalRef" @confirm="handleImageConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStore'
import { CreateWhiteboardNoteInput, WhiteboardNote, Connection, Whiteboard } from '@shared/types'
import WhiteboardNoteComponent from '@renderer/components/whiteboard/WhiteboardNoteComponent.vue'
import { Aiming, FileText, Notes, PictureOne } from '@icon-park/vue-next'
import WhiteboardZoomControl from '@renderer/components/whiteboard/WhiteboardZoomControl.vue'
import CardConnection from './CardConnection.vue'
import SelectionToolbar from '@renderer/components/whiteboard/SelectionToolbar.vue'
import WhiteboardToolbarLeft from '@renderer/components/whiteboard/WhiteboardToolbarLeft.vue'
import WhiteboardSearchModal from '@renderer/components/whiteboard/WhiteboardSearchModal.vue'
import { useConnection } from '@renderer/composables/whiteboard/useConnection'
import { useSelection } from '@renderer/composables/whiteboard/useSelection'
import { useWhiteboardViewState } from '@renderer/composables/whiteboard/useWhiteboardViewState'
import { message } from '@renderer/utils/message'
import ImageUploadModal from './ImageUploadModal.vue'
import type { AnchorPosition } from '@shared/types'

const containerRef = ref<HTMLElement | null>(null)
const route = useRoute()
const whiteboardId = ref<string | null>(null)
const whiteboardStore = useWhiteboardStore()
const whiteboardNotes = ref<WhiteboardNote[]>([])
const connections = ref<Connection[]>([])
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
  startPositions: {
    id: string
    x: number
    y: number
    mouseOffsetX: number // 添加鼠标相对元素的偏移量
    mouseOffsetY: number
  }[]
} | null>(null)

const isHoveringNote = ref(false)

const showSelectionToolbar = computed(() => {
  return selectedNotes.value.length > 1
})

const { scale, translateX, translateY, debouncedSaveViewState, loadViewState, fitView } =
  useWhiteboardViewState()

const whiteboardName = ref('')

// 使用 useConnection 组合式函数
const {
  isCreatingConnection,
  isConnecting,
  hoverNote,
  selectedConnectionId,
  temporaryConnection,
  startConnection,
  updateConnectionDescription,
  selectConnection,
  deselectConnection,
  handleConnectionMouseMove,
  showConnectionContextMenu,
  updateConnectionPositions,
  updateAllConnectionPositions,
  finishConnection
} = useConnection(
  whiteboardNotes,
  connections,
  whiteboardId,
  scale,
  translateX,
  translateY,
  containerRef
)

const {
  isSelecting,
  selectedNotes,
  selectionBoxStyle,
  startSelection,
  updateSelection,
  endSelection
} = useSelection(whiteboardNotes, scale, translateX, translateY, containerRef)

const updateWhiteboardName = async (newName: string) => {
  const id = route.params.whiteboardId
  if (typeof id === 'string') {
    await whiteboardStore.updateWhiteboardName(id, newName)
    whiteboardName.value = newName
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  if (!event.dataTransfer || !containerRef.value || !whiteboardId.value) return

  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'))
    if (!data.id) return

    // 计算放置位置（考虑缩放和平移）
    const rect = containerRef.value.getBoundingClientRect()
    const x = (event.clientX - rect.left - translateX.value) / scale.value
    const y = (event.clientY - rect.top - translateY.value) / scale.value

    // 创建白板笔记
    const input: CreateWhiteboardNoteInput = {
      whiteboardId: whiteboardId.value,
      noteId: data.id,
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
      message.error('创建失败')
    }
  } catch (error) {
    console.error('Failed to parse drop data:', error)
    message.error('创建失败')
  }
}

const handleSearch = () => {
  console.log('handleSearch')
}
// const openCardBox = async () => {
//   uiStore.toggleCardBox()
// }

// 批量选中功能

const transformLayerRef = ref<HTMLDivElement | null>(null)

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
    await loadViewState(whiteboardId)
    await whiteboardStore.initializeWhiteboardData(whiteboardId)
    whiteboardNotes.value = whiteboardStore.whiteboardNotes
    connections.value = whiteboardStore.connections
    whiteboardName.value =
      whiteboardStore.whiteboards.find((whiteboard: Whiteboard) => whiteboard.id === whiteboardId)
        ?.name || '未命名白板'
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
  console.log('WhiteboardDetail 组件挂载时取白板内容', id)
  if (id && typeof id === 'string') {
    whiteboardId.value = id
    await initializeData(whiteboardId.value)
    // await preloadNotes()
  }
  updateAllConnectionPositions()
})

// 拖拽改变大小的功能结束

const transformLayerStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0'
}))

// 拖拽白板笔记的功能
const hasMoved = ref(false)

// 删除对齐辅助线相关的状态，但保留吸附阈值
const SNAP_THRESHOLD = 5

// 修改 onDragItem 函数，移除辅助线相关代码但保留磁性吸附
const onDragItem = (event: MouseEvent) => {
  if (!draggingItem.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const { startPositions } = draggingItem.value

  // 计算鼠标移动的距离，考虑鼠标偏移量
  const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
  const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

  // 获取所有未选中的笔记的边界位置
  const otherNotes = whiteboardNotes.value.filter(
    (note) => !startPositions.some((pos) => pos.id === note.id)
  )

  // 更新所有选中项的位置
  startPositions.forEach((startPos) => {
    const note = whiteboardNotes.value.find((n) => n.id === startPos.id)
    if (!note) return

    let newX = mouseX - startPos.mouseOffsetX
    let newY = mouseY - startPos.mouseOffsetY
    const width = note.size.width
    const height = note.size.height

    // 计算当前笔记的边界和中心线
    const currentLeft = newX
    const currentRight = newX + width
    const currentTop = newY
    const currentBottom = newY + height
    const currentCenterX = newX + width / 2
    const currentCenterY = newY + height / 2

    // 检查与每个其他笔记的对齐
    otherNotes.forEach((otherNote) => {
      const boundaries = {
        left: otherNote.position.x,
        right: otherNote.position.x + otherNote.size.width,
        top: otherNote.position.y,
        bottom: otherNote.position.y + otherNote.size.height,
        centerX: otherNote.position.x + otherNote.size.width / 2,
        centerY: otherNote.position.y + otherNote.size.height / 2
      }

      // 水平对齐检查
      if (Math.abs(currentLeft - boundaries.left) < SNAP_THRESHOLD) {
        newX = boundaries.left
      }
      if (Math.abs(currentRight - boundaries.right) < SNAP_THRESHOLD) {
        newX = boundaries.right - width
      }
      if (Math.abs(currentCenterX - boundaries.centerX) < SNAP_THRESHOLD) {
        newX = boundaries.centerX - width / 2
      }

      // 垂直对齐检查
      if (Math.abs(currentTop - boundaries.top) < SNAP_THRESHOLD) {
        newY = boundaries.top
      }
      if (Math.abs(currentBottom - boundaries.bottom) < SNAP_THRESHOLD) {
        newY = boundaries.bottom - height
      }
      if (Math.abs(currentCenterY - boundaries.centerY) < SNAP_THRESHOLD) {
        newY = boundaries.centerY - height / 2
      }
    })

    updateItemPosition(startPos.id, newX, newY)
  })

  hasMoved.value = true
}

const startDraggingItem = (id: string, event: MouseEvent) => {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const mouseX = (event.clientX - rect.left - translateX.value) / scale.value
  const mouseY = (event.clientY - rect.top - translateY.value) / scale.value

  // 如果点击的项目不在选中列表中，则只拖动当前项目
  const dragIds = selectedItems.value.includes(id) ? selectedItems.value : [id]

  // 记录所有要拖动的项目的初始位置和鼠标偏移量
  const startPositions = dragIds.map((dragId) => {
    const note = whiteboardNotes.value.find((n) => n.id === dragId)
    if (!note)
      return {
        id: dragId,
        x: mouseX,
        y: mouseY,
        mouseOffsetX: 0,
        mouseOffsetY: 0
      }

    // 计算鼠标相对于元素的偏移量
    const mouseOffsetX = mouseX - note.position.x
    const mouseOffsetY = mouseY - note.position.y

    return {
      id: dragId,
      x: note.position.x,
      y: note.position.y,
      mouseOffsetX,
      mouseOffsetY
    }
  })

  draggingItem.value = {
    startPositions
  }

  document.addEventListener('mousemove', onDragItem)
  document.addEventListener('mouseup', stopDraggingItem)
}

// 停止拖拽
const stopDraggingItem = async () => {
  if (draggingItem.value) {
    const { startPositions } = draggingItem.value
    const updatedItems: WhiteboardNote[] = []

    for (const startPos of startPositions) {
      const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === startPos.id)
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
  debouncedSaveViewState.flush()
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
})

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

const currentMode = ref<'select' | 'drag'>('select')

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    // 左键
    // 如果点击的是画布本身，清除选中状态
    if (event.target === containerRef.value) {
      if (currentMode.value === 'select') {
        startSelection(event) // 开始框选
      } else if (currentMode.value === 'drag') {
        selectedItems.value = [] // 清除选中状态
        isDragging = true
        lastX = event.clientX
        lastY = event.clientY
      }
    }
  } else if (event.button === 2) {
    // 右键
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

  if (currentMode.value === 'select' && isSelecting.value) {
    updateSelection(event)
  } else if (isCreatingConnection.value) {
    handleConnectionMouseMove(event)
  } else if (isDragging) {
    const deltaX = event.clientX - lastX
    const deltaY = event.clientY - lastY
    translateX.value += deltaX
    translateY.value += deltaY
    lastX = event.clientX
    lastY = event.clientY
  }
}

const handleMouseUp = async (event: MouseEvent) => {
  if (isCreatingConnection.value) {
    await finishConnection(event)
  }

  if (isSelecting.value) {
    endSelection()
  }

  isDragging = false
}

const handleWheel = (event: WheelEvent) => {
  if (isNoteInteracting.value) {
    if (event.ctrlKey) {
      event.preventDefault()
    }
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

  // 使用新的保存视图状态方法
  if (whiteboardId.value) {
    debouncedSaveViewState(whiteboardId.value)
  }
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

const handleFitView = () => {
  if (containerRef.value) {
    fitView()(containerRef.value, whiteboardNotes.value)
    // 保存新的视图状态
    if (whiteboardId.value) {
      debouncedSaveViewState(whiteboardId.value)
    }
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
})

// 简化后的更新函数
const updateNotePosition = async (id: string, x: number, y: number) => {
  const note = whiteboardNotes.value.find((note) => note.id === id)
  if (note) {
    // note.position = { x, y }
    await whiteboardStore.updateWhiteboardNotePosition(id, x, y)
    updateConnectionPositions(id, { x, y })
  }
}

const updateNoteSize = async (id: string, width: number, height: number) => {
  const note = whiteboardNotes.value.find((note) => note.id === id)
  if (note) {
    note.size = { width, height }
    await whiteboardStore.updateWhiteboardNoteSize(id, width, height)
    updateAllConnectionPositions()
  }
}

const selectedItems = ref<string[]>([])

// 添加点击处理函数
const handleItemSelect = (itemId: string, event: MouseEvent) => {
  // 如果按住 Ctrl/Cmd 键，则进行多选
  if (event.ctrlKey || event.metaKey) {
    if (selectedItems.value.includes(itemId)) {
      selectedItems.value = selectedItems.value.filter((id) => id !== itemId)
    } else {
      selectedItems.value.push(itemId)
    }
  } else {
    // 单选
    selectedItems.value = [itemId]
  }
  event.stopPropagation() // 阻止事件冒泡
}

// 添加停止编辑处理函数
const handleStopEditing = () => {
  // 可以在这里添加任何需要的清理逻辑
  console.log('Note stopped editing')
}

// 监听 selectedNotes 的变化，同步到 selectedItems
watch(selectedNotes, (newSelectedNotes) => {
  selectedItems.value = newSelectedNotes
})

// 处理笔记聚焦
const handleNoteFocus = (noteInfo: {
  position: { x: number; y: number }
  size: { width: number; height: number }
}) => {
  // 重置缩放比例为 100%
  scale.value = 1

  // 计算画布中心点
  const containerWidth = containerRef.value?.clientWidth || 0
  const containerHeight = containerRef.value?.clientHeight || 0

  // 计算笔记中心点
  const noteCenterX = noteInfo.position.x + noteInfo.size.width / 2
  const noteCenterY = noteInfo.position.y + noteInfo.size.height / 2

  // 计算需要的偏移量，使笔记居中
  const newTranslateX = containerWidth / 2 - noteCenterX
  const newTranslateY = containerHeight / 2 - noteCenterY

  // 使用动画平滑过渡到新位置
  translateX.value = newTranslateX
  translateY.value = newTranslateY

  // 保存新的视图状态
  if (whiteboardId.value) {
    debouncedSaveViewState(whiteboardId.value)
  }
}

// 添加新的创建方法
const createNote = async (type: 'text' | 'card' | 'image') => {
  if (!containerRef.value || !whiteboardId.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const centerX = (rect.width / 2 - translateX.value) / scale.value
  const centerY = (rect.height / 2 - translateY.value) / scale.value

  // 调整文本卡片的默认高度为 55px
  const defaultSize = type === 'text' ? { width: 240, height: 55 } : { width: 350, height: 300 }

  // 基础属性
  const baseInput = {
    whiteboardId: whiteboardId.value,
    position: { x: centerX, y: centerY },
    size: defaultSize,
    zIndex: 1,
    rotation: 0,
    type,
    style: {
      backgroundColor: undefined,
      textColor: undefined,
      fontSize: undefined,
      fontFamily: undefined
    }
  }

  // 根据类型添加特定属性
  const input: CreateWhiteboardNoteInput = {
    ...baseInput,
    ...(type === 'card' && {
      noteId: '',
      isAutoHeight: false
    }),
    ...(type === 'text' && {
      content: '',
      isAutoHeight: false
    }),
    ...(type === 'image' && {
      imageUrl: '',
      originalSize: undefined,
      isAutoHeight: false
    })
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    console.log('newNote', newNote)
    // if (newNote && newNote.id) {
    //   whiteboardNotes.value = [...whiteboardNotes.value, newNote]
    //   console.log('whiteboardNotes', whiteboardNotes.value)
    // }
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
    message.error('创建失败')
  }
}

const createTextNote = () => createNote('text')
const createImageNote = () => {
  imageUploadModalRef.value?.show()
}

const handleImageConfirm = async (imageData: { url: string; width: number; height: number }) => {
  if (!containerRef.value || !whiteboardId.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const centerX = (rect.width / 2 - translateX.value) / scale.value
  const centerY = (rect.height / 2 - translateY.value) / scale.value

  // 计算合适的示尺寸
  const maxWidth = 500
  const maxHeight = 400
  let width = imageData.width
  let height = imageData.height

  if (width > maxWidth) {
    const ratio = maxWidth / width
    width = maxWidth
    height = Math.round(height * ratio)
  }

  if (height > maxHeight) {
    const ratio = maxHeight / height
    height = maxHeight
    width = Math.round(width * ratio)
  }

  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId.value,
    position: { x: centerX, y: centerY },
    size: { width, height },
    zIndex: 1,
    rotation: 0,
    type: 'image',
    imageUrl: imageData.url,
    originalSize: { width: imageData.width, height: imageData.height }
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    console.log('Created image note:', newNote)
    if (newNote && newNote.id) {
      // 不要直接修改本地数组，让 store 来处理状态更新
      // whiteboardNotes.value = [...whiteboardNotes.value, newNote]
    }
  } catch (error) {
    console.error('Failed to create image note:', error)
    message.error('创建失败')
  }
}

const imageUploadModalRef = ref<InstanceType<typeof ImageUploadModal> | null>(null)

// 处理开始连接事件
const handleStartConnection = (item: WhiteboardNote & { startAnchorPosition: AnchorPosition }) => {
  const { startAnchorPosition, ...note } = item

  // 根据锚点位置计算起始点
  const startPoint = {
    x: note.position.x,
    y: note.position.y
  }

  switch (startAnchorPosition) {
    case 'top':
      startPoint.x += note.size.width / 2
      break
    case 'right':
      startPoint.x += note.size.width
      startPoint.y += note.size.height / 2
      break
    case 'bottom':
      startPoint.x += note.size.width / 2
      startPoint.y += note.size.height
      break
    case 'left':
      startPoint.y += note.size.height / 2
      break
  }

  // 调用 useConnection 中的 startConnection 方法
  startConnection(note, startAnchorPosition)
}
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
  // background-color: var(--color-bg-secondary);
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
  z-index: 1000;
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
  // background-color: var(--color-bg-secondary);
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

// 添加平滑过渡效果
.whiteboard-canvas {
  transition: transform 0.3s ease;
}

.create-menu {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: var(--color-bg-whiteboard);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  z-index: 100;
  transition: all 0.3s ease-in-out;

  .create-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background-color: var(--color-hover-button);
      transform: translateY(-4px);

      .icon {
        :deep(.i-icon) {
          color: var(--color-primary);
        }
      }
    }

    &:active {
      background-color: var(--color-active-button);
      transform: translateY(-2px);
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      transition: all 0.2s ease;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-text-secondary);
      }
      :deep(svg) {
        width: 24px;
        height: 24px;
        transition: fill 0.2s ease;
      }
    }
  }
}
</style>
