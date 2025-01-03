<template>
  <node-view-wrapper class="table-wrapper">
    <div class="table-container">
      <table>
        <node-view-content />
      </table>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'

defineProps<NodeViewProps>()
</script>

<style lang="scss">
.table-wrapper {
  position: relative;
  margin: 1em 0;
  width: 100%;

  .table-container {
    overflow-x: auto;
    padding: 0.5rem 0;

    table {
      border-collapse: collapse;
      margin: 0;
      table-layout: fixed;
      width: 100%;
      min-width: 600px;

      td,
      th {
        border: 1px solid var(--color-border);
        box-sizing: border-box;
        min-width: 100px;
        padding: 8px 12px;
        position: relative;
        vertical-align: top;

        > * {
          margin-bottom: 0;
        }

        &:hover {
          background-color: var(--color-hover);
        }

        // 修改列宽调整手柄的样式
        td.has-column-resize,
        th.has-column-resize {
          &::after {
            content: '';
            position: absolute;
            right: -4px;
            top: 0;
            bottom: 0;
            width: 8px;
            background-color: transparent;
            cursor: ew-resize !important;
            opacity: 0;
            transition:
              opacity 0.2s,
              background-color 0.2s;
            z-index: 30;
            pointer-events: all;
          }

          &:hover::after {
            opacity: 1;
            background-color: var(--color-primary);
          }
        }
      }

      th {
        // background-color: var(--color-bg-secondary);
        font-weight: bold;
        text-align: left;
      }

      .selectedCell {
        position: relative;

        &::after {
          background: var(--color-hover);
          content: '';
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
          opacity: 0.2;
        }
      }
    }
  }
}

// Tiptap 表格调整列宽的样式
.table-wrapper {
  .ProseMirror {
    .column-resize-handle {
      background-color: var(--color-primary);
      bottom: 0;
      position: absolute;
      right: -4px;
      top: 0;
      width: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 30;
      cursor: ew-resize !important;
      pointer-events: all;

      &:hover {
        opacity: 1;
      }
    }
  }
}

// 全局样式
.resize-cursor,
.resize-cursor * {
  cursor: ew-resize !important;
}
</style>
