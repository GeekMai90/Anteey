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
            <div class="name">思维板</div>
          </div>
          <div class="topToolBar-right">
            <!-- 添加搜索框 -->
            <div
              v-tooltip.bottom="{ content: 'Cmd+P', delay: { show: 1000 } }"
              class="search-box"
              :class="{ 'is-focused': isSearchFocused }"
            >
              <div class="search-icon">
                <div class="icon">
                  <Search
                    theme="outline"
                    size="16"
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
                  />
                </div>
              </div>
              <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="搜索思维板"
                @input="handleSearch"
                @focus="isSearchFocused = true"
                @blur="handleBlur"
              />
              <div v-if="searchQuery" class="clear-icon" @click="clearSearch">
                <div class="icon">
                  <Close
                    theme="outline"
                    size="16"
                    fill="var(--color-text-secondary)"
                    :strokeWidth="2"
                  />
                </div>
              </div>
            </div>
            <!-- 新增白板 -->
            <div class="add-whiteboard-button" @click="addWhiteboard">
              <div class="icon">
                <Plus
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">新增思维板</div>
            </div>
            <!-- 排序 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <div class="icon">
                <SortTwo
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">排序</div>
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
          <WhiteboardCard
            v-for="whiteboard in sortedWhiteboards"
            :key="whiteboard.id"
            :whiteboard="whiteboard"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Workbench, Plus, Search, Close } from '@icon-park/vue-next'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import WhiteboardCard from '@renderer/components/whiteboard/WhiteboardCard.vue'
import { CreateWhiteboardInput } from '@shared/types'
import { useSearch } from '@renderer/composables/useSearch'
import { Whiteboard } from '@shared/types'

const whiteboardStore = useWhiteboardStore()
const showSortMenu = ref(false)
const currentSort = ref('name')
const sortDirection = ref('asc')

// 初始加载数据
onMounted(async () => {
  // 初始加载数据
  await whiteboardStore.getTopLevelWhiteboards()
})
const whiteboards = computed(() => whiteboardStore.topLevelWhiteboards)

// 搜索功能
const { searchQuery, handleSearch, filteredItems, clearSearch } = useSearch<Whiteboard>(whiteboards)

const isSearchFocused = ref(false)

const handleBlur = () => {
  setTimeout(() => {
    isSearchFocused.value = false
  }, 100)
}

// 使用计算属性来获取白板数据
// const whiteboards = computed(() => whiteboardStore.whiteboards)
// 使用计算属性来获取并排序白板数据
const sortedWhiteboards = computed((): Whiteboard[] => {
  const boards = filteredItems.value as Whiteboard[]
  return boards.sort((a: Whiteboard, b: Whiteboard) => {
    let comparison = 0
    switch (currentSort.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
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

// 创建新白板
const addWhiteboard = async () => {
  const input: CreateWhiteboardInput = {
    name: '新思维板',
    isTopLevel: true,
    position: { x: 0, y: 0 },
    size: { width: 300, height: 150 },
    zoomLevel: 1,
    scrollPosition: { x: 0, y: 0 },
    scale: 1,
    translateX: 0,
    translateY: 0,
    parentId: 'root'
  }
  try {
    await whiteboardStore.createWhiteboard(input)
  } catch (error) {
    console.error('Failed to create whiteboard:', error)
  }
}
// 排序选项功能
const sortOptions = [
  { value: 'name', label: '按名称排序' },
  { value: 'createdAt', label: '按创建时间排序' },
  { value: 'updatedAt', label: '按更新时间排序' }
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
</script>
<style lang="scss" scoped>
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
    padding: 8px 0;
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
    color: var(--default-text-color);
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

  .add-whiteboard-button {
    display: flex;
    align-items: center;
    // width: 100px;
    padding: 2px 12px 2px 7px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    user-select: none;
    height: 36px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s;
      padding: 0;
      // margin-right: 3px;

      &:hover:not(:disabled) {
        background-color: var(--color-hover-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 新增以下样式来处理 i-icon 类
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 16px; // 或者您想要的大小
        height: 16px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 14px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
      line-height: 1;
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
      // border: 1px solid var(--color-primary);
    }
  }

  .sort-button-container {
    display: flex;
    align-items: center;
    // width: 100px;
    padding: 2px 12px 2px 7px;
    border: none;
    background: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    user-select: none;
    height: 36px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s;
      padding: 0;
      // margin-right: 3px;

      &:hover:not(:disabled) {
        background-color: var(--color-hover-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      // 新增以下样式来处理 i-icon 类
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 16px; // 或者您想要的大小
        height: 16px; // 或者您想要的大小
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 14px;
      white-space: nowrap; // 防止文字换行
      writing-mode: horizontal-tb; // 确保文字是水平排列的
      line-height: 1;
    }

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active {
      background-color: var(--color-menu-active-bg);
      // border: 1px solid var(--color-primary);
    }

    .sort-dropdown-menu {
      position: absolute;
      top: 90%;
      // left: -10px;
      right: 20px;
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

  .search-box {
    position: relative;
    width: 200px;
    display: flex;
    align-items: center;
    // background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1px 8px;
    overflow: hidden;
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

    .clear-icon {
      cursor: pointer;
    }

    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background-color: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: var(--shadow-primary);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
    }

    .search-result-item {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--color-hover-bg);
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
</style>
