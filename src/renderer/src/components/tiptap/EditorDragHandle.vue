<template>
  <div class="editor-drag-handle-wrapper">
    <!-- 拖拽手柄 -->
    <drag-handle
      v-if="editor && enabled"
      :editor="editor"
      :tippy-options="{
        offset: [0, 8],
        placement: 'left-start',
        getReferenceClientRect: null
      }"
      @nodeChange="handleNodeChange"
    >
      <div class="drag-handle-container">
        <!-- 添加按钮 -->
        <div class="add-button" @click="handleAddParagraphClick">
          <Plus theme="outline" size="14" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <!-- 拖拽手柄 -->
        <div class="custom-drag-handle" @click="handleDragHandleClick">
          <Drag theme="outline" size="14" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </div>
    </drag-handle>

    <!-- 上下文菜单 -->
    <div
      v-if="showContextMenu"
      ref="contextMenuRef"
      class="context-menu"
      :style="contextMenuStyles"
    >
      <div class="context-menu-item" @click="clearFormatting">
        <div class="icon">
          <Format theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">清空格式</div>
      </div>
      <div class="context-menu-item" @click="clearStyle">
        <div class="icon">
          <ClearFormat
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">清空样式</div>
      </div>
      <div class="context-menu-item" @click="copyToClipboard">
        <div class="icon">
          <Copy theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">复制到剪贴板</div>
      </div>
      <div class="context-menu-item delete" @click="deleteParagraph">
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-danger)" :strokeWidth="3" />
        </div>
        <div class="name" style="color: var(--color-danger)">删除段落</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { DragHandle } from '@tiptap-pro/extension-drag-handle-vue-3'
import { useFloating } from '@floating-ui/vue'
import { offset, flip, shift } from '@floating-ui/dom'
import { Format, ClearFormat, Copy, Delete, Plus, Drag } from '@icon-park/vue-next'

// 定义组件属性
const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  }
})

// 上下文菜单状态
const showContextMenu = ref(false)
const currentParagraph = ref(null)
const contextMenuRef = ref(null)
const dragHandleRef = ref(null)
const currentHoveredNode = ref(null)
const currentNodePos = ref(-1)

// 创建上下文菜单floating实例
const { floatingStyles: contextMenuStyles, update: updateContextMenu } = useFloating(
  dragHandleRef,
  contextMenuRef,
  {
    placement: 'bottom-start',
    middleware: [
      offset({
        mainAxis: 6
        // crossAxis: -5 // 向左偏移一点，使菜单更靠近拖拽按钮
      }),
      flip(),
      shift()
    ]
  }
)

// 节点变化处理函数
const handleNodeChange = ({ node, pos }) => {
  if (!node || pos === -1) {
    currentHoveredNode.value = null
    currentNodePos.value = -1
    return
  }
  currentHoveredNode.value = node
  currentNodePos.value = pos
}

// 拖拽手柄点击处理
const handleDragHandleClick = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (!props.editor || !currentHoveredNode.value || currentNodePos.value === -1) {
    console.log('编辑器实例或节点未找到')
    return
  }

  // 设置节点选择
  props.editor.commands.setNodeSelection(currentNodePos.value)

  // 设置拖拽手柄按钮为触发元素
  dragHandleRef.value = event.currentTarget

  // 显示上下文菜单
  showContextMenu.value = true
  currentParagraph.value = currentHoveredNode.value

  // 在下一个DOM更新周期更新浮动菜单位置
  nextTick(() => {
    updateContextMenu()
  })
}

