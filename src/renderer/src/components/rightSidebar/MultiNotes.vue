<!--
 * @file MultiNotes.vue
 * @description 右侧边栏多开笔记组件
 * 
 * 主要功能：
 * 1. 显示多个打开的笔记
 *    - 支持多个笔记同时展示
 *    - 每个笔记可以独立编辑
 * 2. 笔记拖拽功能
 *    - 在思维板详情页面支持拖拽
 *    - 提供拖拽时的视觉反馈
 *    - 支持将笔记拖入思维导图创建笔记卡片
 * 3. 状态管理
 *    - 与全局笔记状态同步
 *    - 动态控制拖拽功能的启用/禁用
 * 
 * @author 麦先生
 * @created 2024-03-19
 -->

<template>
  <div class="multi-notes">
    <div class="toolbar"></div>

    <div class="notes-container">
      <div
        v-for="note in sidebarNotes"
        :key="note.id"
        class="note-item"
        :draggable="isDraggable"
        @dragstart="(e) => handleDragStart(e, note)"
      >
        <RightSidebarNoteEditor :noteId="note.id" @close="noteStore.closeNoteEditor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入所需的依赖和类型
 */
import { computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import RightSidebarNoteEditor from '@renderer/components/rightSidebar/RightSidebarNoteEditor.vue'
import type { Note } from '@shared/types'
import { useRoute } from 'vue-router'

/**
 * 组件状态和存储初始化
 */
const route = useRoute()
const noteStore = useNoteStore()

/**
 * 获取侧边栏笔记列表
 * @type {ComputedRef<Note[]>}
 */
const sidebarNotes = computed(() => noteStore.rightSidebarNotes)

/**
 * 判断笔记是否可拖动
 * 仅在思维板详情页面启用拖动功能
 * @type {ComputedRef<boolean>}
 */
const isDraggable = computed(() => {
  return route.name === 'MindboardDetail'
})

/**
 * 处理笔记拖动开始事件
 * @param {DragEvent} event - 拖动事件对象
 * @param {Note} note - 被拖动的笔记对象
 */
const handleDragStart = (event: DragEvent, note: Note) => {
  // 如果不在思维板详情页面，则不执行拖动
  if (!isDraggable.value) return

  if (!event.dataTransfer) return

  // 设置拖动数据
  event.dataTransfer.setData('application/json', JSON.stringify({ id: note.id }))
  event.dataTransfer.effectAllowed = 'copy'

  // 创建拖动时的视觉效果
  const dragImage = document.createElement('div')
  dragImage.style.cssText = `
    position: absolute;
    width: 200px;
    height: 50px;
    background: var(--color-bg-note-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 10px;
    opacity: 0.8;
    pointer-events: none;
    display: flex;
    align-items: center;
  `
  dragImage.textContent = note.address || '无编码地址'
  document.body.appendChild(dragImage)

  // 设置自定义拖动图像
  event.dataTransfer.setDragImage(dragImage, 100, 25)

  // 清理临时创建的拖动图像元素
  setTimeout(() => {
    document.body.removeChild(dragImage)
  }, 0)
}
</script>

<style lang="scss" scoped>
/**
 * 组件样式
 */
.multi-notes {
  height: 100%;
  display: flex;
  flex-direction: column;

  // 顶部工具栏样式
  .toolbar {
    display: flex;
    justify-content: flex-end;

    .clear-button {
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }

  // 笔记容器样式
  .notes-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    // 笔记项样式
    .note-item {
      margin-bottom: 16px;
      cursor: default; // 默认鼠标样式

      // 可拖动状态的鼠标样式
      &[draggable='true'] {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
