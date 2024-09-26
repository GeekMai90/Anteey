<!-- WhiteboardDetail.vue -->
<template>
  <div class="whiteboard-detail">
    <div class="fixed-header">
      <AppToolbar />
    </div>
    <!-- 白板容器 -->
    <div
      ref="containerRef"
      class="whiteboard-container"
      @dblclick.stop="handleContainerDoubleClick"
      @contextmenu.prevent
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- 白板内容 -->
      <div ref="contentRef" class="whiteboard-content" :style="contentStyle">
        <!-- 遍历渲染白板项 -->
        <div
          v-for="item in whiteboardItems"
          :key="item.id"
          :class="['whiteboard-item', item.type]"
          :style="getItemStyle(item)"
          @mousedown.stop="startDraggingItem(item, $event)"
        >
          <!-- @mousedown="onItemMouseDown(item, $event)" -->
          <component
            :is="getItemComponent(item)"
            :note="item.type === 'note' ? whiteboardStore.getReferenceNotes(item.noteId) : null"
            @dragStart="startDraggingItem(item, $event)"
          />
        </div>
      </div>
    </div>
    <!-- 适应视图按钮 -->

    <div class="fit-view-button" @click="fitView">
      <div class="icon">
        <Aiming theme="outline" size="24" fill="#333" />
      </div>
    </div>
    <!-- 新增：创建白板笔记按钮 -->
    <div class="create-note-button" @click="createWhiteboardNote">
      <div class="icon">
        <Add theme="outline" size="24" fill="#333" />
      </div>
      <span>创建笔记</span>
    </div>
    <ContextMenu />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, onUnmounted, computed, watch } from 'vue'
import AppToolbar from '@renderer/components/AppToolbar.vue'
// import { useRouter } from 'vue-router'
// import WhiteboardThumbnail from '@renderer/components/WhiteboardThumbnail.vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import type {
  CreateWhiteboardInput,
  WhiteboardItem,
  Whiteboard,
  CreateWhiteboardNoteInput
} from '@renderer/types/Note'
import WhiteboardNote from '@renderer/components/WhiteboardNote.vue'
import WhiteboardSubboard from '@renderer/components/WhiteboardSubboard.vue'
import WhiteboardGroup from '@renderer/components/WhiteboardGroup.vue'
import Connection from '@renderer/components/Connection.vue'
import ContextMenu from '../components/ContexMenu.vue'
import { useContextMenuStore } from '@renderer/stores/contextMenuStore'
import { Add, Aiming } from '@icon-park/vue-next'
import { useRoute } from 'vue-router'

// const router = useRouter()
const route = useRoute()
const whiteboardStore = useWhiteboardStore()
const contextMenuStore = useContextMenuStore()
const whiteboardId = route.params.id as string
const whiteboardItems = ref<WhiteboardItem[] | null>([])
const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const whiteboards = ref<Whiteboard[] | null>([])

// 缩放和平移状态
const scale = ref<number>(1)
const translateX = ref(0)
const translateY = ref(0)

// 计算内容样式
const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: '100%',
  height: '100%'
}))

// 封装获取白板内容的函数
const fetchWhiteboardItems = async () => {
  if (whiteboardId) {
    whiteboardItems.value = await whiteboardStore.getWhiteboardItems(whiteboardId)
    console.log('whiteboardItems', whiteboardItems.value)
  }
}

// 组件挂载时获取白板内容
onMounted(fetchWhiteboardItems)

// 监听 whiteboardId 的变化并重新获取白板内容
watch(
  () => whiteboardId,
  async () => {
    fetchWhiteboardItems()
  },
  { immediate: true }
)

// 创建新白板
// const createNewWhiteboard = async (x: number, y: number) => {
//   const input: CreateWhiteboardInput = {
//     name: '新白板',
//     isRoot: true,
//     position: { x, y },
//     size: { width: 200, height: 150 },
//     zoomLevel: 1,
//     scrollPosition: { x: 0, y: 0 },
//     scale: 1,
//     translateX: 0,
//     translateY: 0
//   }
//   try {
//     await whiteboardStore.createWhiteboard(input)
//     whiteboards.value = whiteboardStore.whiteboards
//     contextMenuStore.closeMenu()
//   } catch (error) {
//     console.error('Failed to create whiteboard:', error)
//   }
// }

// 新增：创建白板笔记的函数
const createWhiteboardNote = async () => {
  const input: CreateWhiteboardNoteInput = {
    whiteboardId: whiteboardId,
    noteId: '',
    position: { x: 100, y: 100 }, // 默认位置，你可以根据需要调整
    size: { width: 200, height: 150 }, // 默认大小，你可以根据需要调整
    zIndex: 1,
    rotation: 0
  }

  try {
    const newNote = await whiteboardStore.createWhiteboardNote(input)
    whiteboardItems.value?.push(newNote)
  } catch (error) {
    console.error('Failed to create whiteboard note:', error)
  }
}

