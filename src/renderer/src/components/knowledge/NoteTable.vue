<template>
  <div ref="tableRef" class="note-table">
    <div class="table-header">
      <div class="table-row">
        <div class="table-cell address-cell">编码地址</div>
        <div class="table-cell title-cell">标题</div>
        <div class="table-cell reference-cell">引用</div>
        <div class="table-cell reference-cell">被引用</div>
        <div class="table-cell date-cell" :class="{ 'hide-dates': isNarrow }">创建时间</div>
        <div class="table-cell date-cell" :class="{ 'hide-dates': isNarrow }">更新时间</div>
      </div>
    </div>
    <div class="table-body">
      <div v-for="note in notes" :key="note.address" class="table-row">
        <div class="table-cell address-cell clickable" @click="(e) => handleAddressClick(note, e)">
          {{ note.address }}
        </div>
        <div class="table-cell title-cell">{{ note.title }}</div>
        <div class="table-cell reference-cell">
          <div class="reference-cell-content">
            <div v-if="note.references && note.references.length > 0" class="reference-list">
              <div
                v-for="reference in note.references"
                :key="reference.noteId"
                class="reference-item clickable"
                @click="(e) => handleReferenceClick(reference.noteId, e, reference.address)"
              >
                {{ reference.address }} | {{ reference.title }}
              </div>
            </div>
            <div v-if="note.references && note.references.length > 0" class="reference-count">
              {{ note.references.length }}
            </div>
          </div>
        </div>
        <div class="table-cell reference-cell">
          <div class="reference-cell-content">
            <div v-if="note.referencedBy && note.referencedBy.length > 0" class="reference-list">
              <div
                v-for="reference in note.referencedBy"
                :key="reference.noteId"
                class="reference-item clickable"
                @click="(e) => handleReferenceClick(reference.noteId, e, reference.address)"
              >
                {{ reference.address }} | {{ reference.title }}
              </div>
            </div>
            <div v-if="note.referencedBy && note.referencedBy.length > 0" class="reference-count">
              {{ note.referencedBy.length }}
            </div>
          </div>
        </div>
        <div class="table-cell date-cell" :class="{ 'hide-dates': isNarrow }">
          {{ formatDate(note.createdAt) }}
        </div>
        <div class="table-cell date-cell" :class="{ 'hide-dates': isNarrow }">
          {{ formatDate(note.updatedAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import type { TableNote } from '@shared/types/note'
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  notes: TableNote[]
}>()

const router = useRouter()
const noteStore = useNoteStore()
const uiStore = useUIStore()
const tableRef = ref<HTMLElement | null>(null)
const isNarrow = ref(false)

// 检查表格宽度并决定是否显示日期列
const checkTableWidth = () => {
  if (tableRef.value) {
    const width = tableRef.value.clientWidth
    // 当宽度小于 800px 时隐藏日期列
    // 这个值需要根据实际情况调整
    isNarrow.value = width < 1100
  }
}

// 创建 ResizeObserver 实例
const observer = new ResizeObserver(() => {
  checkTableWidth()
})

onMounted(() => {
  if (tableRef.value) {
    // 初始检查
    checkTableWidth()
    // 开始观察大小变化
    observer.observe(tableRef.value)
  }
})

onUnmounted(() => {
  // 停止观察
  observer.disconnect()
})

// 监听数据变化时重新检查宽度
watch(
  () => props.notes,
  () => {
    // 在下一个 tick 检查宽度，确保 DOM 已更新
    setTimeout(checkTableWidth, 0)
  },
  { deep: true }
)

const handleAddressClick = (note: TableNote, event: MouseEvent) => {
  // Command/Ctrl + 点击: 全屏打开笔记
  if (event.metaKey || event.ctrlKey) {
    router.push(`/note/${note.noteId}`)
    return
  }

  // Alt + 点击：跳转到卡片盒查看笔记
  if (event.altKey) {
    router.push({
      name: 'cardbox',
      query: {
        mode: 'context',
        noteId: note.noteId
      }
    })
    return
  }

  // Shift + 点击：在知识树中查看节点
  if (event.shiftKey && note.address) {
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: note.address }
    })
    return
  }

  // 普通点击: 在右侧边栏打开
  noteStore.openBacklinkPreview(note.noteId)
  uiStore.openRightSidebarWithTab('backlink')
}

