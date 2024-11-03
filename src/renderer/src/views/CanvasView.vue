<template>
  <div class="canvas-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <Platte theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">画布</div>
          </div>
          <div class="topToolBar-right">
            <!-- 搜索框 -->
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
                placeholder="搜索画布"
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
            <!-- 新增画布 -->
            <div class="add-canvas-button" @click="addCanvas">
              <div class="icon">
                <Plus
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">新增画布</div>
            </div>
            <button @click="createAndOpenCanvas">创建新画布</button>
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
    <div class="canvas-view-container">
      <div class="card-grid-container">
        <div class="card-grid">
          <CanvasCard v-for="canvas in sortedCanvases" :key="canvas.id" :canvas="canvas" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { SortTwo, Platte, Plus, Search, Close } from '@icon-park/vue-next'
import { useCanvasStore } from '@renderer/stores/canvasStore'
import CanvasCard from '@renderer/components/canvas/CanvasCard.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const canvasStore = useCanvasStore()

// 搜索相关
const searchQuery = ref('')
const isSearchFocused = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

// 排序相关
const showSortMenu = ref(false)
const currentSort = ref('updatedAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { label: '更新时间', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '名称', value: 'name' }
]

const createAndOpenCanvas = async () => {
  try {
    const canvas = await canvasStore.createCanvas({
      name: '新画布',
      description: ''
    })
    router.push(`/canvas/${canvas.id}`)
  } catch (error) {
    console.error('创建画布失败:', error)
  }
}
// 计算属性：排序后的画布列表
const sortedCanvases = computed(() => {
  let sorted = [...canvasStore.canvases]

  if (searchQuery.value) {
    sorted = sorted.filter((canvas) =>
      canvas.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  sorted.sort((a, b) => {
    if (currentSort.value === 'name') {
      return sortDirection.value === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    } else {
      const aValue = a[currentSort.value as keyof typeof a] ?? ''
      const bValue = b[currentSort.value as keyof typeof b] ?? ''
      return sortDirection.value === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1
    }
  })

  return sorted
})

// 方法
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

const handleBlur = () => {
  isSearchFocused.value = false
}

const clearSearch = () => {
  searchQuery.value = ''
}

const toggleSortMenu = () => {
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

const addCanvas = async () => {
  try {
    const canvas = await canvasStore.createCanvas({
      name: '新画布',
      description: ''
    })
    router.push(`/canvas/${canvas.id}`)
  } catch (error) {
    console.error('创建画布失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  await canvasStore.fetchAllCanvases()
})

// 点击其他地方关闭排序菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.sort-button-container')) {
    showSortMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.canvas-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--color-bg-primary);
  }

  .topToolBar {
    padding: 0 20px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-primary);

    .topToolBar-header {
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .topToolBar-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .name {
          font-size: 16px;
          font-weight: 500;
          color: var(--color-text-primary);
        }
      }

      .topToolBar-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .add-canvas-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
          background-color: var(--color-primary);

          &:hover {
            opacity: 0.8;
          }

          .icon {
            display: flex;
            align-items: center;
          }

          .name {
            color: #fff;
            font-size: 14px;
          }
        }

        .sort-button-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;

          &:hover {
            background-color: var(--color-hover-bg);
          }

          .icon {
            display: flex;
            align-items: center;
          }

          .name {
            color: var(--color-text-primary);
            font-size: 14px;
          }
        }

        .sort-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background-color: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          box-shadow: var(--shadow-primary);
          min-width: 160px;
          z-index: 1000;

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
          }
        }
      }
    }
  }
}

.canvas-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  overflow: hidden;

  .card-grid-container {
    flex: 1;
    overflow-y: auto;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    padding: 16px 20px;
    align-content: start;
    justify-content: center;

    --card-height: clamp(150px, calc(20vw - 32px), 150px);
    grid-auto-rows: var(--card-height);
    --cards-per-row: calc((100% - 32px) / (300px + 16px));
  }
}

.search-box {
  position: relative;
  width: 200px;
  display: flex;
  align-items: center;
  background-color: var(--color-bg-secondary);
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
}

// 滚动条样式
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
</style>
