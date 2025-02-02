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
            <!-- 新增思维板 -->
            <div class="add-mindboard-button" @click="addMindboard">
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
    <div class="mindboard-view-container">
      <div class="card-grid-container">
        <div class="card-grid">
          <MindboardCard
            v-for="mindboard in sortedMindboards"
            :key="mindboard.id"
            :mindboard="mindboard"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Workbench, Plus } from '@icon-park/vue-next'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import MindboardCard from '@renderer/components/mindboard/MindboardCard.vue'
import type { Mindboard } from '@shared/types'

const mindboardStore = useMindboardStore()
const showSortMenu = ref(false)
const currentSort = ref('name')
const sortDirection = ref('asc')

// 初始加载数据
onMounted(async () => {
  await mindboardStore.fetchAllMindboards()
})

const mindboards = computed(() => mindboardStore.mindboards)

// 排序后的思维板列表
const sortedMindboards = computed((): Mindboard[] => {
  const boards = mindboards.value
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

  .add-mindboard-button {
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
</style>
