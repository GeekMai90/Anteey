<template>
  <div class="ai-assistant-container">
    <!-- 顶部栏 -->
    <div v-if="currentMode || messages.length > 0" class="top-bar">
      <div class="assistant-info">
        <img src="@resources/avatar.png" alt="安安" class="assistant-avatar" />
        <div class="assistant-name">安安</div>
      </div>
      <div class="top-actions">
        <button class="top-action-btn menu-btn">
          <div class="icon">
            <More theme="outline" size="18" />
          </div>
        </button>
      </div>
    </div>
    <!-- 初始状态：建议操作区 -->
    <div v-if="!currentMode && messages.length === 0" class="welcome-section">
      <div class="ai-info">
        <img src="@resources/avatar.png" alt="安安" class="ai-avatar" />
        <div class="ai-name">安安</div>
      </div>
      <h2>嗨~ 我是安安，很高兴能陪你记录成长的点点滴滴 🥰</h2>

      <!-- 建议操作区 -->
      <div class="suggestions-container">
        <h3>我们能做什么？</h3>
        <div class="suggestions-scroll">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion.id"
            class="suggestion-btn"
            @click="selectMode(suggestion)"
          >
            <div class="icon">
              <component :is="suggestion.icon" theme="outline" size="18" />
            </div>
            <div class="name">{{ suggestion.text }}</div>
          </button>
        </div>
      </div>

      <!-- 常用功能区 -->
      <div class="suggestions-container">
        <h3>思考、提问、聊天</h3>
        <div class="suggestions-scroll">
          <button
            v-for="action in commonActions"
            :key="action.id"
            class="suggestion-btn"
            @click="selectMode(action)"
          >
            <div class="icon">
              <component :is="action.icon" theme="outline" size="18" />
            </div>
            <div class="name">{{ action.text }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div v-else class="chat-section">
      <!-- 模式指示器 -->
      <div v-if="currentMode" class="mode-indicator">
        <div class="mode-badge">
          <component :is="currentMode.icon" theme="outline" size="18" />
          {{ currentMode.text }}
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messagesContainer" class="messages">
        <div v-for="msg in messages" :key="msg.id" :class="['message-wrapper', msg.role]">
          <div class="message">
            <!-- 用户消息直接显示 -->
            <template v-if="msg.role === 'user'">
              {{ msg.content }}
            </template>
            <!-- AI消息使用打字机效果 -->
            <template v-else-if="msg.role === 'assistant'">
              <TypewriterText :key="msg.id" :content="msg.content" />
              <!-- 引用信息区域 -->
              <div class="message-references">
                <button
                  class="reference-btn"
                  :class="{ active: expandedMessageId === msg.id }"
                  @click="toggleReferences(msg.id)"
                >
                  <component
                    :is="msg.sourceType === 'notes' ? Notes : Brain"
                    theme="outline"
                    size="14"
                  />
                  {{
                    msg.sourceType === 'notes'
                      ? `引用自 ${msg.references?.length} 篇笔记`
                      : '基于 AI 知识库'
                  }}
                </button>

                <!-- 展开的引用列表 -->
                <div v-if="expandedMessageId === msg.id" class="references-list">
                  <!-- AI 知识库的提示 -->
                  <div v-if="msg.sourceType === 'ai'" class="ai-reference-tip">
                    所有内容均由 AI 生成，仅供参考
                  </div>

                  <!-- 笔记引用列表 -->
                  <template v-else>
                    <div
                      v-for="reference in msg.references"
                      :key="reference.noteId"
                      class="reference-item"
                    >
                      <div class="reference-header">
                        <span class="reference-address">{{ reference.address }}</span>
                        <span class="reference-similarity">
                          相关度 {{ (reference.similarity * 100).toFixed(0) }}%
                        </span>
                      </div>
                      <div class="reference-content">{{ reference.title }}</div>
                      <div class="reference-meta">创建于 {{ formatDate(reference.createdAt) }}</div>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 加载状态消息 -->
        <div v-if="isProcessing" class="message-wrapper assistant">
          <div class="message loading">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-wrapper">
        <!-- 新对话按钮 -->
        <button
          v-if="currentMode || messages.length > 0"
          class="new-chat-btn"
          @click="startNewChat"
        >
          <div class="new-chat-avatar">🤖</div>
        </button>

        <div class="input-container">
          <input
            v-model="inputMessage"
            :placeholder="getPlaceholder"
            :disabled="isProcessing"
            @keyup.enter="sendMessage"
          />
          <div class="input-actions">
            <button class="action-icon link-btn">
              <Link theme="outline" size="18" />
            </button>
            <button class="action-icon send-btn" @click="sendMessage">
              <Send theme="outline" size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick, markRaw } from 'vue'
