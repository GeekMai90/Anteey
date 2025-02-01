<template>
  <div class="mindboard-container">
    <!-- 左侧工具条 -->
    <ToolbarLeft @toggleBackground="toggleBackground" />

    <!-- 固定在顶部的工具栏 -->
    <div class="fixed-header">
      <AppToolbar
        backgroundColor="var(--color-bg-whiteboard)"
        :whiteboardName="mindboardName"
        :showBackButton="false"
        :showForwardButton="false"
        :showRefreshButton="false"
        @update:whiteboardName="updateMindboardName"
      />
    </div>
    <VueFlow
      fit-view-on-init
      :connection-radius="30"
      :nodes="nodes"
      :edges="edges"
      :default-edge-options="defaultEdgeOptions"
      :connection-mode="ConnectionMode.Loose"
      :connect-on-click="false"
      :connectable="true"
      :pan-on-drag="[0, 2]"
      :pan-on-scroll="true"
      :zoom-on-scroll="false"
      :zoom-on-pinch="true"
      :selection-key-code="'Shift'"
      :multi-selection-key="'Shift'"
      :selection-on-drag="true"
      :select-nodes-on-drag="true"
      :nodes-selection-active="true"
      :selectable="true"
      :nodes-draggable="true"
      :snap-to-lines="true"
      :snap-to-grid="true"
      :snap-to-grid-size="10"
      :snap-to-grid-offset="10"
      :zoom-on-double-click="false"
      class="vue-flow-instance"
      @connect="onConnect"
      @nodesChange="onNodesChange"
      @edgesChange="onEdgesChange"
      @nodeClick="onNodeClick"
      @nodeDrag="onNodeDrag"
      @node-drag-start="onNodeDragStart"
      @node-drag-stop="onNodeDragStop"
      @edge-double-click="handleEdgeDoubleClick"
      @edge-click="onEdgeClick"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @edge-update="onEdgeUpdate"
      @edge-update-start="onEdgeUpdateStart"
      @edge-update-end="onEdgeUpdateEnd"
      @selection-change="onSelectionChange"
      @pane-click="onPaneClick"
    >
      <Background :variant="backgroundVariant" :gap="20" :size="1" />
      <Controls />
      <MiniMap />

      <!-- 注册文本卡片节点 -->
      <template #node-text="nodeProps">
        <TextNode v-bind="nodeProps" :note-id="currentNoteId" @update="onNodeUpdate" />
      </template>

      <!-- 注册笔记卡片节点 -->
      <template #node-card="nodeProps">
        <CardNode v-bind="nodeProps" />
      </template>

      <!-- 注册图片节点 -->
      <template #node-image="nodeProps">
        <ImageNode v-bind="nodeProps" />
      </template>

      <!-- 注册便签节点组件 -->
      <template #node-memo="nodeProps">
        <MemoNode v-bind="nodeProps" :note-id="currentNoteId" @update="onNodeUpdate" />
      </template>

      <!-- 注册自定义边组件 -->
      <template #edge-custom="edgeProps">
        <CustomEdge v-bind="edgeProps" />
      </template>

      <!-- 添加边标签编辑器 -->
      <div v-if="showEdgeLabelEditor" class="edge-label-editor" :style="edgeLabelEditorStyle">
        <input
          ref="labelInputRef"
          v-model="editingLabel"
          placeholder="输入标签"
          type="text"
          @keyup.enter="saveEdgeLabel"
          @blur="saveEdgeLabel"
          @keyup.esc="cancelEditing"
        />
      </div>

      <!-- 拖拽时的背景提示 -->
      <div class="drag-overlay" :class="{ active: isDragOver }">
        <p>拖放到任意处添加卡片</p>
      </div>

      <!-- 底部工具栏 -->
      <div class="bottom-toolbar">
        <div class="tool-buttons">
          <!-- 文本节点按钮 -->
          <div
            v-tooltip.top="{ content: '拖拽添加文字卡片', delay: { show: 1000 } }"
            class="tool-button"
            draggable="true"
            @dragstart="handleTextDragStart"
          >
            <FileText theme="outline" size="18" :stroke-width="3" />
          </div>

          <!-- 便签节点按钮 -->
          <div
            v-tooltip.top="{ content: '拖拽添加便签卡片', delay: { show: 1000 } }"
            class="tool-button"
            draggable="true"
            @dragstart="handleMemoDragStart"
          >
            <Bookmark theme="outline" size="18" :stroke-width="3" />
          </div>
          <div
            v-tooltip.top="{ content: '拖拽添加笔记卡片', delay: { show: 1000 } }"
            class="tool-button"
            draggable="true"
            @dragstart="handleCardDragStart"
          >
            <Notes theme="outline" size="18" :stroke-width="3" />
          </div>
          <div
            v-tooltip.top="{ content: '拖拽添加图片卡片', delay: { show: 1000 } }"
            class="tool-button"
            draggable="true"
            @dragstart="handleImageDragStart"
          >
            <PictureOne theme="outline" size="18" :stroke-width="3" />
          </div>
        </div>
      </div>

      <!-- 添加选中工具栏 -->
      <div v-if="selectedNodes.length > 1" class="selection-toolbar">
        <button @click="createGroup">创建分组</button>
      </div>

      <!-- 注册分组节点 -->
      <template #node-group="nodeProps">
        <GroupNode v-bind="nodeProps" />
      </template>
    </VueFlow>

    <EdgeContextMenu
      ref="edgeContextMenuRef"
      :show="showEdgeMenu"
      :position="edgeMenuPosition"
      @delete="handleEdgeDelete"
      @edit="handleEdgeEdit"
      @updateStyle="handleEdgeStyleUpdate"
      @toggleAnimation="handleEdgeAnimationToggle"
      @updateMarker="handleMarkerUpdate"
      @updateColor="handleColorUpdate"
    />

    <!-- 添加搜索模态框组件 -->
    <MindboardSearchModal ref="searchModalRef" @select-note="handleNoteSelected" />

    <!-- 添加图片上传模态框 -->
    <ImageUploadModal ref="imageUploadModalRef" @confirm="handleImageConfirm" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, ConnectionMode, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import TextNode from './nodes/TextNode.vue'
