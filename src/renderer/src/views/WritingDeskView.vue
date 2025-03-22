<template>
  <div class="writing-desk-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <NotebookAndPen
                theme="outline"
                size="20"
                fill="var(--color-primary)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">写作台</div>
          </div>
          <div class="topToolBar-right">
            <!-- 分段按钮：全部/草稿/润色/完成 -->
            <SegmentedButton
              v-model="displayMode"
              :options="displayOptions"
              width="240px"
              height="36px"
              name="display-mode"
              tooltipPlacement="top"
              class="display-mode-button"
            />

            <!-- 新建文稿按钮 -->
            <SpreadButton
              :icon="Plus"
              type="default"
              :height="36"
              :tooltip="{
                content: '新建文稿',
                delay: { show: 1000 }
              }"
              tooltipPlacement="top"
              @click="openCreateModal"
            >
              新建文稿
            </SpreadButton>

            <!-- 搜索框 -->
            <div class="search-container">
              <SearchInput
                v-model="searchQuery"
                :width="150"
                :height="36"
                placeholder="搜索文稿..."
                @input="handleSearch"
              />
            </div>

            <!-- 排序 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <Button
                :icon="SortTwo"
                :height="36"
                :tooltip="{
                  content: '选择排序方式',
                  delay: { show: 1000 }
                }"
                dropdown
                tooltipPlacement="top"
                @click.stop="toggleSortMenu"
              >
                排序
              </Button>
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
          </div>
        </div>
      </div>
    </div>

    <div class="writing-desk-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">正在加载文稿列表...</div>

      <!-- 空状态 -->
      <div v-else-if="sortedManuscripts.length === 0" class="empty-state">
        <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
        <div class="empty-text">暂无文稿，点击右上角"新建文稿"开始创作</div>
      </div>

      <!-- 文稿列表 -->
      <div v-else class="list-view">
        <!-- 表头 -->
        <div class="list-header">
          <div class="header-title">标题</div>
          <div class="header-status">状态</div>
          <div class="header-time">最近编辑时间</div>
          <div class="header-actions">操作</div>
        </div>

        <!-- 列表内容 -->
        <div v-for="manuscript in sortedManuscripts" :key="manuscript.id" class="list-item">
          <div class="item-title">
            <template v-if="editingId === manuscript.id">
              <input
                :ref="
                  (el) => {
                    if (el) nameInputRefs[manuscript.id] = el as HTMLInputElement
                  }
                "
                v-model="editingName"
                class="name-input"
                @blur="finishEditing"
                @keyup.enter="finishEditing"
                @keyup.esc="cancelEditing"
              />
            </template>
            <template v-else>
              <span class="title-text" @click="openManuscript(manuscript)">{{
                manuscript.title
              }}</span>
            </template>
          </div>
          <div class="item-status">
            <StatusTag :status="manuscript.status" />
          </div>
          <div class="item-time">{{ formatTime(manuscript.updatedAt) }}</div>
          <div class="item-actions">
            <div ref="moreBtnRef" class="more-button-container">
              <More
                theme="outline"
                size="18"
                :fill="'var(--color-text-secondary)'"
                :strokeWidth="3"
                class="more-icon"
                @click.stop="handleMoreClick($event, manuscript)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建文稿对话框 -->
    <CreateManuscriptDialog v-model:visible="isCreateModalOpen" @create="handleCreateManuscript" />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除文稿"
      message="确定要删除这个文稿吗？此操作不可撤销。"
      type="danger"
      cancel-text="取消"
      confirm-text="删除"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <!-- 更多操作菜单 -->
    <PopupMenu
      :show="!!activeMoreMenu"
      :button-ref="currentMoreBtnRef"
      :menuItems="menuItems"
      @close="closeMoreMenu"
      @itemClick="handleMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { NotebookAndPen, Plus, SortTwo, More, Edit, Delete } from '@icon-park/vue-next'
import { useWritingDeskStore } from '@renderer/stores/writingDeskStore'
import type { Manuscript } from '@shared/types'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import SpreadButton from '@renderer/components/ui/SpreadButton.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import Button from '@renderer/components/ui/Button.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import StatusTag from '@renderer/components/writingDesk/StatusTag.vue'
import CreateManuscriptDialog from '@renderer/components/writingDesk/CreateManuscriptDialog.vue'
import dayjs from 'dayjs'

const router = useRouter()
const writingDeskStore = useWritingDeskStore()

// 状态
const showSortMenu = ref(false)
const currentSort = ref('updatedAt')
const sortDirection = ref('desc')
const searchQuery = ref('')
const displayMode = ref('all')
const editingId = ref<string | null>(null)
const editingName = ref('')
const nameInputRefs = ref<{ [key: string]: HTMLInputElement | null }>({})
const activeMoreMenu = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const pendingDeleteManuscript = ref<Manuscript | null>(null)
const currentMoreBtnRef = ref<HTMLElement | null>(null)
const isCreateModalOpen = ref(false)
const isLoading = ref(false)

