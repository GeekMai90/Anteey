<template>
  <div class="mindboard-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <Workbench theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">思维板</div>
          </div>
          <div class="topToolBar-right">
            <!-- 分段按钮 -->
            <SegmentedButton
              v-model="displayMode"
              :options="displayOptions"
              width="140px"
              height="36px"
              name="display-mode"
              tooltipPlacement="top"
              class="display-mode-button"
            />
            <!-- 新增思维板 -->
            <SpreadButton
              :icon="Plus"
              type="default"
              :height="36"
              :tooltip="{
                content: '新建思维板',
                delay: { show: 1000 }
              }"
              tooltipPlacement="top"
              @click="addMindboard"
            >
              新增思维板
            </SpreadButton>

            <!-- 搜索框 -->
            <div class="search-container">
              <SearchInput
                v-model="searchQuery"
                :width="150"
                :height="36"
                placeholder="搜索思维板..."
                @input="handleSearch"
              />
            </div>

            <!-- 排序 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <SpreadButton
                :icon="SortTwo"
                :height="36"
                :tooltip="{
                  content: '选择排序方式',
                  delay: { show: 1000 }
                }"
                tooltipPlacement="top"
                @click.stop="toggleSortMenu"
              >
                排序
              </SpreadButton>
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
            <!-- 视图切换 -->
            <div class="view-mode-control">
              <SegmentedButton
                v-model="viewMode"
                :options="viewModeOptions"
                width="80px"
                height="36px"
                :iconOnly="true"
                name="view-mode"
                tooltipPlacement="top"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mindboard-view-container">
      <div v-if="sortedMindboards.length === 0" class="empty-state">
        <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
        <div class="empty-text">暂无思维板，点击右上角"新增思维板"开始创建</div>
      </div>
      <div v-else class="card-grid-container">
        <div class="card-grid-container">
          <!-- 网格视图 -->
          <div v-if="viewMode === 'grid'" class="card-grid">
            <MindboardCard
              v-for="mindboard in sortedMindboards"
              :key="mindboard.id"
              :mindboard="mindboard"
            />
          </div>
          <!-- 列表视图 -->
          <div v-else class="list-view">
            <!-- 表头 -->
            <div class="list-header">
              <div class="header-preview"></div>
              <div class="header-name">文件名</div>
              <div class="header-time">最近编辑时间</div>
              <div class="header-favorite">收藏</div>
              <div class="header-actions">操作</div>
            </div>
            <!-- 列表内容 -->
            <div v-for="mindboard in sortedMindboards" :key="mindboard.id" class="list-item">
              <div class="item-preview">
                <img v-if="mindboard.preview_image" :src="mindboard.preview_image" alt="预览图" />
                <div v-else class="no-preview">
                  <MindmapMap theme="outline" size="24" :strokeWidth="3" />
                </div>
              </div>
              <div class="item-name">
                <template v-if="editingId === mindboard.id">
                  <input
                    :ref="
                      (el) => {
                        if (el) nameInputRefs[mindboard.id] = el as HTMLInputElement
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
                  {{ mindboard.name }}
                </template>
              </div>
              <div class="item-time">{{ formatFullTime(mindboard.updated_at) }}</div>
              <div class="item-favorite">
                <Star
                  theme="outline"
                  size="18"
                  :fill="
                    mindboard.is_favorite ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                  "
                  :strokeWidth="3"
                  class="favorite-icon"
                  @click.stop="toggleFavorite(mindboard.id)"
                />
              </div>
              <div class="item-actions">
                <div ref="moreBtnRef" class="more-button-container">
                  <More
                    theme="outline"
                    size="18"
                    :fill="'var(--color-text-secondary)'"
                    :strokeWidth="3"
                    class="more-icon"
                    @click.stop="handleMoreClick($event, mindboard)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除思维板"
      message="确定要删除这个思维板吗？此操作不可撤销。"
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
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import {
  SortTwo,
  Workbench,
  Plus,
  Delete,
  Edit,
  Star,
  More,
  MindmapMap,
  ViewGridCard,
  ViewList
} from '@icon-park/vue-next'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import MindboardCard from '@renderer/components/mindboard/MindboardCard.vue'
import type { Mindboard } from '@shared/types'
import { format } from 'date-fns'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import SpreadButton from '@renderer/components/ui/SpreadButton.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'

const mindboardStore = useMindboardStore()
const showSortMenu = ref(false)
const currentSort = ref('updated_at')
const sortDirection = ref('desc')
const searchQuery = ref('')
const displayMode = ref('all')
const viewMode = ref('grid')

// 添加编辑相关的状态
const editingId = ref<string | null>(null)
const editingName = ref('')
const nameInputRefs = ref<{ [key: string]: HTMLInputElement | null }>({})
const activeMoreMenu = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const pendingDeleteMindboard = ref<Mindboard | null>(null)

// 添加 ref 用于存储当前点击的按钮
const moreBtnRef = ref<HTMLElement | null>(null)
const currentMoreBtnRef = ref<HTMLElement | null>(null)

const displayOptions = [
  {
    value: 'all',
    label: '全部',
    tooltip: {
      content: '显示所有思维板',
      delay: { show: 1000 }
    }
  },
  {
    value: 'favorite',
    label: '收藏',
    tooltip: {
      content: '只显示收藏的思维板',
      delay: { show: 1000 }
    }
  }
]

const viewModeOptions = [
  {
    value: 'grid',
    icon: markRaw(ViewGridCard),
    tooltip: {
      content: '网格视图<br>以卡片形式展示',
      delay: { show: 1000 },
      html: true
    }
  },
  {
    value: 'list',
    icon: markRaw(ViewList),
    tooltip: {
      content: '列表视图<br>以列表形式展示',
      delay: { show: 1000 },
      html: true
    }
  }
]

// 初始加载数据
onMounted(async () => {
  await mindboardStore.fetchAllMindboards()
})

const mindboards = computed(() => mindboardStore.mindboards)

// 过滤后的思维板列表
const sortedMindboards = computed((): Mindboard[] => {
  let boards = mindboards.value

  // 根据显示模式过滤
  if (displayMode.value === 'favorite') {
    boards = boards.filter((board) => board.is_favorite)
  }

  // 先按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    boards = boards.filter(
      (board) =>
        board.name.toLowerCase().includes(query) || board.description?.toLowerCase().includes(query)
    )
  }

  // 再按排序条件排序
  return boards.sort((a: Mindboard, b: Mindboard) => {
    let comparison = 0
    switch (currentSort.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'created_at':
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        break
      case 'updated_at':
        comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// 创建新思维板
const addMindboard = async () => {
  try {
    await mindboardStore.createMindboard({
      name: '未命名思维板',
      description: '',
      flow_data: {},
      is_favorite: false
    })
  } catch (error) {
    console.error('创建思维板失败:', error)
  }
}

// 排序选项
const sortOptions = [
  { value: 'name', label: '按名称排序' },
  { value: 'created_at', label: '按创建时间排序' },
  { value: 'updated_at', label: '按更新时间排序' }
]

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

// 点击其他地方关闭排序菜单
const closeDropdown = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.sort-button-container')) {
    showSortMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

// 处理搜索
const handleSearch = () => {
  // 这里可以添加防抖逻辑如果需要
  // 目前使用计算属性自动过滤即可
}

// 格式化完整时间
const formatFullTime = (time: string) => {
  return format(new Date(time), 'yyyy-MM-dd HH:mm:ss')
}

// 切换收藏状态
const toggleFavorite = async (id: string) => {
  await mindboardStore.toggleFavorite(id)
}

// 添加菜单相关状态
const menuItems = ref<MenuItem[]>([
  {
    name: 'rename',
    icon: markRaw(Edit),
    label: '修改名称',
    action: () => {
      if (pendingDeleteMindboard.value) {
        startEditing(pendingDeleteMindboard.value)
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

// 处理更多按钮点击
const handleMoreClick = (event: MouseEvent, mindboard: Mindboard) => {
  event.stopPropagation()
  // 保存当前点击的按钮元素
  currentMoreBtnRef.value = event.currentTarget as HTMLElement
  pendingDeleteMindboard.value = mindboard
  activeMoreMenu.value = mindboard.id
}

// 关闭菜单
const closeMoreMenu = () => {
  activeMoreMenu.value = null
  pendingDeleteMindboard.value = null
  currentMoreBtnRef.value = null
}

// 处理菜单项点击
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

// 处理删除确认
const handleConfirmDelete = async () => {
  if (pendingDeleteMindboard.value) {
    await mindboardStore.deleteMindboard(pendingDeleteMindboard.value.id)
    showDeleteConfirm.value = false
    closeMoreMenu()
  }
}

// 取消删除
const handleCancelDelete = () => {
  showDeleteConfirm.value = false
  pendingDeleteMindboard.value = null
}

// 开始编辑
const startEditing = (mindboard: Mindboard) => {
  editingId.value = mindboard.id
  editingName.value = mindboard.name
  closeMoreMenu()
  // 等待 DOM 更新后聚焦输入框
  nextTick(() => {
    const input = nameInputRefs.value[mindboard.id]
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// 完成编辑
const finishEditing = async () => {
  if (editingId.value && editingName.value.trim()) {
    await mindboardStore.updateMindboardName(editingId.value, editingName.value.trim())
    editingId.value = null
    editingName.value = ''
  }
}

// 取消编辑
const cancelEditing = () => {
  editingId.value = null
  editingName.value = ''
}

// 点击其他地方关闭菜单
const closeMenus = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.more-button-container')) {
    activeMoreMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenus)
})
</script>

<style lang="scss" scoped>
.mindboard-view {
  height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;

  .header {
    padding: 16px 24px;
    background: #ffffff;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 20px;
      font-weight: 500;
      color: #495057;
    }

    .actions {
      display: flex;
      gap: 12px;

      .sort-btn {
        padding: 6px 12px;
        border-radius: 6px;
        background: #ffffff;
        border: 1px solid #e9ecef;
        color: #495057;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #f8f9fa;
        }

        &.active {
          background: #e7f5ff;
          border-color: #74c0fc;
          color: #1971c2;
        }
      }
    }
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background: var(--color-bg-primary);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    align-content: start;
    justify-content: center;

    @media (max-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      padding: 16px;
    }
  }
}

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

  .view-mode-control {
    display: flex;
    align-items: center;
    height: 36px;
    // border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-bg-primary);

    .view-mode-button {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--color-text-secondary);

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

      &:first-child {
        border-right: 1px solid var(--color-border);
      }

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.active {
        background-color: var(--color-primary);
        color: var(--color-bg-primary);
      }
    }
  }
}

.mindboard-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  overflow: hidden;

  .card-grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: var(--color-bg-primary);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 20px;
    align-content: start;
    justify-content: center;

    @media (max-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      padding: 16px;
    }
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;

    .modal-content {
      background-color: var(--color-bg-primary);
      padding: 20px;
      border-radius: 10px;
      width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

      h2 {
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 18px;
        text-align: center;
        color: var(--color-text-primary);
      }

      input {
        width: 100%;
        padding: 10px;
        margin-bottom: 20px;
        border: 1px solid var(--color-primary);
        border-radius: 5px;
        font-size: 16px;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary), 0.2);
        }
      }

      .modal-actions {
        display: flex;
        justify-content: center;

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          background-color: var(--color-primary);
          color: var(--color-bg-primary);
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;

          &:hover {
            background-color: var(--color-menu-active-bg);
          }

          &:disabled {
            background-color: #ccc;
            cursor: not-allowed;
          }
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
    background-color: var(--color-bg-primary);

    .empty-icon {
      width: 300px;
      height: 300px;
      margin-bottom: 20px;
    }

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 14px;
      text-align: center;
    }
  }
}

.dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background-color: #d0d0d0;
  border-radius: 3px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background-color: #f0f0f0;
}

