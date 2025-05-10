<template>
  <Modal v-model="visible">
    <div class="mindboard-selector-modal">
      <div class="search-container">
        <SearchInput
          ref="searchInputRef"
          v-model="searchQuery"
          :width="750"
          :height="36"
          placeholder="搜索思维板..."
        />
      </div>
      <div class="modal-body">
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        <template v-else>
          <div v-if="filteredMindboards.length === 0" class="empty-state">
            <p>{{ mindboards.length === 0 ? '暂无思维板' : '没有匹配的思维板' }}</p>
            <button class="create-button" @click="handleCreateMindboard">创建思维板</button>
          </div>
          <div v-else class="mindboard-list">
            <div
              v-for="mindboard in filteredMindboards"
              :key="mindboard.id"
              class="mindboard-item"
              @click="handleSelect(mindboard.id)"
            >
              <div class="icon">
                <Workbench theme="outline" size="24" :strokeWidth="3" />
              </div>
              <div class="name">{{ mindboard.name }}</div>
              <div class="date">{{ formatDate(mindboard.updated_at) }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Workbench } from '@icon-park/vue-next'
import Modal from '@renderer/components/common/Modal.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { message } from '@renderer/utils/message'
import type { Mindboard } from '@shared/types'
import { format } from 'date-fns'
import {
  showMindboardSelector,
  addNotesToSelectedMindboard,
  createMindboardAndAddNotes,
  closeMindboardSelector
} from '@renderer/utils/addToMindboard'

// 搜索框引用，使用InstanceType类型
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null)

// 可见性根据全局状态计算
const visible = computed({
  get: () => showMindboardSelector.value,
  set: (val) => {
    if (!val) closeMindboardSelector()
  }
})

const mindboardStore = useMindboardStore()
const mindboards = ref<Mindboard[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

// 过滤后的思维板列表
const filteredMindboards = computed(() => {
  if (!searchQuery.value.trim()) {
    return mindboards.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return mindboards.value.filter((mindboard) => mindboard.name.toLowerCase().includes(query))
})

// 获取所有思维板
const fetchMindboards = async () => {
  try {
    isLoading.value = true
    const boards = await mindboardStore.fetchAllMindboards()
    mindboards.value = boards
  } catch (error) {
    console.error('获取思维板列表失败:', error)
    message.error('获取思维板列表失败')
  } finally {
    isLoading.value = false
    // 数据加载完成后，设置搜索框焦点
    focusSearchInput()
  }
}

// 处理选择思维板
const handleSelect = (mindboardId: string) => {
  addNotesToSelectedMindboard(mindboardId)
}

// 处理创建新思维板
const handleCreateMindboard = () => {
  createMindboardAndAddNotes()
}

// 格式化日期（只显示年月日）
const formatDate = (time: string) => {
  return format(new Date(time), 'yyyy-MM-dd')
}

// 聚焦搜索框
const focusSearchInput = () => {
  nextTick(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  })
}

// 监听显示状态
watch(
  () => showMindboardSelector.value,
  (newValue) => {
    if (newValue) {
      fetchMindboards()
      searchQuery.value = '' // 重置搜索
    }
  }
)

// 组件挂载时查看是否需要加载数据
onMounted(() => {
  if (showMindboardSelector.value) {
    fetchMindboards()
  }
})
</script>

<style lang="scss" scoped>
.mindboard-selector-modal {
  background-color: var(--color-bg-primary);
  border-radius: 12px;
  width: 800px;
  max-width: 90vw;
  height: 60vh;
  min-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-primary);
  overflow: hidden;

  .search-container {
    padding: 20px 28px 0 28px;
  }

  .modal-body {
    padding: 10px 28px;
    overflow-y: auto;
    height: 60vh;
    flex: 1;

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 0;
      min-height: 300px;

      .loading-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid var(--color-border);
        border-radius: 50%;
        border-top-color: var(--color-primary);
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 0;
      color: var(--color-text-secondary);
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .create-button {
        margin-top: 20px;
        padding: 10px 20px;
        background-color: var(--color-primary);
        color: var(--color-bg-primary);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 15px;

        &:hover {
          background-color: var(--color-primary-dark);
        }
      }
    }

    .mindboard-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 300px;

      .mindboard-item {
        display: flex;
        align-items: center;
        padding: 12px 18px;
        border-radius: 8px;
        transition: background-color 0.2s;
        cursor: pointer;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 14px;
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
          font-size: 16px;
          font-weight: 500;
          color: var(--color-text-primary);
          flex: 1;
        }

        .date {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin-left: 16px;
        }
      }
    }
  }
}
</style>
