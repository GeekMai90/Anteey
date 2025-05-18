<template>
  <div class="trash-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <div class="topToolBar">
          <div class="trash-header-left">
            <div class="icon">
              <RecycleBin theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">回收站</div>
          </div>
          <div class="right-actions">
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <Button :height="36" :icon="SortTwo" dropdown> 排序 </Button>
              <div v-if="showSortMenu" class="sort-dropdown-menu">
                <div
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="sort-dropdown-item"
                  :class="{ active: currentSort === option.value }"
                  @click="selectSortOption(option)"
                >
                  <div class="dropdown-item-content">
                    {{ option.label }}
                  </div>
                  <div v-if="currentSort === option.value" class="sort-direction">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </div>
                </div>
              </div>
            </div>
            <Button v-if="deletedNotes.length > 0" :height="36" type="warning" @click="emptyTrash">
              清空回收站
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div class="trash-view-container">
      <div v-if="deletedNotes.length > 0" class="card-grid-container">
        <div class="card-grid">
          <TrashNoteCard
            v-for="note in sortedDeletedNotes"
            :key="note.id"
            :note="note"
            @toggleMenu="toggleNoteMenu"
          />
        </div>
      </div>
      <div v-else class="empty-state-container">
        <div class="empty-state">
          <div class="empty-state-content">
            <!-- <clear theme="outline" size="24" fill="#333" :strokeWidth="1"/> -->
            <Clear theme="outline" size="64" fill="var(--color-icon-secondary)" :strokeWidth="2" />
            <p>回收站是空的</p>
            <span>删除的笔记将会在这里显示</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记操作菜单 -->
    <div v-if="activeNoteMenu" class="note-menu" :style="menuPosition">
      <div class="menu-item" @click="restoreNote(activeNoteMenu)">
        <div class="icon">
          <Recycling theme="outline" size="16" fill="currentColor" />
        </div>
        <div class="name">恢复笔记</div>
      </div>
      <div class="menu-item delete" @click="deleteNote">
        <div class="icon">
          <Delete theme="outline" size="16" fill="currentColor" />
        </div>
        <div class="name">{{ isConfirmingDelete ? '确认删除' : '永久删除' }}</div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-model:visible="showConfirmDialog"
      title="全部清空"
      message="所有笔记将被删除，此操作不能撤销"
      type="danger"
      cancel-text="取消"
      confirm-text="清空"
      @cancel="handleCancelEmptyTrash"
      @confirm="handleConfirmEmptyTrash"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useEventBus } from '@vueuse/core'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import TrashNoteCard from '@renderer/components/note/TrashNoteCard.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import { SortTwo, Recycling, Delete, Clear, RecycleBin } from '@icon-park/vue-next'
import type { Note } from '@shared/types'

const noteStore = useNoteStore()
const deletedNotes = ref<Note[]>([])
const showSortMenu = ref(false)
const currentSort = ref('updatedAt')
const sortDirection = ref('desc')
const activeNoteMenu = ref<string | null>(null)
const menuPosition = ref({ top: '0px', left: '0px' })
const isConfirmingDelete = ref(false)
let deleteTimeout: ReturnType<typeof setTimeout> | null = null
const showConfirmDialog = ref(false)

const sortOptions = [
  { value: 'updatedAt', label: '按删除时间排序' },
  { value: 'address', label: '按标题排序' }
]

// 获取回收站笔记
const fetchDeletedNotes = async () => {
  try {
    const fetchedNotes = await noteStore.getAllDeletedNotes()
    deletedNotes.value = fetchedNotes
  } catch (error) {
    console.error('加载回收站笔记失败', error)
    deletedNotes.value = []
  }
}

// 监听笔记恢复事件
const noteRestoredBus = useEventBus('note-restored')
const noteRestoredHandler = () => {
  fetchDeletedNotes() // 重新获取回收站笔记
}

