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
      :selectable="true"
      :connectable="true"
      @connect="onConnect"
      @nodesChange="onNodesChange"
      @edgesChange="onEdgesChange"
      @nodeClick="onNodeClick"
      @nodeDragStop="onNodeDragStop"
      @edge-double-click="handleEdgeDoubleClick"
      @edge-click="onEdgeClick"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @edge-update="onEdgeUpdate"
      @edge-update-start="onEdgeUpdateStart"
      @edge-update-end="onEdgeUpdateEnd"
    >
      <Background :variant="backgroundVariant" :gap="20" :size="1" />
      <Controls />
      <MiniMap />

      <!-- 注册自定义节点 -->
      <template #node-text="nodeProps">
        <TextNode v-bind="nodeProps" :note-id="currentNoteId" @update="onNodeUpdate" />
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
          <div
            v-tooltip.top="{ content: '新建文字卡片', delay: { show: 1000 } }"
            class="tool-button"
            draggable="true"
            @dragstart="onDragStart($event, 'text')"
          >
            <FileText theme="outline" size="18" :stroke-width="3" />
          </div>
          <div
            v-tooltip.top="{ content: '新建笔记卡片', delay: { show: 1000 } }"
            class="tool-button"
          >
            <Notes theme="outline" size="18" :stroke-width="3" />
          </div>
          <div
            v-tooltip.top="{ content: '新建图片卡片', delay: { show: 1000 } }"
            class="tool-button"
          >
            <PictureOne theme="outline" size="18" :stroke-width="3" />
          </div>
        </div>
      </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, ConnectionMode, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { Controls } from '@vue-flow/controls'
import TextNode from './nodes/TextNode.vue'
import CustomEdge from './custom/CustomEdge.vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { v4 as uuidv4 } from 'uuid'
import useDragAndDrop from './composables/useDragAndDrop'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import EdgeContextMenu from './custom/EdgeContextMenu.vue'
import { FileText, PictureOne, Notes } from '@icon-park/vue-next'
import ToolbarLeft from './custom/ToolbarLeft.vue'

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
  removeEdges
} = useVueFlow()

// 边标签编辑相关的状态
const showEdgeLabelEditor = ref(false)
const editingLabel = ref('')
const editingEdgeId = ref(null)
const edgeLabelEditorStyle = ref({})
const labelInputRef = ref(null)

const { onDragStart, onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

// 添加边菜单相关的状态
const showEdgeMenu = ref(false)
const edgeMenuPosition = ref({ x: 0, y: 0 })
const selectedEdgeId = ref(null)

//处理边上下文菜单
const edgeContextMenuRef = ref(null)

// 背景样式状态
const backgroundVariant = ref('dots')

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
</style>
