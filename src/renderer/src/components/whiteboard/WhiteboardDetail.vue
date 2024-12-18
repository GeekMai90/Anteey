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
            :is-selected="selectedItems.includes(item.id)"
            @drag-start="startDraggingItem(item, $event)"
            @resize-start="startResizingItem(item, $event)"
            @start-connection="startConnection"
            @note-interaction="handleNoteInteraction"
            @hover="handleNoteHover"
            @click-outside="handleContainerClickOutside"
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
          <WhiteboardTextCard
            v-for="card in whiteboardTextCards"
            :key="card.id"
            :card="card"
            :style="getTextCardStyle(card)"
            :is-selected="selectedItems.includes(card.id)"
            @mousedown="startDraggingItem({ ...card, type: 'text' }, $event)"
            @resize-start="startResizingItem({ ...card, type: 'text' }, $event)"
            @note-interaction="handleNoteInteraction"
            @item-click="handleItemClick"
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
      :selected-notes="selectedItems"
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
import { CreateWhiteboardNoteInput, WhiteboardNote, Connection } from '@renderer/types/Whiteboard'
import WhiteboardNoteComponent from '@renderer/components/whiteboard/WhiteboardNoteComponent.vue'
import { Add, Aiming } from '@icon-park/vue-next'
import WhiteboardZoomControl from '@renderer/components/whiteboard/WhiteboardZoomControl.vue'
import CardConnection from './CardConnection.vue'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import SelectionToolbar from '@renderer/components/whiteboard/SelectionToolbar.vue'
import WhiteboardToolbarLeft from '@renderer/components/whiteboard/WhiteboardToolbarLeft.vue'
import WhiteboardSearchModal from '@renderer/components/whiteboard/WhiteboardSearchModal.vue'
import { useConnection } from '@renderer/composables/whiteboard/useConnection'
import { useSelection } from '@renderer/composables/whiteboard/useSelection'
import { useWhiteboardViewState } from '@renderer/composables/whiteboard/useWhiteboardViewState'
import WhiteboardTextCard from './WhiteboardTextCard.vue'
import { WhiteboardTextCard as WhiteboardTextCardType } from '@renderer/types/Whiteboard'

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

// 连线相关状态

const descriptionInputRef = ref<HTMLInputElement | null>(null)
const measureSpan = ref<HTMLSpanElement | null>(null)

const isHoveringNote = ref(false)

