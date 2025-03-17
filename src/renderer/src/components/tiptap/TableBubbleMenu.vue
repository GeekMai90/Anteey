<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{
      duration: 100,
      placement: 'top',
      offset: [0, 10]
    }"
    :should-show="shouldShow"
    class="table-bubble-menu"
  >
    <div class="menu-container">
      <button
        v-tooltip.top="{ content: '在上方插入行', delay: { show: 1000 } }"
        @click="editor.chain().focus().addRowBefore().run()"
      >
        <div class="icon top-icon">
          <LinkLeft theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '在下方插入行', delay: { show: 1000 } }"
        @click="editor.chain().focus().addRowAfter().run()"
      >
        <div class="icon bottom-icon">
          <LinkRight theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '删除行', delay: { show: 1000 } }"
        @click="editor.chain().focus().deleteRow().run()"
      >
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <div class="divider"></div>
      <button
        v-tooltip.top="{ content: '在左侧插入列', delay: { show: 1000 } }"
        @click="editor.chain().focus().addColumnBefore().run()"
      >
        <div class="icon">
          <LinkLeft theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '在右侧插入列', delay: { show: 1000 } }"
        @click="editor.chain().focus().addColumnAfter().run()"
      >
        <div class="icon">
          <LinkRight theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '删除列', delay: { show: 1000 } }"
        @click="editor.chain().focus().deleteColumn().run()"
      >
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <div class="divider"></div>
      <button
        v-tooltip.top="{ content: '切换标题行', delay: { show: 1000 } }"
        @click="editor.chain().focus().toggleHeaderRow().run()"
      >
        <div class="icon">
          <FreezeLine theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '切换标题列', delay: { show: 1000 } }"
        @click="editor.chain().focus().toggleHeaderColumn().run()"
      >
        <div class="icon">
          <FreezeColumn
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '均分列宽', delay: { show: 1000 } }"
        @click="distributeColumnWidths"
      >
        <div class="icon">
          <AutoLineWidth
            theme="outline"
            size="16"
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '合并/拆分单元格', delay: { show: 1000 } }"
        @click="editor.chain().focus().mergeOrSplit().run()"
      >
        <div class="icon">
          <MergeCells theme="outline" size="16" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
      </button>
    </div>
  </bubble-menu>
</template>

<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3'
import {
  Delete,
  LinkLeft,
  LinkRight,
  MergeCells,
  FreezeLine,
  FreezeColumn,
  AutoLineWidth
} from '@icon-park/vue-next'
import type { Editor } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

const props = defineProps<{
  editor: Editor
}>()

// 修改 shouldShow 函数的类型和实现
const shouldShow = (props: {
  editor: Editor
  view: EditorView
  state: EditorState
  from: number
  to: number
}): boolean => {
  const { state } = props
  const { selection } = state
  const { $anchor } = selection

  // 检查是否在表格内
  let isInTable = false
  let depth = $anchor.depth
  let cellNode: any = null

  while (depth > 0) {
    const node = $anchor.node(depth)
    if (node.type.name === 'table') {
      isInTable = true
    }
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      cellNode = node as any
    }
    depth--
  }

  if (!isInTable || !cellNode) {
    return false
  }

  // 检查是否处于表格操作状态
  const isTableOperation =
    // 1. 选中了多个单元格
    (selection.ranges && selection.ranges.length > 1) ||
    // 2. 选中了整行或整列
    Object.prototype.hasOwnProperty.call(selection, 'isRowSelection') ||
    Object.prototype.hasOwnProperty.call(selection, 'isColSelection') ||
    // 3. 光标在单元格的边界位置
    selection.$anchor.parentOffset === 0 ||
    selection.$anchor.parentOffset === cellNode.content.size ||
    // 4. 选中了整个单元格的内容
    (selection.from <= $anchor.start() && selection.to >= $anchor.end()) ||
    // 5. 用户刚刚点击了单元格（空选区在单元格开始位置）
    (selection.empty &&
      selection.$anchor.parentOffset === 0 &&
      selection.from === selection.$anchor.start())

  return isTableOperation
}