const handleReferenceClick = (noteId: string, event: MouseEvent, address: string) => {
  // Command/Ctrl + 点击: 全屏打开笔记
  if (event.metaKey || event.ctrlKey) {
    router.push(`/note/${noteId}`)
    return
  }

  // Alt + 点击：跳转到卡片盒查看笔记
  if (event.altKey) {
    router.push({
      name: 'cardbox',
      query: {
        mode: 'context',
        noteId: noteId
      }
    })
    return
  }

  // Shift + 点击：在知识树中查看节点
  if (event.shiftKey && address) {
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: address }
    })
    return
  }

  // 普通点击: 在右侧边栏打开
  noteStore.openBacklinkPreview(noteId)
  uiStore.openRightSidebarWithTab('backlink')
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.note-table {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border-default);
  overflow: hidden;
  position: relative;
}

.table-header {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-default);
  font-weight: 500;
  flex-shrink: 0;
  user-select: none;
  color: var(--color-text-secondary);
}

.table-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
  min-height: 0; /* 确保flex布局正常工作 */
}

/* 添加空行容器 */
.table-body::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-primary);
  min-height: 36px; /* 与实际行高保持一致 */
}

.table-row {
  display: flex;
  border-bottom: 1px solid var(--color-border-default);
  min-height: 36px;
  transition: all 0.2s ease;
  flex-shrink: 0; /* 防止行被压缩 */
}

/* 将 hover 效果移到表格主体的行 */
.table-body .table-row:hover {
  background-color: var(--color-primary-light);
}

.table-row:last-child {
  border-bottom: 1px solid var(--color-border-default); /* 修改为显示边框 */
}

.table-cell {
  padding: 8px 12px !important;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  line-height: 1.2;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.address-cell {
  flex: 1;
  min-width: 200px !important; /* 确保地址列最小宽度 */
  justify-content: flex-start;
  font-family: monospace;
  padding-left: 18px !important;
  user-select: none;
}

.address-cell.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.address-cell.clickable:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-hover);
}

.title-cell {
  flex: 3;
  justify-content: flex-start;
}

.reference-cell {
  flex: 2;
  padding: 0;
  position: relative;
  height: auto;
  min-height: 100%;
}

.reference-cell-content {
  position: relative;
  height: 100%;
  width: 100%;
  min-height: inherit;
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 36px;
  max-height: 52px;
  overflow-y: auto;
  overflow-x: hidden;
}

.reference-item {
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  padding-left: 12px;
  padding-right: 8px;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 24px;
  user-select: none;
}

.reference-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background-color: var(--color-text-secondary);
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.reference-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.reference-item.clickable:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-hover);
}

.reference-item.clickable:hover::before {
  background-color: var(--color-primary);
}

.no-references {
  color: var(--color-text-secondary);
  font-size: 0.9em;
  font-style: italic;
}

.reference-count {
  position: absolute;
  bottom: 4px;
  right: 0px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 0.85em;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border-default);
  z-index: 1;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.05);
  user-select: none;
}

.number-cell {
  flex: 0.8;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.date-cell {
  flex: 0.8;
  justify-content: flex-start;
  font-variant-numeric: tabular-nums;
  padding: 8px 4px;
  transition: all 0.2s ease;
  user-select: none;
}

.hide-dates {
  display: none;
  width: 0;
  padding: 0;
  margin: 0;
  border: none;
}

/* 当日期列隐藏时，调整其他列的宽度 */
.note-table:has(.hide-dates) .table-row {
  .address-cell {
    flex: 1;
    min-width: 100px;
  }

  .title-cell {
    flex: 2;
  }

  .reference-cell {
    flex: 1.8;
  }
}

/* 自定义滚动条样式 */
.table-body::-webkit-scrollbar,
.reference-cell::-webkit-scrollbar {
  width: 8px;
}

.table-body::-webkit-scrollbar-track,
.reference-cell::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

.table-body::-webkit-scrollbar-thumb,
.reference-cell::-webkit-scrollbar-thumb {
  background: var(--color-border-default);
  border-radius: 4px;
}

.table-body::-webkit-scrollbar-thumb:hover,
.reference-cell::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}
</style>