const showSelectionToolbar = computed(() => {
  return selectedItems.value.length > 1
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

const whiteboardTextCards = ref<WhiteboardTextCardType[]>([])

const {
  isSelecting,
  selectedItems,
  selectionBoxStyle,
  startSelection,
  updateSelection,
  endSelection,
  handleContainerClickOutside
} = useSelection(whiteboardNotes, whiteboardTextCards, scale, translateX, translateY, containerRef)

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
    noteId: noteData.id, // 直接使用拖拽笔记 id
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

const transformLayerRef = ref<HTMLDivElement | null>(null)

const updateNotes = async (updatedItems: (WhiteboardNote | WhiteboardTextCardType)[]) => {
  const updatedNotes: WhiteboardNote[] = []
  const updatedTextCards: WhiteboardTextCardType[] = []

  updatedItems.forEach((item) => {
    if ('type' in item && item.type === 'text') {
      updatedTextCards.push(item as WhiteboardTextCardType)
    } else {
      updatedNotes.push(item as WhiteboardNote)
    }
  })

  // 更新白板笔记
  whiteboardNotes.value = whiteboardNotes.value.map((note) => {
    const updatedNote = updatedNotes.find((n) => n.id === note.id)
    return updatedNote || note
  })

  // 更新文本卡片
  whiteboardTextCards.value = whiteboardTextCards.value.map((card) => {
    const updatedCard = updatedTextCards.find((c) => c.id === card.id)
    return updatedCard || card
  })

  // 保存到后端
  try {
    await Promise.all([
      ...updatedNotes.map((note) =>
        whiteboardStore.updateWhiteboardNotePosition(note.id, note.position.x, note.position.y)
      ),
      ...updatedTextCards.map((card) =>
        whiteboardStore.updateWhiteboardTextCard(card.id, {
          position: { x: card.position.x, y: card.position.y }
        })
      )
    ])
  } catch (error) {
    console.error('更新位置失败:', error)
  }
}

// 数据是否加载完成
const dataLoaded = ref(false)

// 监听 whiteboardStore.whiteboardNotes 的变化，立即更新视图
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

// 计算连线两端的点
// const calculateConnectionPoints = (startNote: WhiteboardNote, endNote: WhiteboardNote) => {
//   const getEdgeCenterPoint = (note: WhiteboardNote, angle: number) => {
//     const center = {
//       x: note.position.x + note.size.width / 2,
//       y: note.position.y + note.size.height / 2
//     }
//     const w = note.size.width / 2
//     const h = note.size.height / 2

//     // 确定连接边并返回其中心点
//     if (Math.abs(Math.tan(angle)) < h / w) {
//       // 连接到左边或右边
//       return {
//         x: center.x + w * Math.sign(Math.cos(angle)),
//         y: center.y
//       }
//     } else {
//       // 连接到上边或下边
//       return {
//         x: center.x,
//         y: center.y + h * Math.sign(Math.sin(angle))
//       }
//     }
//   }

//   const dx = endNote.position.x - startNote.position.x
//   const dy = endNote.position.y - startNote.position.y
//   const angle = Math.atan2(dy, dx)

//   const startPoint = getEdgeCenterPoint(startNote, angle)
//   const endPoint = getEdgeCenterPoint(endNote, angle + Math.PI)

//   return { startPoint, endPoint }
// }

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
    whiteboardTextCards.value = whiteboardStore.whiteboardTextCards
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
  item: WhiteboardNote | WhiteboardTextCardType,
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

// 计算拖拽改变大小位置和大小
const onResizeItem = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!resizingItem.value || !containerRef.value) return

  const { id, direction, startX, startY, startWidth, startHeight } = resizingItem.value
  const dx = (event.clientX - startX) / scale.value
  const dy = (event.clientY - startY) / scale.value

  // 检查是否为文本卡片
  const textCard = whiteboardTextCards.value.find((card) => card.id === id)
  const item = textCard || whiteboardNotes.value.find((note) => note.id === id)
  if (!item) return

  let newWidth = startWidth
  let newHeight = startHeight

  // 修改最小尺寸限制
  const minWidth = 100
  const minHeight = 48 // 修改为 48px

  // 根据拖拽改变大小的方向来计算新的宽度和高度
  switch (direction) {
    case 'right':
      newWidth = Math.max(startWidth + dx, minWidth)
      break
    case 'bottom':
      newHeight = Math.max(startHeight + dy, minHeight)
      break
    case 'left':
      newWidth = Math.max(startWidth - dx, minWidth)
      visualAdjustment.value.x = startWidth - newWidth
      break
    case 'top':
      newHeight = Math.max(startHeight - dy, minHeight)
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'top-left':
      newWidth = Math.max(startWidth - dx, minWidth)
      newHeight = Math.max(startHeight - dy, minHeight)
      visualAdjustment.value.x = startWidth - newWidth
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'top-right':
      newWidth = Math.max(startWidth + dx, minWidth)
      newHeight = Math.max(startHeight - dy, minHeight)
      visualAdjustment.value.y = startHeight - newHeight
      break
    case 'bottom-right':
      newWidth = Math.max(startWidth + dx, minWidth)
      newHeight = Math.max(startHeight + dy, minHeight)
      break
    case 'bottom-left':
      newWidth = Math.max(startWidth - dx, minWidth)
      newHeight = Math.max(startHeight + dy, minHeight)
      visualAdjustment.value.x = startWidth - newWidth
      break
  }

  // 更���大小
  if (textCard) {
    textCard.size.width = newWidth
    textCard.size.height = newHeight
  } else if (item) {
    item.size.width = newWidth
    item.size.height = newHeight
  }
}