const getItemComponent = (item: WhiteboardItem) => {
  switch (item.type) {
    case 'note':
      return WhiteboardNote
    case 'subboard':
      return WhiteboardSubboard
    case 'group':
      return WhiteboardGroup
    case 'connection':
      return Connection
    default:
      return null
  }
}

const getItemStyle = (item: WhiteboardItem) => {
  return {
    left: `${'position' in item && item.position ? item.position.x : 0}px`,
    top: `${'position' in item && item.position ? item.position.y : 0}px`,
    width: `${'size' in item && item.size ? item.size.width : 0}px`,
    height: `${'size' in item && item.size ? item.size.height : 0}px`,
    zIndex: `${'zIndex' in item ? item.zIndex : 0}`,
    transform: `rotate(${'rotation' in item ? item.rotation : 0}deg)`
  }
}

// 拖动状态变量
let isDragging = false
let lastX = 0
let lastY = 0
let lastPinchDistance = 0

// 磁性吸附和对齐辅助
const SNAP_THRESHOLD = 10 // 吸附阈值（像素）
const alignmentGuides = ref<{ direction: 'horizontal' | 'vertical'; position: number }[]>([])

// 组件挂载时执行的操作
onMounted(async () => {
  await checkAndCreateRootWhiteboard() // 检查并创建根白板
  await whiteboardStore.getTopLevelWhiteboards() // 获取顶级白板
  whiteboards.value = whiteboardStore.whiteboards // 设置白板列表
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
  router.push({ name: 'whiteboardDetail', params: { id } })
}

// 创建新白板
const createNewWhiteboard = async (x: number, y: number) => {
  const input: CreateWhiteboardInput = {
    name: '新白板',
    isRoot: true,
    position: { x, y },
    size: { width: 300, height: 150 },
    zoomLevel: 1,
    scrollPosition: { x: 0, y: 0 },
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
        acc.left = Math.min(acc.left, wb.position.x)
        acc.top = Math.min(acc.top, wb.position.y)
        acc.right = Math.max(acc.right, wb.position.x + (wb.size?.width || 200))
        acc.bottom = Math.max(acc.bottom, wb.position.y + (wb.size?.height || 200))
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
const draggingItem = ref<{ id: string; type: string; startX: number; startY: number } | null>(null)

// 开始拖动缩略图
const startDraggingItem = (item: WhiteboardItem, event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  draggingItem.value = {
    id: item.id,
    type: item.type,
    startX: (event.clientX - rect.left) / scale.value - (item.position?.x || 0),
    startY: (event.clientY - rect.top) / scale.value - (item.position?.y || 0)
  }

  document.addEventListener('mousemove', onDragItem)
  document.addEventListener('mouseup', stopDraggingItem)
}

// // 拖动缩略图过程中，有磁性吸附的效果
const SPACING = 5 // 定义缩略图之间的间距
const onDragItem = (event: MouseEvent) => {
  if (!draggingItem.value || !containerRef.value) return

  const { id, type, startX, startY } = draggingItem.value
  const rect = containerRef.value.getBoundingClientRect()

  let newX = (event.clientX - rect.left) / scale.value - startX
  let newY = (event.clientY - rect.top) / scale.value - startY

  alignmentGuides.value = [] // 清除之前的对齐辅助线

  const currentItem = whiteboardItems.value.find((item) => item.id === id)
  if (!currentItem) return

  const snapThreshold = SNAP_THRESHOLD / scale.value

  const currentCenterX = newX + (currentItem.size?.width || 0) / 2
  const currentCenterY = newY + (currentItem.size?.height || 0) / 2

  whiteboardItems.value.forEach((otherItem) => {
    if (otherItem.id !== id) {
      const otherCenterX = otherItem.position.x + (otherItem.size?.width || 0) / 2
      const otherCenterY = otherItem.position.y + (otherItem.size?.height || 0) / 2

      // 左边对齐
      if (Math.abs(newX - otherItem.position.x) < snapThreshold) {
        newX = otherItem.position.x
        alignmentGuides.value.push({ direction: 'vertical', position: newX })
      }
      // 右边对齐
      if (
        Math.abs(
          newX +
            (currentItem.size?.width || 0) -
            (otherItem.position.x + (otherItem.size?.width || 0))
        ) < snapThreshold
      ) {
        newX = otherItem.position.x + (otherItem.size?.width || 0) - (currentItem.size?.width || 0)
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newX + (currentItem.size?.width || 0)
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
          newY +
            (currentItem.size?.height || 0) -
            (otherItem.position.y + (otherItem.size?.height || 0))
        ) < snapThreshold
      ) {
        newY =
          otherItem.position.y + (otherItem.size?.height || 0) - (currentItem.size?.height || 0)
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newY + (currentItem.size?.height || 0)
        })
      }

      // 中间对齐（水平）
      if (Math.abs(currentCenterX - otherCenterX) < snapThreshold) {
        newX = otherCenterX - (currentItem.size?.width || 0) / 2
        alignmentGuides.value.push({ direction: 'vertical', position: otherCenterX })
      }
      // 中间对齐（垂直）
      if (Math.abs(currentCenterY - otherCenterY) < snapThreshold) {
        newY = otherCenterY - (currentItem.size?.height || 0) / 2
        alignmentGuides.value.push({ direction: 'horizontal', position: otherCenterY })
      }

      // 左边相邻
      if (
        Math.abs(newX - (otherItem.position.x + (otherItem.size?.width || 0) + SPACING)) <
        snapThreshold
      ) {
        newX = otherItem.position.x + (otherItem.size?.width || 0) + SPACING
        alignmentGuides.value.push({ direction: 'vertical', position: newX - SPACING })
      }
      // 右边相邻
      if (
        Math.abs(newX + (currentItem.size?.width || 0) + SPACING - otherItem.position.x) <
        snapThreshold
      ) {
        newX = otherItem.position.x - (currentItem.size?.width || 0) - SPACING
        alignmentGuides.value.push({
          direction: 'vertical',
          position: newX + (currentItem.size?.width || 0) + SPACING
        })
      }
      // 顶边相邻
      if (
        Math.abs(newY - (otherItem.position.y + (otherItem.size?.height || 0) + SPACING)) <
        snapThreshold
      ) {
        newY = otherItem.position.y + (otherItem.size?.height || 0) + SPACING
        alignmentGuides.value.push({ direction: 'horizontal', position: newY - SPACING })
      }
      // 底边相邻
      if (
        Math.abs(newY + (currentItem.size?.height || 0) + SPACING - otherItem.position.y) <
        snapThreshold
      ) {
        newY = otherItem.position.y - (currentItem.size?.height || 0) - SPACING
        alignmentGuides.value.push({
          direction: 'horizontal',
          position: newY + (currentItem.size?.height || 0) + SPACING
        })
      }

      // 顶边与左边中间对齐
      if (Math.abs(newY - otherCenterY) < snapThreshold) {
        newY = otherCenterY
        alignmentGuides.value.push({ direction: 'horizontal', position: newY })
      }
      // 底边与左边中间对齐
      if (Math.abs(newY + (currentItem.size?.height || 0) - otherCenterY) < snapThreshold) {
        newY = otherCenterY - (currentItem.size?.height || 0)
        alignmentGuides.value.push({ direction: 'horizontal', position: otherCenterY })
      }
      // 左边与顶边中间对齐
      if (Math.abs(newX - otherCenterX) < snapThreshold) {
        newX = otherCenterX
        alignmentGuides.value.push({ direction: 'vertical', position: newX })
      }
      // 右边与顶边中间对齐
      if (Math.abs(newX + (currentItem.size?.width || 0) - otherCenterX) < snapThreshold) {
        newX = otherCenterX - (currentItem.size?.width || 0)
        alignmentGuides.value.push({ direction: 'vertical', position: otherCenterX })
      }
    }
  })

  // 更新项目位置
  updateItemPosition(id, newX, newY)

  // 可选：添加边界检查，防止项目被拖出可视区域
  const containerWidth = containerRef.value.clientWidth / scale.value
  const containerHeight = containerRef.value.clientHeight / scale.value
  if (newX < 0) newX = 0
  if (newY < 0) newY = 0
  if (newX + (currentItem.size?.width || 0) > containerWidth)
    newX = containerWidth - (currentItem.size?.width || 0)
  if (newY + (currentItem.size?.height || 0) > containerHeight)
    newY = containerHeight - (currentItem.size?.height || 0)

  // 最终更新位置
  updateItemPosition(id, newX, newY)
}