.sort-direction {
  font-size: 12px;
  margin-left: 5px;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    padding: 16px;
  }
}

.list-view {
  width: 100%;

  .list-header {
    display: flex;
    align-items: center;
    padding: 0 16px 12px 16px;
    border-bottom: 1px solid var(--color-border);
    font-weight: 500;
    color: var(--color-text-secondary);
    font-size: 14px;

    .header-preview {
      width: 40px;
      margin-right: 16px;
    }

    .header-name {
      flex: 1;
      margin-right: 16px;
    }

    .header-time {
      width: 180px;
      margin-right: 16px;
    }

    .header-favorite {
      width: 40px;
      margin-right: 16px;
      text-align: center;
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

    .item-preview {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      overflow: hidden;
      margin-right: 16px;
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .no-preview {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-bg-secondary);
        color: var(--color-text-secondary);
      }
    }

    .item-name {
      flex: 1;
      font-size: 14px;
      color: var(--color-text-primary);
      margin-right: 16px;

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

    .item-time {
      width: 180px;
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-right: 16px;
      font-family: var(--font-mono);
    }

    .item-favorite {
      width: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;

      .favorite-icon {
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
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

        &:hover {
          transform: scale(1.1);
        }
      }
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

        &:hover {
          transform: scale(1.1);
        }
      }
    }
  }
}
</style>
