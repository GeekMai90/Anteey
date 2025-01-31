<template>
  <div class="mindboard-container">
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
      <Background />
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
          <div class="tool-button" draggable="true" @dragstart="onDragStart($event, 'text')">
            <span class="icon">📝</span>
            <span class="label">文字卡片</span>
          </div>
          <div class="tool-button">
            <span class="icon">🔗</span>
            <span class="label">连接</span>
          </div>
          <div class="tool-button">
            <span class="icon">📌</span>
            <span class="label">标记</span>
          </div>
        </div>
      </div>
    </VueFlow>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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
  updateEdge
} = useVueFlow()

// 边标签编辑相关的状态
const showEdgeLabelEditor = ref(false)
const editingLabel = ref('')
const editingEdgeId = ref(null)
const edgeLabelEditorStyle = ref({})
const labelInputRef = ref(null)

const { onDragStart, onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

// 保存思维板状态
const saveFlowState = async () => {
  if (!currentMindboard.value) return

  const flow = toObject()
  await mindboardStore.updateMindboard(currentMindboard.value.id, {
    flow_data: flow
  })
}

// 恢复思维板状态
const restoreFlowState = () => {
  // 恢复完整状态
  fromObject(currentMindboard.value?.flow_data)
  mindboardName.value = currentMindboard.value?.name
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
    type: 'custom',
    animated: false,
    selected: false,
    updatable: true
  }
  addEdges([newEdge])
  await saveFlowState()
}

// 边点击处理
const onEdgeClick = (edgeMouseEvent) => {
  console.log('Edge clicked:', edgeMouseEvent)
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

// 处理边的双击事件
const handleEdgeDoubleClick = ({ edge }) => {
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

  // 等待 DOM 更新后聚焦输入框
  setTimeout(() => {
    labelInputRef.value?.focus()
  }, 0)
  saveFlowState() // 保存状态
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

// 初始化数据
onMounted(async () => {
  const mindboardId = route.params.id
  await mindboardStore.loadMindboardData(mindboardId)
  restoreFlowState()
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
  bottom: 20px;
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
    gap: 12px;

    .tool-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: grab;
      user-select: none;
      transition: background-color 0.2s;

      &:hover {
        background: var(--color-hover);
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