import { useAssistantStore } from '@renderer/stores/assistantStore'
import { storeToRefs } from 'pinia'
import {
  Search as SearchOne,
  Write,
  Brain,
  Notes,
  Code,
  Link,
  Send,
  More
} from '@icon-park/vue-next'
import type { Suggestion } from '@renderer/types/assistant'
import TypewriterText from '@renderer/components/aiassistant/TypewriterText.vue'

// Store
const assistantStore = useAssistantStore()
const { messages, isProcessing } = storeToRefs(assistantStore)

// Refs
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const currentMode = ref<Suggestion | null>(null)

// 建议列表
const suggestions: Suggestion[] = [
  {
    id: 'ask',
    text: '从你的笔记中搜索相关内容',
    icon: markRaw(SearchOne),
    mode: 'ask',
    prompt: '',
    description: '从你的笔记中搜索相关内容'
  },
  {
    id: 'draft',
    text: '帮你起草任何内容',
    icon: markRaw(Write),
    mode: 'draft',
    prompt: '',
    description: '帮你起草任何内容'
  },
  {
    id: 'brainstorm',
    text: '头脑风暴新想法',
    icon: markRaw(Brain),
    mode: 'brainstorm',
    prompt: '',
    description: '头脑风暴新想法'
  }
]

// 常用功能
const commonActions: Suggestion[] = [
  {
    id: 'summarize',
    text: '总结文本内容',
    icon: markRaw(Notes),
    mode: 'summarize',
    prompt: '',
    description: '总结文本内容'
  },
  {
    id: 'code',
    text: '解决代码相关问题',
    icon: markRaw(Code),
    mode: 'code',
    prompt: '',
    description: '解决代码相关问题'
  }
]

// 计算属性
const getPlaceholder = computed(() => {
  if (isProcessing.value) return 'Processing...'
  if (currentMode.value) return `${currentMode.value.description}...`
  return '提问、思考、聊天...'
})

// 方法
const selectMode = (suggestion: Suggestion) => {
  currentMode.value = suggestion
  if (suggestion.prompt) {
    inputMessage.value = suggestion.prompt
    sendMessage()
  }
}

const startNewChat = () => {
  currentMode.value = null
  assistantStore.clearMessages()
  inputMessage.value = ''
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isProcessing.value) return

  const message = inputMessage.value
  inputMessage.value = ''

  try {
    await assistantStore.sendMessage(message)
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 控制引用列表的展开状态
const expandedMessageId = ref<string | null>(null)

// 切换引用列表的展开/收起
const toggleReferences = (messageId: string) => {
  expandedMessageId.value = expandedMessageId.value === messageId ? null : messageId
}

// 格式化日期的工具函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 监听消息变化，自动滚动
watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  }
)
</script>

<style scoped lang="scss">
.ai-assistant-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
  padding: 2rem;
  padding-top: 0;
  align-items: center;
}

/* 顶部栏样式 */
.top-bar {
  position: sticky;
  top: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: var(--color-bg-primary);
  z-index: 100;
}

.assistant-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assistant-avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%; /* 使图片变为圆形 */
  object-fit: cover; /* 确保图片填充满区域 */
  border: 1px solid rgba(0, 0, 0, 0.1); /* 可选：添加细边框 */
}