// 修改 stopDraggingThumbnail 函数
const stopDraggingItem = () => {
  if (draggingItem.value) {
    const { id, type } = draggingItem.value
    const item = whiteboardItems.value.find((item) => item.id === id)
    if (item) {
      // 保存项目的新位置到数据库
      whiteboardStore.updateWhiteboardItemPosition(
        whiteboardId,
        id,
        item.position.x,
        item.position.y
      )
    }
  }
  draggingItem.value = null
  alignmentGuides.value = [] // 清除对齐辅助线
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
}

// 更新白板位置
const updateItemPosition = (id: string, x: number, y: number) => {
  const item = whiteboardItems.value.find((item) => item.id === id)
  if (item) {
    item.position = { x, y }
  }
}

// 组件卸载时移除事件监听器
// onUnmounted(() => {
//   window.removeEventListener('mousemove', handleMouseMove)
//   window.removeEventListener('mouseup', handleMouseUp)
// })
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mousemove', onDragItem)
  document.removeEventListener('mouseup', stopDraggingItem)
})
</script>

<style scoped lang="scss">
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
  background-color: var(--color-bg-primary);
  overflow: hidden;
  cursor: default;
}

.whiteboard-content {
  position: absolute;
  width: 100%;
  height: 100%;
}

.whiteboard-item {
  position: absolute; /* 确保项目是绝对定位的 */
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