import CardNode from './nodes/CardNode.vue'
import ImageNode from './nodes/ImageNode.vue'
import CustomEdge from './custom/CustomEdge.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { v4 as uuidv4 } from 'uuid'
import useDragAndDrop from './composables/useDragAndDrop'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import EdgeContextMenu from './custom/EdgeContextMenu.vue'
import { FileText, PictureOne, Notes, Bookmark } from '@icon-park/vue-next'
import ToolbarLeft from './custom/ToolbarLeft.vue'
import MindboardSearchModal from './MindboardSearchModal.vue'
import ImageUploadModal from '@renderer/components/whiteboard/ImageUploadModal.vue'
import { message } from '@renderer/utils/message'
import MemoNode from './nodes/MemoNode.vue'
import GroupNode from './nodes/GroupNode.vue'

const route = useRoute()
const mindboardStore = useMindboardStore()
const currentMindboard = computed(() => mindboardStore.currentMindboard)
const mindboardName = ref('')

// 当前笔记ID
const currentNoteId = ref('')

const nodes = ref([])
const edges = ref([])

// 设置默认边的样式
const defaultEdgeOptions = {
  type: 'custom',
  selected: false,
  animated: false,
  updatable: true
}

// 初始化 VueFlow
const {
  addEdges,
  toObject,
  fromObject,
  getViewport,
  applyNodeChanges,
  applyEdgeChanges,
  findEdge,
  updateEdge,
  removeEdges,
  addNodes,
  getIntersectingNodes,
  findNode,
  screenToFlowCoordinate
} = useVueFlow()

