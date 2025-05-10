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

  // 添加明确的日志来显示当前选中的节点
  console.log(
    '拖拽手柄选中节点类型:',
    currentHoveredNode.value.type.name,
    '位置:',
    currentNodePos.value
  )

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
    const { state } = props.editor
    // const { tr } = state
    const nodeType = currentHoveredNode.value.type.name

    console.log('当前处理的节点类型:', nodeType, '位置:', currentNodePos.value)

    // 使用更安全的方法：直接在编辑器状态中查找节点
    const node = state.doc.nodeAt(currentNodePos.value)
    if (!node) {
      console.error('无法在指定位置找到节点')
      return
    }

    // 计算节点结束位置
    const nodeEndPos = currentNodePos.value + node.nodeSize

    // 检查位置是否在文档范围内
    if (nodeEndPos > state.doc.content.size) {
      console.error('计算的位置超出文档范围')
      return
    }

    console.log('节点结束位置:', nodeEndPos, '文档大小:', state.doc.content.size)

    // 使用更简单、更安全的方法插入段落
    props.editor.chain().insertContentAt(nodeEndPos, { type: 'paragraph' }).run()

    // 尝试将光标移动到新创建的段落
    setTimeout(() => {
      props.editor.commands.focus(nodeEndPos + 1)
    }, 0)

    console.log(`已在${nodeType}节点后添加新段落`)
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
    console.log('执行删除操作，当前段落类型:', currentParagraph.value.type.name)

    // 直接使用currentNodePos和currentHoveredNode（由拖拽手柄设置的节点）
    if (currentHoveredNode.value && currentNodePos.value !== -1) {
      // 获取要删除的节点类型和位置
      const hoveredNodeType = currentHoveredNode.value.type.name
      const nodeStart = currentNodePos.value
      const nodeEnd = nodeStart + currentHoveredNode.value.nodeSize

      console.log('删除当前选中节点:', hoveredNodeType, '从', nodeStart, '到', nodeEnd)

      // 特殊处理图片类型节点，需要删除源文件
      if (hoveredNodeType === 'image') {
        try {
          // 获取图片URL
          const imageUrl = currentHoveredNode.value.attrs.src
          // 尝试删除图片文件
          window.electronAPI.image
            .deleteImage(imageUrl)
            .then(() => {
              console.log('图片源文件已删除:', imageUrl)
            })
            .catch((err) => {
              console.error('删除图片源文件失败:', err)
            })
        } catch (error) {
          console.error('获取图片URL失败:', error)
        }
      }

      // 直接删除该节点
      props.editor.chain().focus().deleteRange({ from: nodeStart, to: nodeEnd }).run()

      showContextMenu.value = false
      currentParagraph.value = null
      return
    }

    // 如果没有明确的悬停节点位置，则回退到其他方法
    const { state } = props.editor
    const { selection } = state
    const { from } = selection
    const $pos = state.doc.resolve(from)
    const currentNode = $pos.node()
    const nodeType = currentNode?.type.name

    console.log('回退方案 - 当前节点类型:', nodeType, '位置:', from)

    // 特殊处理图片类型节点，需要删除源文件
    if (nodeType === 'image') {
      try {
        // 获取图片URL
        const imageUrl = currentNode.attrs.src
        // 尝试删除图片文件
        window.electronAPI.image
          .deleteImage(imageUrl)
          .then(() => {
            console.log('图片源文件已删除:', imageUrl)
          })
          .catch((err) => {
            console.error('删除图片源文件失败:', err)
          })
      } catch (error) {
        console.error('获取图片URL失败:', error)
      }
    }

    // 检查是否是顶级文档节点
    if (nodeType === 'doc') {
      // 尝试从DOM选择中找到实际选中的元素
      const domSelection = window.getSelection()
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0)
        const container = range.commonAncestorContainer

        // 查找最近的特殊元素
        let specialElement = null
        let currentElement = container.nodeType === 1 ? container : container.parentElement

        while (currentElement && !specialElement) {
          // 检查当前元素是否包含iframe、details或图片
          if (
            currentElement.tagName === 'IFRAME' ||
            currentElement.tagName === 'DETAILS' ||
            currentElement.tagName === 'IMG' ||
            currentElement.classList?.contains('iframe-container') ||
            currentElement.classList?.contains('tiptap-iframe-wrapper') ||
            currentElement.classList?.contains('tiptap-image-wrapper') ||
            currentElement.classList?.contains('details') ||
            currentElement.classList?.contains('callout')
          ) {
            specialElement = currentElement
          } else {
            // 检查子元素
            const specialElements = currentElement.querySelectorAll(
              'iframe, .details, .callout, img, .tiptap-image-wrapper'
            )
            if (specialElements.length > 0) {
              specialElement = specialElements[0]
            }
          }
          currentElement = currentElement.parentElement
        }

        if (specialElement) {
          // 检查是否为图片元素
          if (
            specialElement.tagName === 'IMG' ||
            specialElement.classList?.contains('tiptap-image-wrapper')
          ) {
            // 尝试在DOM中查找图片URL
            const imgElement =
              specialElement.tagName === 'IMG'
                ? specialElement
                : specialElement.querySelector('img')
            if (imgElement && imgElement.src) {
              // 尝试删除图片文件
              window.electronAPI.image
                .deleteImage(imgElement.src)
                .then(() => {
                  console.log('通过DOM元素删除图片源文件:', imgElement.src)
                })
                .catch((err) => {
                  console.error('删除图片源文件失败:', err)
                })
            }
          }

          // 找到特殊元素，尝试删除
          console.log('通过DOM元素找到节点:', specialElement.tagName)
          props.editor.chain().focus().deleteSelection().run()
          showContextMenu.value = false
          currentParagraph.value = null
          return
        }
      }

      // 最后尝试通过扫描附近位置找到节点
      console.log('尝试扫描附近位置查找节点')
      // 使用更小的范围避免删除错误的节点
      const tempPosStart = Math.max(0, from - 20)
      const tempPosEnd = Math.min(state.doc.content.size, from + 20)

      // 遍历范围内的所有位置
      for (let pos = tempPosStart; pos < tempPosEnd; pos++) {
        try {
          const node = state.doc.nodeAt(pos)
          if (
            node &&
            (node.type.name === 'iframe' ||
              node.type.name === 'details' ||
              node.type.name === 'image')
          ) {
            // 特殊处理图片类型节点，需要删除源文件
            if (node.type.name === 'image') {
              try {
                // 获取图片URL
                const imageUrl = node.attrs.src
                // 尝试删除图片文件
                window.electronAPI.image
                  .deleteImage(imageUrl)
                  .then(() => {
                    console.log('图片源文件已删除(通过扫描):', imageUrl)
                  })
                  .catch((err) => {
                    console.error('删除图片源文件失败:', err)
                  })
              } catch (error) {
                console.error('获取图片URL失败:', error)
              }
            }

            // 找到需删除节点的起始位置
            const nodeStart = pos
            const nodeEnd = pos + node.nodeSize

            console.log('扫描找到特殊节点:', node.type.name, nodeStart, nodeEnd)
            props.editor.chain().focus().deleteRange({ from: nodeStart, to: nodeEnd }).run()
            showContextMenu.value = false
            currentParagraph.value = null
            return
          }
        } catch (e) {
          continue
        }
      }
    }

    // 其他类型节点的处理
    const isImage = nodeType === 'image'
    const isIframe = nodeType === 'iframe'
    const isDetails = nodeType === 'details'

    // 针对特殊节点类型的处理
    if (isImage || isIframe || isDetails) {
      // 使用deleteRange删除整个节点
      const start = $pos.before()
      const end = $pos.after()
      console.log('删除特殊节点:', nodeType, start, end)
      props.editor.chain().focus().deleteRange({ from: start, to: end }).run()
      showContextMenu.value = false
      currentParagraph.value = null
      return
    }

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
          console.log('删除表格节点:', start, end)
          props.editor.chain().focus().deleteRange({ from: start, to: end }).run()
          break
        }
        depth--
      }
    } else {
      // 其他节点的处理
      console.log('使用标准删除命令删除节点:', nodeType)
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
            case 'image':
              return commands.deleteNode('image')
            case 'iframe':
              return commands.deleteNode('iframe')
            case 'details':
              return commands.deleteNode('details')
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