// 停止拖拽改变大小
const stopResizingItem = async (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (resizingItem.value) {
    const textCard = whiteboardTextCards.value.find((card) => card.id === resizingItem.value?.id)
    const item =
      textCard || whiteboardNotes.value.find((note) => note.id === resizingItem.value?.id)

    if (item && whiteboardId.value) {
      try {
        if (textCard) {
          // 更新文本卡片
          await whiteboardStore.updateWhiteboardTextCard(item.id, {
            size: { width: item.size.width, height: item.size.height },
            position: {
              x: item.position.x + visualAdjustment.value.x,
              y: item.position.y + visualAdjustment.value.y
            }
          })
          // 应用视觉调整到实际位置
          textCard.position.x += visualAdjustment.value.x
          textCard.position.y += visualAdjustment.value.y
        } else {
          // 更新白板笔记
          await whiteboardStore.updateWhiteboardNoteSize(item.id, item.size.width, item.size.height)
          await whiteboardStore.updateWhiteboardNotePosition(
            item.id,
            item.position.x + visualAdjustment.value.x,
            item.position.y + visualAdjustment.value.y
          )
          // 更新白板笔记的自动高度
          await whiteboardStore.updateWhiteboardNoteAutoHeight(item.id, false)
          if ('isAutoHeight' in item) {
            item.isAutoHeight = false
          }
          // 应用视觉调整到实际位置
          item.position.x += visualAdjustment.value.x
          item.position.y += visualAdjustment.value.y
        }
      } catch (error) {
        console.error('Failed to update item size:', error)
      }
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

const startDraggingItem = (
  item: WhiteboardNote | (WhiteboardTextCardType & { type: 'text' }),
  event: MouseEvent
) => {
  if (isNoteInteracting.value) {
    event.preventDefault()
    return
  }
  if ((event.target as HTMLElement).closest('.connection-button')) {
    return
  }
  event.preventDefault()
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()

  // 如果是文本卡片
  if ('type' in item && item.type === 'text') {
    // 如果当前卡片不在选中状态，且不是按住 Ctrl/Command 键，则重置选择
    if (!selectedItems.value.includes(item.id) && !(event.ctrlKey || event.metaKey)) {
      selectedItems.value = [item.id]
    }
    // 获取所有选中的文本卡片
    const selectedCards = whiteboardTextCards.value.filter((card) =>
      selectedItems.value.includes(card.id)
    )
    draggingItem.value = {
      ids: selectedCards.map((card) => card.id),
      startPositions: selectedCards.map((card) => ({
        id: card.id,
        x: (event.clientX - rect.left - translateX.value) / scale.value - card.position.x,
        y: (event.clientY - rect.top - translateY.value) / scale.value - card.position.y
      }))
    }
  } else {
    // 原有的白板笔记逻辑
    if (!selectedItems.value.includes(item.id) && !(event.ctrlKey || event.metaKey)) {
      selectedItems.value = [item.id]
    }
    const selectedNotesList = whiteboardNotes.value.filter((note) =>
      selectedItems.value.includes(note.id)
    )
    draggingItem.value = {
      ids: selectedNotesList.map((note) => note.id),
      startPositions: selectedNotesList.map((note) => ({
        id: note.id,
        x: (event.clientX - rect.left - translateX.value) / scale.value - note.position.x,
        y: (event.clientY - rect.top - translateY.value) / scale.value - note.position.y
      }))
    }
  }

  hasMoved.value = false
  document.addEventListener('mousemove', onDragItem)
  document.addEventListener('mouseup', stopDraggingItem)
}

const onDragItem = (event: MouseEvent) => {
  if (!draggingItem.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const { ids, startPositions } = draggingItem.value
  const snapThreshold = SNAP_THRESHOLD / scale.value
  const SPACING = 5 // 最小间距

  ids.forEach((id, index) => {
    const { x: startX, y: startY } = startPositions[index]
    let newX = (event.clientX - rect.left - translateX.value) / scale.value - startX
    let newY = (event.clientY - rect.top - translateY.value) / scale.value - startY

    // 检查是否为文本卡片
    const textCard = whiteboardTextCards.value.find((card) => card.id === id)
    const currentItem = textCard || whiteboardNotes.value.find((item) => item.id === id)

    if (!currentItem) return

    if (newX !== currentItem.position.x || newY !== currentItem.position.y) {
      hasMoved.value = true
    }

    // 计算当前项的中心点
    const currentCenterX = newX + currentItem.size.width / 2
    const currentCenterY = newY + currentItem.size.height / 2

    // 遍历所有可对齐的项（包括笔记和文本卡片）
    const allItems = [...whiteboardNotes.value, ...whiteboardTextCards.value].filter(
      (item) => item.id !== id
    )

    allItems.forEach((otherItem) => {
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

      // 中心对齐（水平和垂直）
      if (Math.abs(currentCenterX - otherCenterX) < snapThreshold) {
        newX = otherCenterX - currentItem.size.width / 2
        alignmentGuides.value.push({ direction: 'vertical', position: otherCenterX })
      }
      if (Math.abs(currentCenterY - otherCenterY) < snapThreshold) {
        newY = otherCenterY - currentItem.size.height / 2
        alignmentGuides.value.push({ direction: 'horizontal', position: otherCenterY })
      }

      // 相邻间距对齐
      // 左边相邻
      if (
        Math.abs(newX - (otherItem.position.x + otherItem.size.width + SPACING)) < snapThreshold
      ) {
        newX = otherItem.position.x + otherItem.size.width + SPACING
        alignmentGuides.value.push({ direction: 'vertical', position: newX - SPACING })
      }
      // 右边相邻
      if (
        Math.abs(newX + currentItem.size.width + SPACING - otherItem.position.x) < snapThreshold
      ) {
        newX = otherItem.position.x - currentItem.size.width - SPACING
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newX + currentItem.size.width + SPACING
        })
      }
      // 顶边相邻
      if (
        Math.abs(newY - (otherItem.position.y + otherItem.size.height + SPACING)) < snapThreshold
      ) {
        newY = otherItem.position.y + otherItem.size.height + SPACING
        alignmentGuides.value.push({ direction: 'horizontal', position: newY - SPACING })
      }
      // 底边相邻
      if (
        Math.abs(newY + currentItem.size.height + SPACING - otherItem.position.y) < snapThreshold
      ) {
        newY = otherItem.position.y - currentItem.size.height - SPACING
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newY + currentItem.size.height + SPACING
        })
      }
    })

    // 更新位置
    if (textCard) {
      updateItemPosition(id, newX, newY, 'text')
    } else {
      updateConnectionPositions(id, { x: newX, y: newY })
      updateItemPosition(id, newX, newY, 'card')
    }
  })
}