// 添加均分列宽的处理函数
const distributeColumnWidths = () => {
  const { state } = props.editor
  const { selection } = state
  const { $anchor } = selection

  // 查找表格节点
  let tableNode = null
  let depth = $anchor.depth

  while (depth > 0) {
    const node = $anchor.node(depth)
    if (node.type.name === 'table') {
      tableNode = node
      break
    }
    depth--
  }

  if (!tableNode) {
    console.log('未找到表格节点')
    return
  }

  // 获取表格元素
  const tableElement = document.querySelector('table')
  if (!tableElement) {
    console.log('未找到表格元素')
    return
  }

  // 获取笔记容器的可用宽度 - 修改这部分逻辑
  // 尝试获取笔记内容容器的宽度
  const noteContentContainer =
    document.querySelector('.ProseMirror') ||
    document.querySelector('.editor-content') ||
    tableElement.closest('.note-content') ||
    tableElement.closest('.editor-container')

  // 获取笔记容器的宽度，如果找不到容器则使用表格父元素宽度，最后使用默认值
  const containerWidth = noteContentContainer
    ? noteContentContainer.clientWidth
    : tableElement.parentElement?.clientWidth || 800

  console.log('笔记容器宽度:', containerWidth)

  // 考虑内边距和边框的影响，减小实际可用宽度
  // 使用更小的边距预留值，以充分利用笔记宽度
  const availableWidth = containerWidth - 20 // 减少预留边距
  console.log('可用宽度:', availableWidth)

  // 添加对 firstChild 的空值检查
  const firstRow = tableNode.firstChild
  if (!firstRow) {
    console.log('未找到第一行')
    return
  }

  const columnCount = firstRow.childCount
  console.log('列数:', columnCount)

  // 确保每列至少100px宽，同时不超过可用宽度
  const columnWidth = Math.max(100, Math.floor(availableWidth / columnCount))
  console.log('计算的列宽:', columnWidth)

  try {
    // 创建一个事务
    const tr = props.editor.state.tr

    // 遍历表格的所有行和单元格，为每个单元格设置 colwidth 属性
    tableNode.content.forEach((row) => {
      row.content.forEach((cell) => {
        // 获取单元格的位置
        let cellPos = 0
        let found = false

        // 计算单元格的绝对位置
        tr.doc.nodesBetween(0, tr.doc.content.size, (node, pos) => {
          if (found) return false
          if (node === cell) {
            cellPos = pos
            found = true
            return false
          }
          return true
        })

        if (found) {
          // 设置单元格的 colwidth 属性
          tr.setNodeMarkup(cellPos, null, {
            ...cell.attrs,
            colwidth: [columnWidth]
          })
        }
      })
    })

    // 应用事务
    props.editor.view.dispatch(tr)
    console.log('单元格 colwidth 属性更新完成')

    // 直接更新 DOM
    setTimeout(() => {
      // 更新 colgroup/col 元素
      const colElements = tableElement.querySelectorAll('col')
      if (colElements.length > 0) {
        colElements.forEach((col) => {
          if (col instanceof HTMLElement) {
            col.style.width = `${columnWidth}px`
          }
        })
        console.log('col 元素宽度更新完成')
      }

      // 更新单元格的 colwidth 属性和样式
      const cells = tableElement.querySelectorAll('th, td')
      cells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          cell.style.width = `${columnWidth}px`
          cell.setAttribute('colwidth', columnWidth.toString())
        }
      })
      console.log('单元格宽度更新完成')

      // 使用 fixTables 命令修复表格
      props.editor.commands.fixTables()
      console.log('表格修复完成')

      // 触发编辑器内容变更
      props.editor.commands.focus()

      // 通知编辑器内容已更改
      const event = new Event('input', { bubbles: true })
      tableElement.dispatchEvent(event)
    }, 50)
  } catch (error) {
    console.error('更新列宽时出错:', error)
  }
}
</script>

<style lang="scss" scoped>
.table-bubble-menu {
  .menu-container {
    display: flex;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
    gap: 2px;
    box-shadow: var(--shadow-primary);
    margin-top: -8px;
    z-index: 1100;

    button {
      padding: 4px;
      border: none;
      background: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px; // 添加固定宽度
      height: 30px; // 添加固定高度

      &:hover {
        background-color: var(--color-hover-button);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative; // 添加相对定位

        :deep(svg) {
          position: absolute; // 绝对定位
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%); // 完美居中
          width: 16px;
          height: 16px;
        }
      }
    }

    .divider {
      width: 1px;
      background-color: var(--color-border);
      margin: 0 4px;
    }
  }

  .top-icon {
    transform: rotate(90deg);
  }

  .bottom-icon {
    transform: rotate(90deg);
  }
}
</style>