// 边标签编辑相关的状态
const showEdgeLabelEditor = ref(false)
const editingLabel = ref('')
const editingEdgeId = ref(null)
const edgeLabelEditorStyle = ref({})
const labelInputRef = ref(null)

const { isDragOver, draggedType, dropPosition, onDragOver, onDragLeave, onDrop, createImageNode } =
  useDragAndDrop()

// 添加边菜单相关的状态
const showEdgeMenu = ref(false)
const edgeMenuPosition = ref({ x: 0, y: 0 })
const selectedEdgeId = ref(null)

//处理边上下文菜单
const edgeContextMenuRef = ref(null)

// 背景样式状态
const backgroundVariant = ref('dots')

// 搜索模态框引用
const searchModalRef = ref(null)

// 图片上传模态框引用
const imageUploadModalRef = ref(null)

// 选择菜单状态
const selectedNodes = computed(() => nodes.value.filter((node) => node.selected))

// 在 script setup 中添加状态变量
const initialMouseOffset = ref({ x: 0, y: 0 })
const originalPosition = ref({ x: 0, y: 0 })
const parentPosition = ref({ x: 0, y: 0 })
const isInitialMove = ref(false)

// 切换背景样式
const toggleBackground = () => {
  // 循环切换背景样式
  const variants = ['dots', 'lines', 'cross']
  const currentIndex = variants.indexOf(backgroundVariant.value)
  const nextIndex = (currentIndex + 1) % variants.length
  backgroundVariant.value = variants[nextIndex]

  // 保存状态
  saveFlowState()
}

// 修改 saveFlowState 函数，保存背景样式
const saveFlowState = async () => {
  if (!currentMindboard.value) return

  const flow = toObject()
  await mindboardStore.updateMindboard(currentMindboard.value.id, {
    flow_data: {
      ...flow,
      backgroundVariant: backgroundVariant.value
    }
  })
}

// 修改 restoreFlowState 函数，恢复背景样式
const restoreFlowState = () => {
  fromObject(currentMindboard.value?.flow_data)
  mindboardName.value = currentMindboard.value?.name
  // 恢复背景样式
  if (currentMindboard.value?.flow_data?.backgroundVariant) {
    backgroundVariant.value = currentMindboard.value.flow_data.backgroundVariant
  }
}

// 更新思维板名称
const updateMindboardName = async (newName) => {
  await mindboardStore.updateMindboardName(currentMindboard.value.id, newName)
  mindboardName.value = newName
}

function onEdgeUpdateStart(edge) {
  console.log('start update', edge)
}

function onEdgeUpdateEnd(edge) {
  console.log('end update', edge)
}

function onEdgeUpdate({ edge, connection }) {
  updateEdge(edge, connection)
}
// 节点更新处理
const onNodeUpdate = ({ id, content }) => {
  const node = nodes.value.find((n) => n.id === id)
  if (node) {
    node.data.content = content
  }
  saveFlowState() // 保存状态
}

// 节点点击处理
const onNodeClick = (nodeDragEvent) => {
  console.log('Node clicked:', nodeDragEvent)
}

