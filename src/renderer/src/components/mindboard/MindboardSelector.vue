<template>
  <div v-if="visible" class="mindboard-selector-modal" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>选择思维板</h3>
        <button class="close-button" @click="handleClose">
          <CloseSmall theme="outline" size="22" :stroke-width="3" />
        </button>
      </div>
      <div class="modal-body">
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        <template v-else>
          <div v-if="mindboards.length === 0" class="empty-state">
            <p>暂无思维板</p>
            <button class="create-button" @click="handleCreateMindboard">创建思维板</button>
          </div>
          <div v-else class="mindboard-list">
            <div
              v-for="mindboard in mindboards"
              :key="mindboard.id"
              class="mindboard-item"
              @click="handleSelect(mindboard)"
            >
              <div class="preview">
                <img v-if="mindboard.preview_image" :src="mindboard.preview_image" alt="预览图" />
                <div v-else class="no-preview">
                  <MindmapMap theme="outline" size="24" :strokeWidth="3" />
                </div>
              </div>
              <div class="info">
                <div class="name">{{ mindboard.name }}</div>
                <div class="time">更新于: {{ formatTime(mindboard.updated_at) }}</div>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="modal-footer">
        <button class="cancel-button" @click="handleClose">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { CloseSmall, MindmapMap } from '@icon-park/vue-next'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { message } from '@renderer/utils/message'
import { format } from 'date-fns'
import type { Mindboard } from '@shared/types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [mindboardId: string]
  create: []
}>()

const mindboardStore = useMindboardStore()
const mindboards = ref<Mindboard[]>([])
const isLoading = ref(true)

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
  }
}

// 处理选择思维板
const handleSelect = (mindboard: Mindboard) => {
  emit('select', mindboard.id)
}

// 处理关闭模态框
const handleClose = () => {
  emit('close')
}

// 处理创建新思维板
const handleCreateMindboard = () => {
  emit('create')
}

// 格式化时间
const formatTime = (time: string) => {
  return format(new Date(time), 'yyyy-MM-dd HH:mm')
}

// 组件挂载时加载思维板列表
onMounted(() => {
  if (props.visible) {
    fetchMindboards()
  }
})

// 监听visible变化
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      fetchMindboards()
    }
  }
)
</script>

<style lang="scss" scoped>
.mindboard-selector-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  .modal-content {
    width: 600px;
    max-width: 90%;
    background-color: var(--color-bg-primary);
    border-radius: 12px;
    box-shadow: var(--shadow-primary);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .modal-header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    max-height: 60vh;

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--color-border);
        border-radius: 50%;
        border-top-color: var(--color-primary);
        animation: spin 1s linear infinite;
        margin-bottom: 12px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px 0;
      color: var(--color-text-secondary);

      .create-button {
        margin-top: 16px;
        padding: 8px 16px;
        background-color: var(--color-primary);
        color: var(--color-bg-primary);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;

        &:hover {
          background-color: var(--color-primary-dark);
        }
      }
    }

    .mindboard-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .mindboard-item {
        display: flex;
        padding: 12px;
        border-radius: 8px;
        transition: background-color 0.2s;
        cursor: pointer;

        &:hover {
          background-color: var(--color-hover-bg);
        }

        .preview {
          width: 80px;
          height: 60px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid var(--color-border);
          margin-right: 16px;
          background-color: var(--color-bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .no-preview {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            color: var(--color-text-secondary);
          }
        }

        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;

          .name {
            font-size: 16px;
            font-weight: 500;
            color: var(--color-text-primary);
            margin-bottom: 4px;
          }

          .time {
            font-size: 13px;
            color: var(--color-text-secondary);
          }
        }
      }
    }
  }

  .modal-footer {
    padding: 12px 20px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--color-border);

    .cancel-button {
      padding: 8px 16px;
      background-color: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background-color: var(--color-hover-bg);
      }
    }
  }
}
</style>
