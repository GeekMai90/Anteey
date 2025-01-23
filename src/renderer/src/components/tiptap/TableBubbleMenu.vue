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
          <LinkLeft
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '在下方插入行', delay: { show: 1000 } }"
        @click="editor.chain().focus().addRowAfter().run()"
      >
        <div class="icon bottom-icon">
          <LinkRight
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '删除行', delay: { show: 1000 } }"
        @click="editor.chain().focus().deleteRow().run()"
      >
        <div class="icon">
          <Delete
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <div class="divider"></div>
      <button
        v-tooltip.top="{ content: '在左侧插入列', delay: { show: 1000 } }"
        @click="editor.chain().focus().addColumnBefore().run()"
      >
        <div class="icon">
          <LinkLeft
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '在右侧插入列', delay: { show: 1000 } }"
        @click="editor.chain().focus().addColumnAfter().run()"
      >
        <div class="icon">
          <LinkRight
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '删除列', delay: { show: 1000 } }"
        @click="editor.chain().focus().deleteColumn().run()"
      >
        <div class="icon">
          <Delete
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <div class="divider"></div>
      <button
        v-tooltip.top="{ content: '切换标题行', delay: { show: 1000 } }"
        @click="editor.chain().focus().toggleHeaderRow().run()"
      >
        <div class="icon">
          <FreezeLine
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
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
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
      </button>
      <button
        v-tooltip.top="{ content: '合并/拆分单元格', delay: { show: 1000 } }"
        @click="editor.chain().focus().mergeOrSplit().run()"
      >
        <div class="icon">
          <MergeCells
            theme="outline"
            size="16"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
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
  FreezeColumn
} from '@icon-park/vue-next'
import type { Editor } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

defineProps<{
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