// 停止拖拽
const stopDraggingItem = async () => {
  if (draggingItem.value) {
    const { ids } = draggingItem.value
    const updatedNotes: WhiteboardNote[] = []
    const updatedTextCards: WhiteboardTextCardType[] = []

    for (const id of ids) {
      // 检查是否为文本卡片
      const textCardIndex = whiteboardTextCards.value.findIndex((card) => card.id === id)
      if (textCardIndex !== -1) {
        const textCard = whiteboardTextCards.value[textCardIndex]
        updatedTextCards.push(textCard)
      } else {
        const noteIndex = whiteboardNotes.value.findIndex((note) => note.id === id)
        if (noteIndex !== -1 && whiteboardId.value) {
          const note = whiteboardNotes.value[noteIndex]
          updatedNotes.push(note)
        }
      }
    }

    // 更新连接线位置
    updateAllConnectionPositions()

    // 异步更新后端
    try {
      await Promise.all([
        ...updatedNotes.map((note) =>
          whiteboardStore.updateWhiteboardNotePosition(note.id, note.position.x, note.position.y)
        ),
        ...updatedTextCards.map((card) =>
          whiteboardStore.updateWhiteboardTextCard(card.id, {
            position: { x: card.position.x, y: card.position.y }
          })
        )
      ])

      // 拖动结束后重新获取数据
      if (whiteboardId.value) {
        await initializeData(whiteboardId.value)
      }
    } catch (error) {
      console.error('更新位置失败:', error)
    }
  }

  draggingItem.value = null
  hasMoved.value = false
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
}

