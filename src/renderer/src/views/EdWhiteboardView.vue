<template>
  <div class="whiteboard-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <Workbench theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">手绘板</div>
          </div>
          <div class="topToolBar-right">
            <!-- 搜索框 -->
            <div class="search-container">
              <SearchInput
                v-model="searchQuery"
                :width="150"
                :height="36"
                placeholder="搜索手绘板..."
                @input="handleSearch"
              />
            </div>
            <!-- 新增白板按钮 -->
            <SpreadButton
              :icon="Plus"
              type="default"
              :height="36"
              :tooltip="{
                content: '新建手绘板',
                delay: { show: 1000 }
              }"
              tooltipPlacement="top"
              @click="addWhiteboard"
            >
              新增手绘板
            </SpreadButton>
            <!-- 排序按钮 -->
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
          </div>
        </div>
      </div>
    </div>
    <div class="whiteboard-view-container">
      <div class="card-grid-container">
        <div class="card-grid">
          <EdWhiteboardCard
            v-for="whiteboard in sortedWhiteboards"
            :key="whiteboard.id"
            :whiteboard="whiteboard"
            @click="openWhiteboard(whiteboard.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Workbench, Plus } from '@icon-park/vue-next'
import { useEdWhiteboardStore } from '@renderer/stores/EdWhiteboardStore'
import EdWhiteboardCard from '@renderer/components/edWhiteboard/EdWhiteboardCard.vue'
import type { EdWhiteboard } from '@shared/types/edWhiteboard'
import SpreadButton from '@renderer/components/ui/SpreadButton.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'

const router = useRouter()
const edWhiteboardStore = useEdWhiteboardStore()
const showSortMenu = ref(false)
const currentSort = ref('updated_at')
const sortDirection = ref('desc')
const searchQuery = ref('')

// 初始加载数据
onMounted(async () => {
  await fetchWhiteboards()
})

// 获取白板列表
const fetchWhiteboards = async () => {
  await edWhiteboardStore.fetchWhiteboards({
    page: 0,
    page_size: 100 // 可以根据需要调整
  })
}

// 排序后的白板列表
const sortedWhiteboards = computed(() => {
  let boards = edWhiteboardStore.whiteboards

  // 先按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    boards = boards.filter((board) => board.name.toLowerCase().includes(query))
  }

  return [...boards].sort((a: EdWhiteboard, b: EdWhiteboard) => {
    let comparison = 0
    switch (currentSort.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'created_at':
        comparison = a.created_at - b.created_at
        break
      case 'updated_at':
        comparison = a.updated_at - b.updated_at
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// 创建新白板
const addWhiteboard = async () => {
  try {
    const newWhiteboard = await edWhiteboardStore.createWhiteboard({
      name: '新手绘板'
    })
    // 创建成功后直接进入编辑页面
    router.push(`/ed-whiteboard/${newWhiteboard.id}`)
  } catch (error) {
    console.error('创建白板失败:', error)
  }
}

// 打开白板
const openWhiteboard = (id: string) => {
  router.push(`/ed-whiteboard/${id}`)
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
    sortDirection.value = 'desc'
  }
  showSortMenu.value = false
}

// 点击其他地方关闭排序菜单
const closeMenuOnClickOutside = () => {
  if (showSortMenu.value) {
    showSortMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenuOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenuOnClickOutside)
})

// 添加搜索处理函数
const handleSearch = () => {
  // 这里可以添加防抖逻辑如果需要
}
</script>

<style lang="scss" scoped>
// 直接复用 WhiteboardView.vue 的样式
.whiteboard-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
  overflow: hidden;
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
    background-color: var(--color-menu-bg);
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
      background-color: var(--color-dropdown-bg);
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
}

.whiteboard-view-container {
  // height: 100%;
  // width: 100%;
  // padding: 0px 0px 10px 0px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px); // 假设顶部工具栏高度为100px，请根据实际情况调整
  overflow: hidden; // 防止整个页面滚动

  .card-grid-container {
    flex: 1;
    // height: 100%;
    overflow-y: auto; // 允许卡片网格容器滚动
    // padding: 0 16px 16px 16px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    padding: 16px 20px;
    align-content: start; // 让内容从顶部开始排列
    justify-content: center; // 水平居中对齐

    // 使用视口单位和 clamp 函数来控制卡片高度
    --card-height: clamp(150px, calc(20vw - 32px), 150px);
    grid-auto-rows: var(--card-height);
    --cards-per-row: calc((100% - 32px) / (300px + 16px));
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

.search-box {
  position: relative;
  width: 200px;
  display: flex;
  align-items: center;
  // background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0 8px;
  overflow: hidden;
  height: 36px;
  &.is-focused {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
  .search-icon {
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    pointer-events: none;
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  .clear-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    cursor: pointer;
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  input {
    flex-grow: 1;
    border: none;
    background: transparent;
    padding: 4px 4px 4px 25px;
    color: var(--color-text-secondary);
    font-size: 14px;
    min-width: 0;
    &::placeholder {
      color: var(--color-text-placeholder);
      opacity: 1;
    }

    &:focus {
      outline: none;
    }
  }
}

// ... 其他样式保持与 WhiteboardView.vue 完全一致 ...
</style>