// 显示模式选项
const displayOptions = [
  {
    value: 'all',
    label: '全部',
    tooltip: { content: '显示所有文稿', delay: { show: 1000 } }
  },
  {
    value: 'draft',
    label: '草稿',
    tooltip: { content: '显示草稿状态的文稿', delay: { show: 1000 } }
  },
  {
    value: 'first_draft',
    label: '初稿',
    tooltip: { content: '显示初稿状态的文稿', delay: { show: 1000 } }
  },
  {
    value: 'polished',
    label: '完成',
    tooltip: { content: '显示完成状态的文稿', delay: { show: 1000 } }
  }
]

// 排序选项
const sortOptions = [
  { value: 'title', label: '按标题排序' },
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
]

// 菜单项
const menuItems = ref<MenuItem[]>([
  {
    name: 'rename',
    icon: markRaw(Edit),
    label: '修改标题',
    action: () => {
      if (pendingDeleteManuscript.value) {
        startEditing(pendingDeleteManuscript.value)
      }
    }
  },
  {
    name: 'delete',
    icon: markRaw(Delete),
    label: '删除',
    action: () => {
      showDeleteConfirm.value = true
    },
    isDangerous: true
  }
])

// 计算属性：过滤和排序后的文稿列表
const sortedManuscripts = computed(() => {
  let result = writingDeskStore.manuscripts || []

  // 根据显示模式过滤
  if (displayMode.value !== 'all') {
    result = result.filter((m) => m.status === displayMode.value)
  }

  // 根据搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((m) => m.title.toLowerCase().includes(query))
  }

  // 排序
  return result.sort((a, b) => {
    let comparison = 0
    switch (currentSort.value) {
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '')
        break
      case 'createdAt':
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        break
      case 'updatedAt':
        comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// 方法
onMounted(async () => {
  try {
    console.log('WritingDeskView - 开始初始化')
    isLoading.value = true
    const success = await writingDeskStore.fetchAllManuscripts()

    if (!success) {
      console.error('WritingDeskView - 获取文稿列表失败')
      // 添加错误提示UI
    }
  } catch (error) {
    console.error('WritingDeskView - 初始化失败:', error)
    // 添加错误提示UI
  } finally {
    isLoading.value = false
  }
})

const formatTime = (time: Date | string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
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
    sortDirection.value = 'asc'
  }
  showSortMenu.value = false
}

const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

const openManuscript = async (manuscript: Manuscript) => {
  try {
    console.log('WritingDeskView - 打开文稿:', manuscript)

    if (!manuscript?.id) {
      console.error('WritingDeskView - 尝试打开无效文稿:', manuscript)
      return
    }

    const manuscriptId = manuscript.id.trim()
    console.log('WritingDeskView - 准备跳转到文稿页面:', `/writing-desk/${manuscriptId}`)

    // 直接跳转，不需要预加载数据
    await router.push({
      name: 'ManuscriptDetail',
      params: { id: manuscriptId }
    })
  } catch (error) {
    console.error('WritingDeskView - 打开文稿失败:', error)
    // 这里可以添加错误提示UI
  }
}

const handleCreateManuscript = async (title: string) => {
  try {
    console.log('WritingDeskView - 开始创建文稿:', title)
    const manuscript = await writingDeskStore.createManuscript({ title })

    if (!manuscript) {
      console.error('WritingDeskView - 创建文稿失败')
      return
    }

    isCreateModalOpen.value = false
    console.log('WritingDeskView - 准备跳转到文稿页面:', `/writing-desk/${manuscript.id}`)
    router.push(`/writing-desk/${manuscript.id}`)
  } catch (error) {
    console.error('WritingDeskView - 创建文稿失败:', error)
    // 这里可以添加错误提示UI
  }
}

// 编辑相关方法
const startEditing = (manuscript: Manuscript) => {
  editingId.value = manuscript.id
  editingName.value = manuscript.title
  closeMoreMenu()
  nextTick(() => {
    const input = nameInputRefs.value[manuscript.id]
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const finishEditing = async () => {
  if (editingId.value && editingName.value.trim()) {
    try {
      const result = await writingDeskStore.updateManuscript({
        id: editingId.value,
        title: editingName.value.trim()
      })
      if (result) {
        editingId.value = null
        editingName.value = ''
      }
    } catch (error) {
      console.error('WritingDeskView - 更新文稿标题失败:', error)
    }
  }
}

const cancelEditing = () => {
  editingId.value = null
  editingName.value = ''
}

// 更多菜单相关方法
const handleMoreClick = (event: MouseEvent, manuscript: Manuscript) => {
  event.stopPropagation()
  currentMoreBtnRef.value = event.currentTarget as HTMLElement
  pendingDeleteManuscript.value = manuscript
  activeMoreMenu.value = manuscript.id
}

const closeMoreMenu = () => {
  activeMoreMenu.value = null
  pendingDeleteManuscript.value = null
  currentMoreBtnRef.value = null
}

const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

const handleConfirmDelete = async () => {
  if (pendingDeleteManuscript.value) {
    try {
      await writingDeskStore.deleteManuscript(pendingDeleteManuscript.value.id)
      showDeleteConfirm.value = false
      closeMoreMenu()
    } catch (error) {
      console.error('WritingDeskView - 删除文稿失败:', error)
    }
  }
}

const handleCancelDelete = () => {
  showDeleteConfirm.value = false
  pendingDeleteManuscript.value = null
}

// 事件监听器
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.sort-button-container')) {
      showSortMenu.value = false
    }
    if (!target.closest('.more-button-container')) {
      activeMoreMenu.value = null
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})

const openCreateModal = () => {
  isCreateModalOpen.value = true
}
</script>

<style lang="scss" scoped>
.writing-desk-view {
  height: 100vh;
  display: flex;
  flex-direction: column;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--color-bg-primary);
  }

  .topToolBar {
    display: flex;
    align-items: center;
    padding: 0px 20px;
    background-color: var(--color-bg-primary);

    .topToolBar-header {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border);
    }
  }

  .topToolBar-left {
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

  .topToolBar-right {
    display: flex;
    gap: 10px;
    align-items: center;

    .search-container {
      width: 150px;
    }

    .sort-button-container {
      position: relative;
      display: flex;
      align-items: center;

      .sort-dropdown-menu {
        position: absolute;
        top: calc(100% + 4px);
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
        margin: 2px 8px;
        user-select: none;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        &.active {
          background-color: var(--color-menu-active-bg);
        }

        .sort-direction {
          font-size: 12px;
          margin-left: 5px;
        }
      }
    }
  }

  .writing-desk-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    overflow: hidden;
    position: relative;
    background-color: var(--color-bg-primary);
    padding: 20px;

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-secondary);
      font-size: 14px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -90%);
      width: 100%;
      text-align: center;
      padding: 20px;

      .empty-icon {
        width: 300px;
        height: 300px;
      }

      .empty-text {
        color: var(--color-text-secondary);
        font-size: 14px;
        text-align: center;
      }
    }

    .list-view {
      width: 100%;
      height: 100%;
      overflow-y: auto;

      .list-header {
        display: flex;
        align-items: center;
        padding: 0 16px 12px 16px;
        border-bottom: 1px solid var(--color-border);
        font-weight: 500;
        color: var(--color-text-secondary);
        font-size: 14px;
        position: sticky;
        top: 0;
        background-color: var(--color-bg-primary);
        z-index: 1;

        .header-title {
          flex: 1;
          margin-right: 16px;
        }

        .header-status {
          width: 100px;
          margin-right: 16px;
        }

        .header-time {
          width: 180px;
          margin-right: 16px;
        }

        .header-actions {
          width: 40px;
          text-align: center;
        }
      }

      .list-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border);
        transition: background-color 0.2s;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        .item-title {
          flex: 1;
          margin-right: 16px;
          font-size: 14px;
          color: var(--color-text-primary);

          .title-text {
            cursor: pointer;
            &:hover {
              color: var(--color-primary);
            }
          }

          .name-input {
            width: 100%;
            height: 28px;
            padding: 0 8px;
            border: 1px solid var(--color-primary);
            border-radius: 4px;
            font-size: 14px;
            color: var(--color-text-primary);
            background: var(--color-bg-primary);

            &:focus {
              outline: none;
              box-shadow: 0 0 0 2px var(--color-primary-shadow);
            }
          }
        }

        .item-status {
          width: 100px;
          margin-right: 16px;
          display: flex;
          align-items: center;
        }

        .item-time {
          width: 180px;
          margin-right: 16px;
          font-size: 13px;
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
        }

        .item-actions {
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;

          .more-button-container {
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;

            &:hover {
              background-color: var(--color-hover-bg);
              transform: scale(1.1);
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
        }
      }
    }
  }
}

// 滚动条样式
.list-view::-webkit-scrollbar {
  width: 6px;
}

.list-view::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar);
  border-radius: 3px;

  &:hover {
    background-color: var(--color-scrollbar-hover);
  }
}

.list-view::-webkit-scrollbar-track {
  background-color: var(--color-scrollbar-track);
}
</style>