// 监听笔记永久删除事件
const notePermanentDeletedBus = useEventBus('note-permanent-deleted')
const notePermanentDeletedHandler = () => {
  fetchDeletedNotes() // 重新获取回收站笔记
}

onMounted(async () => {
  await fetchDeletedNotes()
  document.addEventListener('click', closeMenu)
  // 添加全局点击事件监听
  document.addEventListener('click', handleGlobalClick)
  // 添加事件监听
  noteRestoredBus.on(noteRestoredHandler)
  notePermanentDeletedBus.on(notePermanentDeletedHandler)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
  // 移除全局点击事件监听
  document.removeEventListener('click', handleGlobalClick)
  // 移除事件监听
  noteRestoredBus.off(noteRestoredHandler)
  notePermanentDeletedBus.off(notePermanentDeletedHandler)
})

// 添加全局点击事件处理函数
const handleGlobalClick = (event: MouseEvent) => {
  const sortDropdown = document.querySelector('.sort-button-container')
  if (showSortMenu.value && sortDropdown && !sortDropdown.contains(event.target as Node)) {
    showSortMenu.value = false
  }
}

const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
}

const selectSortOption = (option: { value: string; label: string }) => {
  if (currentSort.value === option.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = option.value
    sortDirection.value = 'desc'
  }
  showSortMenu.value = false
}