// 添加按钮点击处理
const handleAddParagraphClick = (event) => {
  event.preventDefault()
  event.stopPropagation()

  if (!props.editor || !currentHoveredNode.value || currentNodePos.value === -1) {
    console.log('编辑器实例或节点未找到')
    return
  }

  try {
    // 首先设置节点选择，确保正确的位置
    props.editor.commands.setNodeSelection(currentNodePos.value)

    // 计算当前节点的结束位置
    const nodeEnd = currentNodePos.value + currentHoveredNode.value.nodeSize

    // 在当前节点之后直接插入一个新段落
    props.editor
      .chain()
      .focus()
      .insertContentAt(nodeEnd, {
        type: 'paragraph',
        content: []
      })
      .focus(nodeEnd + 1)
      .run()
  } catch (error) {
    console.error('插入段落时出错:', error)
  }
}

// 关闭上下文菜单
const closeContextMenu = (event) => {
  if (showContextMenu.value && !event.target.closest('.context-menu')) {
    showContextMenu.value = false
  }
}

// 清空格式
const clearFormatting = () => {
  if (currentParagraph.value && props.editor) {
    props.editor.chain().focus().clearNodes().unsetAllMarks().setParagraph().run()
  }
  showContextMenu.value = false
}

// 清空样式
const clearStyle = () => {
  if (currentParagraph.value && props.editor) {
    props.editor.chain().focus().unsetAllMarks().run()
  }
  showContextMenu.value = false
}

// 复制到剪贴板
const copyToClipboard = () => {
  if (currentParagraph.value) {
    navigator.clipboard.writeText(currentParagraph.value.textContent)
  }
  showContextMenu.value = false
}

// 删除段落
const deleteParagraph = () => {
  if (!props.editor || !currentParagraph.value) {
    console.log('无法删除：编辑器或当前段落未定义')
    return
  }

  try {
    const { state } = props.editor
    const { selection } = state
    const { from } = selection
    const $pos = state.doc.resolve(from)
    const currentNode = $pos.node()
    const nodeType = currentNode?.type.name

    // 处理表格节点
    if (
      nodeType === 'table' ||
      nodeType === 'tableRow' ||
      nodeType === 'tableCell' ||
      nodeType === 'tableHeader'
    ) {
      let depth = $pos.depth
      while (depth > 0) {
        const node = $pos.node(depth)
        if (node.type.name === 'table') {
          const start = $pos.before(depth)
          const end = start + node.nodeSize

          props.editor.chain().focus().deleteRange({ from: start, to: end }).run()
          break
        }
        depth--
      }
    } else {
      // 其他节点的处理
      props.editor
        .chain()
        .focus()
        // 1. 清除所有标记和样式
        .unsetAllMarks()
        .clearNodes()
        // 2. 根据节点类型执行删除
        .command(({ commands }) => {
          switch (nodeType) {
            case 'bulletList':
              return commands.deleteNode('bulletList')
            case 'orderedList':
              return commands.deleteNode('orderedList')
            case 'taskList':
              return commands.deleteNode('taskList')
            case 'blockquote':
              return commands.deleteNode('blockquote')
            case 'heading':
              return commands.deleteNode('heading')
            default:
              return commands.deleteNode('paragraph')
          }
        })
        // 3. 如果需要，插入空段落
        .command(({ state, commands }) => {
          if (state.doc.content.size === 0) {
            return commands.insertContent({ type: 'paragraph' })
          }
          return true
        })
        .run()
    }
  } catch (error) {
    console.error('删除节点时出错:', error)
  }

  showContextMenu.value = false
  currentParagraph.value = null
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<style lang="scss" scoped>
.context-menu {
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 180px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
  max-width: 100vw; // 确保不超过视口宽度
  overflow-x: hidden; // 防止水平溢出
  align-items: center;
}

.context-menu-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  &:hover {
    background-color: var(--color-hover-button);
  }

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
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .i-icon {
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
  }

  .name {
    flex-grow: 1;
    text-align: left;
    line-height: 1;
    color: var(--color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    align-items: center;
    justify-content: center;
  }

  &.delete {
    color: var(--color-danger);
  }

  &:hover {
    background-color: var(--color-hover-button);
  }
}

/* 注意：拖拽手柄样式应该保留在_tiptap-editor.scss中，或者在这里复制相关样式 */
</style>
