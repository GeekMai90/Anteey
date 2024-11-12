<template>
  <div class="history-panel" :class="{ 'is-open': show }">
    <div class="history-panel-content">
      <!-- 顶部区域 -->
      <div class="panel-header">
        <div class="header-info">
          <img src="@resources/avatar.png" alt="安安" class="assistant-avatar" />
          <div class="header-text">
            <h2>安安</h2>
            <p class="subtitle">你好，我是安安，你的专属智能伙伴，有什么问题都可以问我哦</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <Close theme="outline" size="18" />
        </button>
      </div>

      <!-- 操作按钮区 -->
      <div class="action-section">
        <button class="new-chat-btn" @click="handleNewChat">新建对话</button>
      </div>

      <!-- 历史记录列表 -->
      <div class="history-section">
        <div class="section-header">
          <span class="section-title">对话历史</span>
          <button
            v-if="assistantStore.chatHistory.length > 0"
            class="clear-btn"
            @click="showClearConfirm = true"
          >
            <Delete theme="outline" size="14" />
          </button>
        </div>
        <div class="history-list">
          <div
            v-for="item in assistantStore.chatHistory"
            :key="item.id"
            class="history-item"
            :class="{ pinned: item.isPinned }"
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
                  {{ formatDateOnly(item.createdAt) }}
                </span>
                <!-- 操作按钮只在悬浮时显示 -->
                <div v-show="hoveredItem === item.id" class="item-actions">
                  <button class="action-btn" @click.stop="handleEditClick(item)">
                    <Edit theme="outline" size="14" />
                  </button>
                  <button class="action-btn" @click.stop="handleTogglePin(item.id)">
                    <Pushpin
                      theme="outline"
                      size="14"
                      :fill="item.isPinned ? 'var(--color-primary)' : 'var(--color-text-tertiary)'"
                    />
                  </button>
                  <button class="action-btn" @click.stop="handleDeleteClick(item.id)">
                    <Delete theme="outline" size="14" />
                  </button>
                </div>
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

  <!-- 确认清空对话框 -->
  <ConfirmDialog
    v-model:visible="showClearConfirm"
    title="清空确认"
    message="确定要清空所有对话历史吗？此操作不可恢复。"
    type="danger"
    confirm-text="确定"
    cancel-text="取消"
    @confirm="handleClearConfirm"
    @cancel="showClearConfirm = false"
  />

  <!-- 编辑标题对话框 -->
  <InputDialog
    v-model:visible="showEditDialog"
    title="编辑标题"
    :placeholder="'请输入新的标题'"
    :initial-value="editingItem?.title || getFirstUserMessage(editingItem)"
    confirm-text="确定"
    cancel-text="取消"
    @confirm="handleEditConfirm"
    @cancel="showEditDialog = false"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Delete, Edit, Pushpin, Close } from '@icon-park/vue-next'
import { useAssistantStore } from '@renderer/stores/assistantStore'
import type { RAGHistoryRecord } from '@renderer/types/assistant'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import InputDialog from '@renderer/components/common/InputDialog.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'new-chat'): void
}>()

const assistantStore = useAssistantStore()
const hoveredItem = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const showClearConfirm = ref(false)
const showEditDialog = ref(false)
const editingItem = ref<RAGHistoryRecord | null>(null)
const pendingDeleteId = ref<string | null>(null)

// 加载历史记录
onMounted(async () => {
  await assistantStore.loadHistory()
})
watch(
  () => props.show,
  async (newValue) => {
    if (newValue) {
      await assistantStore.loadHistory()
    }
  }
)

// 处理新建对话
const handleNewChat = () => {
  assistantStore.clearMessages()
  emit('new-chat')
  emit('close')
}

// 选择历史记录
const handleSelectHistory = async (id: string) => {
  await assistantStore.loadHistoryChat(id)
  emit('close')
}

// 切换置顶状态
const handleTogglePin = async (id: string) => {
  await assistantStore.toggleHistoryPin(id)
}

// 处理编辑点击
const handleEditClick = (item: RAGHistoryRecord) => {
  editingItem.value = item
  showEditDialog.value = true
}

// 处理编辑确认
const handleEditConfirm = async (result: { name: string }) => {
  if (editingItem.value) {
    await assistantStore.updateHistoryTitle(editingItem.value.id, result.name)
  }
  showEditDialog.value = false
  editingItem.value = null
}

// 处理删除点击
const handleDeleteClick = (id: string) => {
  pendingDeleteId.value = id
  showDeleteConfirm.value = true
}

// 处理删除确认
const handleDeleteConfirm = async () => {
  if (pendingDeleteId.value) {
    await assistantStore.deleteHistory(pendingDeleteId.value)
    pendingDeleteId.value = null
  }
  showDeleteConfirm.value = false
}

// 处理清空确认
const handleClearConfirm = async () => {
  await assistantStore.clearAllHistory()
  showClearConfirm.value = false
}

// 添加获取第一条用户消息的辅助函数
const getFirstUserMessage = (item: RAGHistoryRecord | null): string => {
  if (!item) return ''
  const firstUserMessage = item.messages.find((msg) => msg.role === 'user')
  return firstUserMessage?.content || ''
}

// 添加一个只显示日期的格式化函数
const formatDateOnly = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
}
</script>

<style scoped lang="scss">
.history-panel {
  position: fixed;
  top: 50%;
  right: -100%;
  transform: translateY(-50%);
  z-index: 1000;
  transition: right 0.3s ease;
  height: 90vh;

  &.is-open {
    right: 20px;
  }
}

.history-panel-content {
  width: 320px;
  height: 100%;
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--color-border);

  .header-info {
    display: flex;
    gap: 12px;
  }

  .assistant-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .header-text {
    h2 {
      font-size: 16px;
      font-weight: 500;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.4;
    }
  }
}

.close-btn {
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 4px;

  &:hover {
    background: var(--color-hover-bg);
  }
}

.action-section {
  padding: 16px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);

  .new-chat-btn {
    flex: 1;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
}

.history-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .section-title {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.clear-btn {
  padding: 4px;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: var(--color-hover-bg);
    color: var(--color-text-secondary);
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  height: 44px;
  display: flex;
  align-items: center;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.pinned {
    background: var(--color-bg-secondary);
  }
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.item-header {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.history-title {
  flex: 1;
  font-size: 14px;
  line-height: 20px;
  color: var(--color-text-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-date {
  font-size: 12px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: 8px;
}

.item-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }
}
</style>