const sortedDeletedNotes = computed(() => {
  return [...deletedNotes.value].sort((a, b) => {
    let comparison = 0
    if (currentSort.value === 'address') {
      comparison = a.address.localeCompare(b.address, 'zh-CN')
    } else if (currentSort.value === 'updatedAt') {
      comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

const toggleNoteMenu = (
  noteId: string,
  position: { x: number; y: number; width: number; height: number }
) => {
  if (activeNoteMenu.value === noteId) {
    activeNoteMenu.value = null
    isConfirmingDelete.value = false
    if (deleteTimeout) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
  } else {
    activeNoteMenu.value = noteId
    isConfirmingDelete.value = false
    const menuWidth = 160 // 菜单宽度
    let left = position.x + position.width / 2 - menuWidth / 2

    // 确保菜单不会超出视口左右边界
    const viewportWidth = window.innerWidth
    if (left < 0) {
      left = 0
    } else if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth
    }

    menuPosition.value = {
      top: `${position.y + window.scrollY + 5}px`,
      left: `${left}px`
    }
  }
}

const closeMenu = (event: MouseEvent) => {
  if (activeNoteMenu.value && !(event.target as HTMLElement).closest('.note-menu')) {
    activeNoteMenu.value = null
    isConfirmingDelete.value = false
    if (deleteTimeout) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
  }
}

const restoreNote = async (id: string) => {
  try {
    await noteStore.restoreFromTrash(id)
    await fetchDeletedNotes() // 重新获取回收站数据
    activeNoteMenu.value = null
  } catch (error) {
    console.error('恢复笔记失败', error)
  }
}

const deleteNote = () => {
  if (!isConfirmingDelete.value) {
    isConfirmingDelete.value = true
    deleteTimeout = setTimeout(() => {
      isConfirmingDelete.value = false
      activeNoteMenu.value = null
    }, 3000)
  } else {
    if (activeNoteMenu.value) {
      permanentlyDeleteNote(activeNoteMenu.value)
    }
    isConfirmingDelete.value = false
    if (deleteTimeout) {
      clearTimeout(deleteTimeout)
      deleteTimeout = null
    }
  }
}

const permanentlyDeleteNote = async (id: string) => {
  try {
    await noteStore.permanentlyDelete(id)
    await fetchDeletedNotes() // 重新获取回收站数据
    activeNoteMenu.value = null
  } catch (error) {
    console.error('永久删除笔记失败', error)
  }
}

const emptyTrash = () => {
  showConfirmDialog.value = true
}

const handleConfirmEmptyTrash = async () => {
  try {
    const deletePromises = deletedNotes.value.map((note) => noteStore.permanentlyDelete(note.id))
    await Promise.all(deletePromises)
    await fetchDeletedNotes() // 重新获取回收站数据
  } catch (error) {
    console.error('清空回收站失败', error)
  } finally {
    showConfirmDialog.value = false
  }
}

const handleCancelEmptyTrash = () => {
  showConfirmDialog.value = false
}
</script>

<style lang="scss" scoped>
.trash-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
  position: relative;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--color-bg-primary);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .header-content {
      width: 100%;
      padding: 0 20px;
      box-sizing: border-box;

      .topToolBar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0;
        background-color: var(--color-bg-primary);
        padding-bottom: 8px;
        border-bottom: 1px solid var(--color-border-light);

        .trash-header-left {
          position: relative;
          display: flex;
          align-items: center;
          border: none;
          background: none;
          border-radius: 6px;
          padding: 4px 0px;
          margin: 2px;

          .icon {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            border-radius: 8px;
            background-color: var(--color-primary-light);
            border: 1px solid var(--color-primary);

            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 18px;
              height: 18px;
            }
          }

          .name {
            flex-grow: 0;
            text-align: left;
            color: var(--color-text-primary);
            font-size: 20px;
            font-weight: 600;
            margin-left: 8px;
            white-space: nowrap;
            writing-mode: horizontal-tb;
            user-select: none;
            line-height: 1;
          }
        }

        .right-actions {
          display: flex;
          gap: 8px;
          align-items: center;

          .sort-button-container {
            display: flex;
            align-items: center;
            position: relative;

            :deep(.ant-btn) {
              width: 100%;
            }

            .sort-dropdown-menu {
              position: absolute;
              top: 100%;
              right: 0;
              background-color: var(--color-bg-primary);
              border-radius: 8px;
              box-shadow: var(--shadow-primary);
              z-index: 1000;
              min-width: 200px;
              width: auto;
              overflow-y: auto;
              padding: 6px 0;
              white-space: nowrap;
              margin-top: 4px;
            }

            .sort-dropdown-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 16px;
              cursor: pointer;
              transition: background-color 0.2s;
              font-size: 14px;
              color: var(--color-text-primary);
              white-space: nowrap;
              border-radius: 8px;
              margin: 2px 8px 2px 8px;
              user-select: none;

              &:hover {
                background-color: var(--color-hover-bg);
              }

              &.active {
                background-color: var(--color-menu-active-bg);
              }
            }
          }

          .empty-trash-button {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            background-color: var(--color-danger);
            color: white;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
              filter: brightness(90%);
            }
          }
        }
      }
    }
  }

  .trash-view-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    overflow: hidden;
    position: relative;

    .card-grid-container {
      flex: 1;
      overflow-y: auto;
      position: relative;
      padding: 22px 20px;

      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
        align-content: start;
        justify-content: center;
        position: relative;
        will-change: transform;
      }
    }

    .empty-state-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;

      .empty-state {
        text-align: center;
        color: var(--color-text-secondary);
        margin-top: -20vh;

        .empty-state-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;

          .i-icon {
            margin-bottom: 16px;
          }

          p {
            font-size: 20px;
            font-weight: 500;
            margin: 0 0 8px;
            color: var(--color-text-primary);
          }

          span {
            font-size: 14px;
            color: var(--color-text-secondary);
          }
        }
      }
    }
  }
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}

.note-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  width: 140px; // 增加宽度以适应内容
  padding: 8px 12px;
  white-space: nowrap;

  .menu-item {
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
      flex-grow: 0;
      text-align: left;
      color: var(---color-text-primary);
      font-size: 13px;
      font-weight: 400;
      margin-left: 6px;
      white-space: nowrap;
      writing-mode: horizontal-tb;
      line-height: 1;
    }

    &:hover {
      background-color: var(--color-hover-button);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }

    &.delete {
      color: #ff4d4f;
    }
  }
}
</style>
