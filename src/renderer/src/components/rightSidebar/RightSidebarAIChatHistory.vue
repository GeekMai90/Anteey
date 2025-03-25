<template>
  <div
    v-show="show && isPositionReady"
    class="history-panel"
    :class="{ 'is-open': show }"
    :style="panelStyle"
  >
    <div class="history-panel-content">
      <!-- 顶部区域 -->
      <div class="panel-header">
        <div class="header-title">历史会话</div>
        <button class="close-btn" @click="$emit('close')">
          <div class="icon">
            <Close theme="outline" size="16" :strokeWidth="3" />
          </div>
        </button>
      </div>

      <!-- 历史记录列表 -->
      <div class="history-list">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="aiChatStore.conversations.length === 0" class="empty-state">
          暂无历史会话
        </div>

        <!-- 历史记录列表 -->
        <div
          v-for="item in aiChatStore.conversations"
          v-else
          :key="item.id"
          class="history-item"
          :class="{ 'is-pinned': item.isPinned }"
          @click="handleSelectHistory(item.id)"
          @mouseenter="hoveredItem = item.id"
          @mouseleave="hoveredItem = null"
        >
          <div class="item-content">
            <div class="item-header">
              <span class="history-title" :title="item.title || getFirstUserMessage(item)">
                {{ item.title || getFirstUserMessage(item) }}
              </span>
              <!-- 日期只在未悬浮时显示 -->
              <span v-show="hoveredItem !== item.id" class="history-date">
                {{ formatDateOnly(new Date(item.lastMessageAt)) }}
              </span>
              <!-- 操作按钮只在悬浮时显示 -->
              <div v-show="hoveredItem === item.id" class="item-actions">
                <button class="action-btn" @click.stop="handleDeleteClick(item.id)">
                  <Delete theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 确认删除对话框 -->
  <ConfirmDialog
    v-model:visible="showDeleteConfirm"
    title="删除确认"
    message="确定要删除这条对话历史吗？此操作不可恢复。"
    type="danger"
    confirm-text="确定"
    cancel-text="取消"
    @confirm="handleDeleteConfirm"
    @cancel="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Delete, Close } from '@icon-park/vue-next'
import { useAIChatStore } from '@renderer/stores/aiChatStore'
import type { Conversation } from '@shared/types/ai-chat'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'

const props = defineProps<{
  show: boolean
  style?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const aiChatStore = useAIChatStore()
const hoveredItem = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const pendingDeleteId = ref<string | null>(null)
const isLoading = ref(false)
const isPositionReady = ref(false)

// 计算面板样式
const panelStyle = computed(() => {
  const baseStyle = props.style || {}
  const panelHeight = 400 // 面板固定高度

  return {
    ...baseStyle,
    height: `${panelHeight}px`, // 设置固定高度
    opacity: isPositionReady.value ? 1 : 0,
    transform: isPositionReady.value ? 'translateY(0)' : 'translateY(10px)',
    transition: 'all 0.3s ease'
  }
})

// 选择历史记录
const handleSelectHistory = async (id: string) => {
  try {
    console.log('选择历史会话:', id)
    // 先清空当前会话,避免显示旧的消息
    aiChatStore.createNewConversation()
    // 获取并加载历史会话
    await aiChatStore.fetchConversationDetail(id)
    // 关闭历史面板
    emit('close')
  } catch (error) {
    console.error('加载会话失败:', error)
  }
}

// 处理删除点击
const handleDeleteClick = (id: string) => {
  pendingDeleteId.value = id
  showDeleteConfirm.value = true
}

// 处理删除确认
const handleDeleteConfirm = async () => {
  if (pendingDeleteId.value) {
    try {
      await aiChatStore.deleteConversation(pendingDeleteId.value)
      pendingDeleteId.value = null
    } catch (error) {
      console.error('删除会话失败:', error)
    }
  }
  showDeleteConfirm.value = false
}

// 获取第一条用户消息
const getFirstUserMessage = (conversation: Conversation): string => {
  const firstUserMessage = conversation.messages?.find((msg) => msg.role === 'user')
  return firstUserMessage?.content || conversation.title || '新对话'
}

// 格式化日期
const formatDateOnly = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  })
}

// 加载历史记录
onMounted(async () => {
  await loadHistory()
})

// 加载历史记录的方法
const loadHistory = async () => {
  isLoading.value = true
  try {
    await aiChatStore.fetchConversations()
  } catch (error) {
    console.error('加载历史记录失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 监听显示状态变化
watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      isPositionReady.value = false
      nextTick(() => {
        isPositionReady.value = true
      })
      loadHistory()
    }
  }
)
</script>

<style scoped lang="scss">
.history-panel {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  visibility: hidden;

  &.is-open {
    pointer-events: auto;
    visibility: visible;
  }
}

.history-panel-content {
  width: 280px;
  height: 400px; // 设置固定高度
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform-origin: bottom right;
}

.panel-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);

  .header-title {
    font-size: 15px;
    font-weight: 500;
  }

  .close-btn {
    padding: 4px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    border-radius: 6px;

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
      background: var(--color-hover-bg);
    }
  }
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.history-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  height: 44px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  margin-bottom: 8px;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.is-pinned {
    background: var(--color-bg-secondary);
  }
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 20px;
}

.history-title {
  flex: 1;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-date {
  font-size: 12px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  line-height: 20px;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    background: var(--color-hover-bg);
    color: var(--color-danger);
  }
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.loading-state {
  flex-direction: column;
  gap: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
