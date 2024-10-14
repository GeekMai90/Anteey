<template>
  <div class="trash-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="filter-bar">
          <h2>回收站</h2>
        </div>
        <div class="right-actions">
          <div class="sort-button-container" @click.stop="toggleSortMenu">
            <SortTwo theme="outline" size="18" fill="currentColor" />
            <div v-if="showSortMenu" class="sort-dropdown-menu">
              <div
                v-for="option in sortOptions"
                :key="option.value"
                class="sort-dropdown-item"
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
          <button v-if="deletedNotes.length > 0" class="empty-trash-button" @click="emptyTrash">
            清空回收站
          </button>
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
            <Clear theme="outline" size="64" fill="currentColor" :strokeWidth="2" />
            <p>回收站是空的</p>
            <span>删除的笔记将会在这里显示</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 笔记操作菜单 -->
    <div v-if="activeNoteMenu" class="note-menu" :style="menuPosition">
      <div class="menu-item" @click="restoreNote(activeNoteMenu)">
        <Recycling theme="outline" size="16" fill="currentColor" />
        <span>恢复笔记</span>
      </div>
      <div class="menu-item delete" @click="deleteNote">
        <Delete theme="outline" size="16" fill="currentColor" />
        <span>{{ isConfirmingDelete ? '确认删除' : '永久删除' }}</span>
      </div>
    </div>

    <!-- 确认对话框 -->
    <ConfirmDialog
      :show="showConfirmDialog"
      title="全部清空"
      message="笔记将被删除，此操作不能撤销"
      @cancel="handleCancelEmptyTrash"
      @confirm="handleConfirmEmptyTrash"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import AppToolbar from '../components/AppToolbar.vue'
import TrashNoteCard from '../components/TrashNoteCard.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { SortTwo, Recycling, Delete, Clear } from '@icon-park/vue-next'
import { Note } from '../types/Note'

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

onMounted(async () => {
  await fetchDeletedNotes()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

const fetchDeletedNotes = async () => {
  try {
    const fetchedNotes = await noteStore.deletedNotes
    deletedNotes.value = Array.isArray(fetchedNotes) ? fetchedNotes : []
  } catch (error) {
    console.error('加载回收站笔记失败', error)
    deletedNotes.value = []
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
  background-color: var(--body-bg);
  overflow: hidden;
  position: relative;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--body-bg);

    .topToolBar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 30px;
      background-color: var(--body-bg);

      h2 {
        margin: 0;
        font-size: 18px;
        color: var(--text-default-color);
      }

      .right-actions {
        display: flex;
        gap: 10px;
        align-items: center;

        .sort-button-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: none;
          background-color: transparent;
          color: var(--text-default-color);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px;
          position: relative;

          &:hover {
            background-color: var(--sidebar-hover-bg);
          }

          &.active {
            background-color: var(--menu-active-bg);
            color: var(--primary-color);
          }

          .i-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .sort-dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background-color: var(--body-bg);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            min-width: 200px;
            width: auto;
            overflow-y: auto;
            padding: 6px 0;
            white-space: nowrap;
          }

          .sort-dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
            color: var(--text-default-color);
            white-space: nowrap;
            border-radius: 8px;
            margin: 2px 8px 2px 8px;

            &:hover {
              background-color: var(--sidebar-hover-bg);
            }

            &.active {
              background-color: var(--menu-active-bg);
              border: 1px solid var(--primary-color);
            }
          }
        }

        .empty-trash-button {
          padding: 8px 12px;
          border: none;
          border-radius: 5px;
          background-color: var(--color-text-danger);
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.3s;

          &:hover {
            filter: brightness(90%);
          }
        }
      }
    }
  }

  .trash-view-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;

    .card-grid-container {
      width: 100%;
      height: 100%;
      padding: 16px 30px;
      // display: flex;
      // align-items: center;
      // justify-content: center;

      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 16px;
        width: 100%;
      }
    }

    .empty-state-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;

      .empty-state {
        text-align: center;
        color: var(--text-light-color);
        margin-top: -20vh; // 添加这一行，可以根据需要调整数值

        .empty-state-content {
          .i-icon {
            margin-bottom: 16px;
          }

          p {
            font-size: 20px;
            font-weight: 500;
            margin: 0 0 8px;
          }

          span {
            font-size: 14px;
            opacity: 0.7;
          }
        }
      }
    }
  }

  .note-menu {
    position: fixed;
    background-color: #fff;
    border-radius: 8px;
    box-shadow:
      0 3px 6px -4px rgb(0 0 0 / 12%),
      0 6px 16px 0 rgb(0 0 0 / 8%),
      0 9px 28px 8px rgb(0 0 0 / 5%);
    z-index: 1000;
    width: 140px; // 增加宽度以适应内容
    padding: 8px 12px;
    white-space: nowrap;

    .menu-item {
      display: flex;
      align-items: center;
      width: 100%; // 使用100%宽度
      padding: 8px 16px; // 左右padding相等
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 14px;
      color: var(--text-default-color);
      gap: 8px;
      border-radius: 8px;

      &:hover {
        background-color: var(--sidebar-hover-bg);
      }

      &.delete {
        color: var(--error-color);
      }

      .i-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        flex-shrink: 0; // 防止图标缩小
      }

      span {
        flex-grow: 1; // 让文字占据剩余空间
      }
    }
  }
}
</style>