const updateItemPosition = (id: string, x: number, y: number, type: 'card' | 'text' = 'card') => {
  if (type === 'text') {
    const itemIndex = whiteboardTextCards.value.findIndex(
      (item: WhiteboardTextCardType) => item.id === id
    )
    if (itemIndex !== -1) {
      // 创建新的数组以触发响应式更新
      const updatedCards = [...whiteboardTextCards.value]
      updatedCards[itemIndex] = {
        ...updatedCards[itemIndex],
        position: { x, y }
      }
      whiteboardTextCards.value = updatedCards
    }
  } else {
    const itemIndex = whiteboardNotes.value.findIndex((item) => item.id === id)
    if (itemIndex !== -1) {
      const updatedItem = { ...whiteboardNotes.value[itemIndex] }
      updatedItem.position = { x, y }
      whiteboardNotes.value.splice(itemIndex, 1, updatedItem)
    }
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
      },
      {
        label: '新建文本',
        icon: markRaw(Add),
        action: () => createTextCard(x, y)
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

// 创建文本卡片的函数
const createTextCard = async (x: number, y: number) => {
  if (!whiteboardId.value) return

  try {
    const newCard = await whiteboardStore.createWhiteboardTextCard({
      whiteboardId: whiteboardId.value,
      content: '新建文本',
      position: { x, y },
      size: { width: 200, height: 48 },
      zIndex: 1,
      style: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        fontSize: 14
      }
    })

    // 替换而不是追加，确保状态同步
    whiteboardTextCards.value = [
      ...whiteboardTextCards.value.filter((card) => card.id !== newCard.id),
      newCard
    ]

    // 或者重新获取所有数据
    // await initializeData(whiteboardId.value)

    contextMenuStore.closeMenu()
  } catch (error) {
    console.error('Failed to create text card:', error)
  }
}

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

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
    // 使用 useSelection 提供的方法处理选择框更新
    updateSelection(event)
  } else if (isCreatingConnection.value) {
    handleConnectionMouseMove(event)
  } else if (currentMode.value === 'drag' && isDragging) {
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
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
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
  document.removeEventListener('mousemove', onResizeItem)
  document.removeEventListener('mouseup', stopResizingItem)
})

// 添加文本卡片样式函数
const getTextCardStyle = (card: WhiteboardTextCardType) => {
  return {
    position: 'absolute',
    left: `${card.position.x + (resizingItem.value?.id === card.id ? visualAdjustment.value.x : 0)}px`,
    top: `${card.position.y + (resizingItem.value?.id === card.id ? visualAdjustment.value.y : 0)}px`,
    width: `${card.size.width}px`,
    height: `${card.size.height}px`,
    zIndex: card.zIndex
  }
}

// 新增处理点击事件的函数
const handleItemClick = (id: string, event: MouseEvent) => {
  // 如果按住 Ctrl/Command 键，则进行多选
  if (event.ctrlKey || event.metaKey) {
    if (selectedItems.value.includes(id)) {
      selectedItems.value = selectedItems.value.filter((itemId) => itemId !== id)
    } else {
      selectedItems.value.push(id)
    }
  } else {
    // 如果点击的项已经在选中状态，且当前有多个选中项，则保持多选状态
    if (!(selectedItems.value.includes(id) && selectedItems.value.length > 1)) {
      selectedItems.value = [id]
    }
  }
}

// 在 script setup 中添加
defineEmits<{
  'item-click': [id: string, event: MouseEvent]
}>()
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