// 连线处理
const onConnect = async (connection) => {
  const newEdge = {
    id: `edge-${uuidv4()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: 'custom', // 始终使用我们的自定义边
    animated: false,
    selected: false,
    updatable: true
  }
  addEdges([newEdge])
  await saveFlowState()
}

// 边点击处理
const onEdgeClick = (event) => {
  // 阻止事件冒泡
  event.event.preventDefault()
  event.event.stopPropagation()

  const { edge, event: mouseEvent } = event

  // 设置选中的边
  selectedEdgeId.value = edge.id

  // 计算菜单位置
  edgeMenuPosition.value = {
    x: mouseEvent.clientX - 350,
    y: mouseEvent.clientY - 100
  }

  // 显示菜单
  showEdgeMenu.value = true
}

// 节点变化处理
const onNodesChange = (changes) => {
  console.log('nodes changed', changes)
  const updatedNodes = applyNodeChanges(changes)
  nodes.value = [...updatedNodes]
  saveFlowState()
}

// 边变化处理
const onEdgesChange = (changes) => {
  console.log('edges changed', changes)
  edges.value = applyEdgeChanges(changes)
  saveFlowState()
}

// 拖拽结束处理
const onNodeDragStop = (NodeDragEvent) => {
  console.log('onNodeDragStop', NodeDragEvent)
  saveFlowState()
}

// 处理边编辑
const handleEdgeEdit = () => {
  if (selectedEdgeId.value) {
    const edge = findEdge(selectedEdgeId.value)
    if (!edge) {
      console.warn('Edge not found')
      return
    }

    // 计算标签编辑器的位置 - 使用边的中点
    const midX = (edge.sourceX + edge.targetX) / 2
    const midY = (edge.sourceY + edge.targetY) / 2

    // 获取容器的位置
    const container = document.querySelector('.vue-flow')
    if (!container) {
      console.warn('Vue Flow container not found')
      return
    }

    const containerRect = container.getBoundingClientRect()
    const { x: viewportX, y: viewportY, zoom } = getViewport()

    // 计算编辑器位置，考虑视口变换
    edgeLabelEditorStyle.value = {
      position: 'absolute',
      left: `${midX * zoom + viewportX - containerRect.left}px`,
      top: `${midY * zoom + viewportY - containerRect.top}px`,
      transform: 'translate(120%, 120%)',
      zIndex: 1000
    }

    editingEdgeId.value = edge.id
    editingLabel.value = edge.label || ''
    showEdgeLabelEditor.value = true
    closeEdgeMenu() // 关闭菜单

    // 等待 DOM 更新后聚焦输入框
    setTimeout(() => {
      labelInputRef.value?.focus()
    }, 0)
  }
}

// 处理边的双击事件
const handleEdgeDoubleClick = ({ edge, event }) => {
  // 阻止事件冒泡
  event.preventDefault()
  event.stopPropagation()

  if (!edge) {
    console.warn('Edge not found')
    return
  }

  // 计算标签编辑器的位置 - 使用边的中点
  const midX = (edge.sourceX + edge.targetX) / 2
  const midY = (edge.sourceY + edge.targetY) / 2

  // 获取容器的位置
  const container = document.querySelector('.vue-flow')
  if (!container) {
    console.warn('Vue Flow container not found')
    return
  }

  const containerRect = container.getBoundingClientRect()
  const { x: viewportX, y: viewportY, zoom } = getViewport()

  // 计算编辑器位置，考虑视口变换
  edgeLabelEditorStyle.value = {
    position: 'absolute',
    left: `${midX * zoom + viewportX - containerRect.left}px`,
    top: `${midY * zoom + viewportY - containerRect.top}px`,
    transform: 'translate(120%, 85%)',
    zIndex: 1000
  }

  editingEdgeId.value = edge.id
  editingLabel.value = edge.label || ''
  showEdgeLabelEditor.value = true

  // 等待 DOM 更新后聚焦输入框
  setTimeout(() => {
    labelInputRef.value?.focus()
  }, 0)
}

// 保存边标签
const saveEdgeLabel = () => {
  if (editingEdgeId.value) {
    const edge = findEdge(editingEdgeId.value)
    if (edge) {
      // 直接修改边的 label
      edge.label = editingLabel.value
    }
  }
  showEdgeLabelEditor.value = false
  editingEdgeId.value = null
  editingLabel.value = ''
  saveFlowState() // 保存状态
}

// 取消编辑
const cancelEditing = () => {
  showEdgeLabelEditor.value = false
  editingEdgeId.value = null
  editingLabel.value = ''
}

// 添加点击其他地方关闭菜单的处理
const closeEdgeMenu = () => {
  showEdgeMenu.value = false
  selectedEdgeId.value = null
  edgeContextMenuRef.value?.closeStyleMenu()
}

// 处理边删除
const handleEdgeDelete = () => {
  if (selectedEdgeId.value) {
    removeEdges([selectedEdgeId.value])
    closeEdgeMenu()
    saveFlowState() // 保存状态
  }
}

// 处理边样式更新
const handleEdgeStyleUpdate = (styleType) => {
  if (selectedEdgeId.value) {
    const edge = findEdge(selectedEdgeId.value)
    if (edge) {
      // 更新边的类型,但保持使用自定义边组件
      edge.type = 'custom'
      // 将样式类型存储在边的数据中
      edge.data = { ...edge.data, styleType: styleType }
      // 保存状态
      saveFlowState()
    }
    // 关闭菜单
    closeEdgeMenu()
  }
}

// 处理边动画切换
const handleEdgeAnimationToggle = () => {
  if (selectedEdgeId.value) {
    const edge = findEdge(selectedEdgeId.value)
    if (edge) {
      // 切换动画状态
      edge.animated = !edge.animated
      // 保存状态
      saveFlowState()
    }
    // 关闭菜单
    closeEdgeMenu()
  }
}

// 处理标记样式更新
const handleMarkerUpdate = (markerType) => {
  if (selectedEdgeId.value) {
    const edge = findEdge(selectedEdgeId.value)
    if (edge) {
      // 更新边的标记样式
      edge.data = {
        ...edge.data,
        markerType: markerType
      }
      // 保存状态
      saveFlowState()
    }
    // 关闭菜单
    closeEdgeMenu()
  }
}

// 处理边颜色更新
const handleColorUpdate = (colorValue) => {
  if (selectedEdgeId.value) {
    const edge = findEdge(selectedEdgeId.value)
    if (edge) {
      // 更新边的颜色
      edge.data = {
        ...edge.data,
        color: colorValue
      }
      // 保存状态
      saveFlowState()
    }
    // 关闭菜单
    closeEdgeMenu()
  }
}

// 处理笔记卡片拖拽开始
const handleCardDragStart = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', 'card')
    event.dataTransfer.effectAllowed = 'move'
    draggedType.value = 'card'
    isDragOver.value = false
  }
}

// 监听拖拽位置变化
watch(dropPosition, (position) => {
  if (position) {
    // 根据拖拽类型决定显示哪个模态框
    if (draggedType.value === 'card') {
      // 如果是笔记卡片,显示笔记搜索框
      searchModalRef.value?.show()
    } else if (draggedType.value === 'image') {
      // 如果是图片卡片,显示图片上传框
      imageUploadModalRef.value?.show()
    }
    // 重置拖拽类型
    draggedType.value = null
  }
})

// 处理笔记选择
const handleNoteSelected = (noteId) => {
  if (dropPosition.value) {
    // 在拖拽的位置创建节点
    createCardNode(noteId, dropPosition.value)
    // 重置拖拽位置
    dropPosition.value = null
  }
}

// 创建卡片节点函数
const createCardNode = (noteId, position) => {
  const newNode = {
    id: `card-${uuidv4()}`,
    type: 'card',
    position,
    data: {
      noteId,
      toolbarPosition: 'top',
      width: 250,
      height: 300, // 确保与组件中的最小高度一致
      backgroundColor: 'transparent',
      borderColor: 'var(--color-border)'
    }
  }
  addNodes([newNode])
  saveFlowState()
}

// 处理图片上传确认
const handleImageConfirm = async (imageData) => {
  try {
    if (dropPosition.value) {
      // 如果有拖放位置，在拖放位置创建节点
      createImageNode(imageData.url, dropPosition.value)
      // 重置拖拽位置
      dropPosition.value = null
    } else {
      // 如果没有拖放位置，在画布中心创建节点
      const center = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
      createImageNode(imageData.url, center)
    }
  } catch (error) {
    console.error('创建图片节点失败:', error)
    message.error('创建图片节点失败')
  }
}

// 在 script 部分添加事件处理函数
const handleTextDragStart = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', 'text')
    event.dataTransfer.effectAllowed = 'move'
    draggedType.value = 'text'
    isDragOver.value = false
  }
}

const handleMemoDragStart = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', 'memo')
    event.dataTransfer.effectAllowed = 'move'
    draggedType.value = 'memo'
    isDragOver.value = false
  }
}

const handleImageDragStart = (event) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', 'image')
    event.dataTransfer.effectAllowed = 'move'
    draggedType.value = 'image'
    isDragOver.value = false
  }
}

// 修改选择处理函数
const onSelectionChange = ({ nodes: selectedNodesList }) => {
  console.log('Selection changed:', selectedNodesList)
}

// 创建分组

const createGroup = async () => {
  await nextTick()

  // 修改选择框的选择器
  const selectionElement = document.querySelector('.vue-flow__nodesselection-rect')

  if (!selectionElement || selectedNodes.value.length < 2) {
    console.log('No selection or less than 2 nodes selected')
    message.warning('请至少选择两个节点')
    return
  }

  // 获取 Vue Flow 容器元素
  const flowElement = document.querySelector('.vue-flow')
  if (!flowElement) {
    console.log('Flow element not found')
    return
  }

  // 直接从 style 属性获取位置和尺寸
  const width = parseFloat(selectionElement.style.width)
  const height = parseFloat(selectionElement.style.height)
  const top = parseFloat(selectionElement.style.top)
  const left = parseFloat(selectionElement.style.left)

  console.log('Selection style:', {
    width,
    height,
    top,
    left
  })

  const padding = 40
  const groupNode = {
    id: `group-${uuidv4()}`,
    type: 'group',
    position: {
      x: left - padding / 2,
      y: top - padding / 2
    },
    style: {
      width: `${width + padding}px`, // 添加 px 单位
      height: `${height + padding}px` // 添加 px 单位
    },
    data: {
      label: '新建分组',
      childNodes: [],
      width: width + padding,
      height: height + padding,
      backgroundColor: 'rgba(147, 197, 253, 0.3)'
    }
  }

  // 更新选中节点的位置和父节点
  selectedNodes.value.forEach((node) => {
    const relativeX = node.position.x - left + padding / 2
    const relativeY = node.position.y - top + padding / 2

    node.position = {
      x: relativeX,
      y: relativeY
    }

    node.parentNode = groupNode.id
    groupNode.data.childNodes.push(node.id)
  })

  console.log('Created group node:', groupNode)

  addNodes([groupNode])
  saveFlowState()
}

// 添加节点拖动开始处理函数
const onNodeDragStart = ({ event, node }) => {
  const parentNode = node.parentNode ? findNode(node.parentNode) : null
  originalPosition.value = { ...node.position }
  parentPosition.value = parentNode ? parentNode.position : { x: 0, y: 0 }
  isInitialMove.value = true

  // 将屏幕坐标转换为画布坐标
  const flowCoords = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })

  if (parentNode) {
    // 计算节点在父节点内的初始偏移量
    initialMouseOffset.value = {
      x: originalPosition.value.x + parentPosition.value.x - flowCoords.x,
      y: originalPosition.value.y + parentPosition.value.y - flowCoords.y
    }
  } else {
    // 对于没有父节点的节点，计算绝对偏移量
    initialMouseOffset.value = {
      x: originalPosition.value.x - flowCoords.x,
      y: originalPosition.value.y - flowCoords.y
    }
  }
}

// 修改节点拖动处理函数
const onNodeDrag = ({ node: draggedNode, event }) => {
  if (draggedNode.type === 'group') return

  const intersections = getIntersectingNodes(draggedNode)
  const intersectingParentNode = intersections.find((node) => node.type === 'group')

  // 将屏幕坐标转换为画布坐标
  const flowCoords = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })

  if (intersectingParentNode) {
    // 如果与分组节点相交，计算相对位置
    const parentNodePos = intersectingParentNode.position
    draggedNode.parentNode = intersectingParentNode.id
    draggedNode.position = {
      x: flowCoords.x + initialMouseOffset.value.x - parentNodePos.x,
      y: flowCoords.y + initialMouseOffset.value.y - parentNodePos.y
    }

    // 更新分组的子节点列表
    if (!intersectingParentNode.data.childNodes.includes(draggedNode.id)) {
      intersectingParentNode.data.childNodes.push(draggedNode.id)
    }
  } else {
    // 如果没有相交的分组节点，重置为绝对位置
    if (draggedNode.parentNode) {
      const oldParent = findNode(draggedNode.parentNode)
      if (oldParent) {
        oldParent.data.childNodes = oldParent.data.childNodes.filter((id) => id !== draggedNode.id)
      }
    }

    draggedNode.parentNode = undefined
    draggedNode.position = {
      x: flowCoords.x + initialMouseOffset.value.x,
      y: flowCoords.y + initialMouseOffset.value.y
    }
  }

  isInitialMove.value = false
  saveFlowState()
}

// 在 VueFlow 组件上添加 paneClick 事件处理
const onPaneClick = () => {
  // 实现分组逻辑
}

// 计算分组边界
// const calculateGroupBounds = (nodes) => {
//   const positions = nodes.map((node) => ({
//     x: node.position.x,
//     y: node.position.y,
//     width: node.width || 200,
//     height: node.height || 100
//   }))

//   const minX = Math.min(...positions.map((p) => p.x))
//   const minY = Math.min(...positions.map((p) => p.y))
//   const maxX = Math.max(...positions.map((p) => p.x + p.width))
//   const maxY = Math.max(...positions.map((p) => p.y + p.height))

//   return {
//     x: minX - 20,
//     y: minY - 20,
//     width: maxX - minX,
//     height: maxY - minY
//   }
// }

// 初始化数据
onMounted(async () => {
  const mindboardId = route.params.id
  await mindboardStore.loadMindboardData(mindboardId)
  restoreFlowState()

  document.addEventListener('click', (event) => {
    // 如果点击的不是边菜单内部和子菜单内部，则关闭菜单
    if (!event.target.closest('.edge-context-menu') && !event.target.closest('.style-submenu')) {
      closeEdgeMenu()
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})
</script>

<style lang="scss" scoped>
.mindboard-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.mindboard-tools {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 4;
  display: flex;
  gap: 8px;

  button {
    padding: 8px 16px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background: var(--color-hover-button);
    }
  }
}

.edge-label-editor {
  position: absolute;
  z-index: 1000;
  transform: translate(-50%, -50%);

  input {
    width: 150px;
    height: 30px;
    padding: 4px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-primary);
    color: var(--color-text);
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
    }
  }
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(67, 97, 238, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;

  &.active {
    opacity: 1;
  }

  p {
    padding: 16px 24px;
    background: var(--color-bg-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-card);
    color: var(--color-primary);
  }
}

.bottom-toolbar {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  box-shadow: var(--shadow-card);

  .tool-buttons {
    display: flex;
    gap: 6px;

    .tool-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px;
      border-radius: 6px;
      cursor: grab;
      user-select: none;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--color-hover-button);
        transform: translateY(-4px);

        :deep(.i-icon) {
          color: var(--color-primary);
        }
      }

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--color-text-secondary);
      }

      :deep(svg) {
        width: 22px;
        height: 22px;
      }

      .icon {
        font-size: 24px;
      }

      .label {
        font-size: 12px;
        color: var(--color-text);
      }
    }
  }
}

:deep(.vue-flow-instance) {
  .vue-flow__selection {
    background: rgba(var(--color-primary-rgb), 0.08);
    border: 1px solid rgba(var(--color-primary-rgb), 0.4);
    border-radius: 4px;
  }
}

.selection-toolbar {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  box-shadow: var(--shadow-card);

  button {
    padding: 8px 16px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background: var(--color-hover-button);
    }
  }
}
</style>
