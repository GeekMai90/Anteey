<!-- src/renderer/src/views/AIAssistant.vue -->
<template>
  <div class="ai-assistant-container">
    <!-- 欢迎区域 -->
    <div v-if="messages.length === 0" class="welcome-section">
      <div class="ai-icon">🤖</div>
      <h2>Hi! How can I help you today?</h2>

      <!-- 建议操作区 -->
      <div class="suggested-actions">
        <h3>Suggested</h3>
        <div class="action-buttons">
          <button class="action-btn" @click="handleSuggestedAction('我想问一个问题')">
            <SearchOne theme="outline" size="18" />
            Ask a question
          </button>
          <button class="action-btn" @click="handleSuggestedAction('帮我写一段内容')">
            <Write theme="outline" size="18" />
            Draft anything
          </button>
          <button class="action-btn" @click="handleSuggestedAction('帮我头脑风暴一些想法')">
            <Lightbulb theme="outline" size="18" />
            Brainstorm ideas
          </button>
        </div>
      </div>

      <!-- 常用功能区 -->
      <div class="common-actions">
        <h3>Think, ask, chat</h3>
        <div class="action-buttons">
          <button class="action-btn" @click="handleSuggestedAction('帮我总结一下')">
            <Notes theme="outline" size="18" />
            Summarize
          </button>
          <button class="action-btn" @click="handleSuggestedAction('帮我解决代码问题')">
            <Code theme="outline" size="18" />
            Get help with code
          </button>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div v-else class="chat-section">
      <div class="messages" ref="messagesContainer">
        <div v-for="msg in messages" :key="msg.id" :class="['message', msg.role]">
          <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
      <div class="input-container">
        <input
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          :placeholder="isProcessing ? 'Processing...' : 'Ask anything or select...'"
          :disabled="isProcessing"
        />
        <div class="input-actions">
          <div v-if="isProcessing" class="loading-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <button class="action-icon" v-else>
            <All theme="outline" size="18" />
          </button>
          <button class="action-icon">
            <Attachment theme="outline" size="18" />
          </button>
          <button class="action-icon">
            <Config theme="outline" size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { Notes, Config, Write, Code } from '@icon-park/vue-next'
import { useAssistantStore } from '@renderer/stores/assistantStore'
import { storeToRefs } from 'pinia'

const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const assistantStore = useAssistantStore()
const { messages, isProcessing } = storeToRefs(assistantStore)

// 快捷操作处理函数
const handleSuggestedAction = (prompt: string) => {
  inputMessage.value = prompt
  sendMessage()
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isProcessing.value) return

  try {
    await assistantStore.sendMessage(inputMessage.value)
    inputMessage.value = ''
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 监听消息变化，自动滚动
watch(() => messages.value.length, scrollToBottom)

// 加载历史记录
onMounted(async () => {
  try {
    await assistantStore.loadHistory()
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
})
</script>

<style scoped>
.ai-assistant-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
  padding: 2rem;
}

.welcome-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.ai-icon {
  font-size: 3rem;
}

.suggested-actions,
.common-actions {
  width: 100%;
  max-width: 600px;
}

h2 {
  font-size: 1.5rem;
  font-weight: 500;
  color: #333;
}

h3 {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-size: 0.875rem;
  color: #333;
}

.action-btn:hover {
  background: #f5f5f5;
}

.input-section {
  margin-top: auto;
  padding: 1rem 0;
}

.input-container {
  display: flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  padding: 0.5rem;
}

input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.input-actions {
  display: flex;
  gap: 0.5rem;
}

.action-icon {
  padding: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #666;
}

.action-icon:hover {
  color: #333;
}

.chat-section {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.message {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.message.user {
  background: #f5f5f5;
}

.message.assistant {
  background: #fff;
  border: 1px solid #e0e0e0;
}

.avatar {
  font-size: 1.5rem;
}

.message-content {
  flex: 1;
  line-height: 1.5;
  white-space: pre-wrap;
}

.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
}

.dot {
  width: 4px;
  height: 4px;
  background: #666;
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
</style>