.assistant-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.top-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.top-action-btn {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

.new-chat-btn {
  &:hover {
    background: var(--color-shape-secondary);
    border-color: var(--color-shape-secondary);
  }
}

.menu-btn {
  padding: 0.5rem;

  &:hover {
    background: var(--color-shape-secondary);
    border-color: var(--color-shape-secondary);
  }
}

/* 欢迎区域 */
.welcome-section {
  max-width: 768px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem 0;
  margin-top: 100px;
}

.ai-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.ai-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%; /* 使图片变为圆形 */
  object-fit: cover; /* 确保图片填充满区域 */
  border: 1px solid rgba(0, 0, 0, 0.1); /* 可选：添加细边框 */
}

.ai-name {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 建议区域 */
.suggestions-container {
  width: 100%;
  margin-top: 1rem;
}

.suggestions-container h3 {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.suggestions-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-shape-secondary);
  border-radius: 0.5rem;
  background: var(--color-bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
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

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}

.suggestion-btn:hover {
  background: var(--color-shape-secondary);
}

/* 对话区域 */
.chat-section {
  flex: 1;
  width: 100%;
  max-width: 768px;
  overflow-y: auto;
  padding: 1rem 0;
}

.mode-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.mode-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-shape-secondary);
  border-radius: 2rem;
  font-size: 0.875rem;
}

/* 消息容器 */
.messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  overflow-y: auto;
}

/* 消息包装器 */
.message-wrapper {
  display: flex;
  max-width: 85%;
}

/* 用户消息靠右 */
.message-wrapper.user {
  margin-left: auto;
}

/* 基础消息样式 */
.message {
  padding: 0.7rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}

/* 用户消息样式 */
.message-wrapper.user .message {
  background: var(--color-primary);
  color: var(--color-text-inversion);
  border-radius: 1rem 0 1rem 1rem;
}

/* AI消息样式 */
.message-wrapper.assistant .message {
  background: var(--color-bg-ai-assistant);
  color: var(--color-text-primary);
  border-radius: 0 1rem 1rem 1rem;
}

/* 消息出现动画 */
.message-wrapper {
  animation: messageSlide 0.3s ease-out;
  opacity: 0;
  animation-fill-mode: forwards;
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* 消息内容样式 */
.message-content {
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 输入区域 */
.input-section {
  width: 100%;
  max-width: 768px;
  margin-top: auto;
  padding: 1rem 0;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.new-chat-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-shape-secondary);
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: var(--color-shape-secondary);
}

.input-container {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-shape-secondary);
  border-radius: 0.5rem;
  padding: 6px;
  background: var(--color-bg-primary);
  transition: border-color 0.2s ease; /* 添加过渡效果 */
}

/* 当容器内的任何元素获得焦点时 */
.input-container:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1); /* 可选：添加柔和的阴影效果 */
}

input {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px;
  font-size: 0.875rem;
}

.input-actions {
  display: flex;
  gap: 0.5rem;
  padding-left: 0.5rem;
  border-left: 1px solid var(--color-shape-secondary);
}

.action-icon {
  padding: 0.25rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;

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
.send-btn {
  width: 30px;
  height: 30px;
  background: var(--color-primary);
  border-radius: 50%;
  color: white;
  &:hover {
    opacity: 0.8;
  }
}

.link-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

/* 加载动画 */
.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
}

.dot {
  width: 4px;
  height: 4px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}
.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 加载状态消息样式 */
.message.loading {
  min-width: 60px;
  padding: 1rem;
}

/* 打字动画指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-references {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.reference-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    color: var(--color-primary);
    background: var(--color-hover-bg);
  }
}

.references-list {
  margin-top: 8px;
  padding: 8px;
  border-radius: 8px;
  background: var(--color-bg-secondary);
}

.reference-item {
  padding: 12px;
  border-radius: 6px;
  background: var(--color-bg-primary);
  & + .reference-item {
    margin-top: 8px;
  }
}

.reference-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reference-address {
  font-weight: 500;
  color: var(--color-text-primary);
}

.reference-similarity {
  font-size: 12px;
  color: var(--color-primary);
}

.reference-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.reference-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.ai-reference-tip {
  padding: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border-radius: 6px;
  text-align: center;
}
</style>
