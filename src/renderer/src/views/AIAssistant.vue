<template>
  <div class="ai-assistant-container">
    <!-- 顶部欢迎区 -->
    <div class="welcome-section" v-if="!hasStartedChat">
      <div class="welcome-content">
        <h2>Hi! 我能帮你做这些事:</h2>
        <div class="suggested-actions">
          <div class="action-card" @click="startAction('search')">
            <div class="action-icon">🔍</div>
            <div class="action-text">
              <h3>语义搜索</h3>
              <p>智能搜索相关笔记内容</p>
            </div>
          </div>
          <div class="action-card" @click="startAction('brainstorm')">
            <div class="action-icon">💡</div>
            <div class="action-text">
              <h3>头脑风暴</h3>
              <p>帮你发散思维和创意</p>
            </div>
          </div>
          <div class="action-card" @click="startAction('summarize')">
            <div class="action-icon">📝</div>
            <div class="action-text">
              <h3>内容总结</h3>
              <p>快速总结笔记要点</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 对话区域 -->
    <div class="chat-container" ref="chatContainerRef">
      <div v-for="message in messages" :key="message.id" class="message" :class="message.type">
        <!-- 修改消息展示逻辑 -->
        <div class="message-content" v-if="message.type === 'user'">
          {{ message.content }}
        </div>
        <div class="message-content" v-else>
          <!-- 处理助手消息 -->
          <div v-if="message.searchResults">
            <div class="search-results">
              <div v-if="message.searchResults.length > 0">
                <div class="result-count">找到 {{ message.searchResults.length }} 条相关笔记：</div>
                <div
                  v-for="note in message.searchResults"
                  :key="note.id"
                  class="search-result-item"
                >
                  <h4>{{ note.title }}</h4>
                  <p class="result-preview">{{ getPreview(note.content) }}</p>
                  <div class="similarity">相关度: {{ note.similarity.toFixed(2) }}</div>
                </div>
              </div>
              <div v-else class="no-results">没有找到相关笔记</div>
            </div>
          </div>
          <div v-else>
            {{ message.content }}
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-container">
      <input
        v-model="inputText"
        :placeholder="inputPlaceholder"
        class="chat-input"
        @keyup.enter="handleSend"
      />
      <button class="send-button" :disabled="!inputText.trim()" @click="handleSend">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '../stores/noteStores'
import { Note } from '@renderer/types/Note'

interface Message {
  id: number
  content: string
  type: 'user' | 'assistant'
  searchResults?: Array<{
    id: string
    title: string
    content: string
    similarity: number
  }>
}

const noteStore = useNoteStore()
const inputText = ref('')
const messages = ref<Message[]>([])
const hasStartedChat = ref(false)
const currentAction = ref<'search' | 'brainstorm' | 'summarize' | null>(null)

const inputPlaceholder = computed(() => {
  switch (currentAction.value) {
    case 'search':
      return '输入要搜索的内容...'
    case 'brainstorm':
      return '输入你想要探讨的主题...'
    case 'summarize':
      return '输入要总结的内容...'
    default:
      return '输入你的问题...'
  }
})

const startAction = (action: 'search' | 'brainstorm' | 'summarize') => {
  console.log('AIAssistant.vue→ 开始动作:', action)
  hasStartedChat.value = true
  currentAction.value = action

  // 添加助手欢迎消息
  const welcomeMessages = {
    search: '好的，我来帮你搜索相关笔记。请输入你想搜索的内容。',
    brainstorm: '让我们开始头脑风暴吧！请告诉我你想探讨的主题。',
    summarize: '我可以帮你总结内容。请输入需要总结的文本。'
  }

  addMessage(welcomeMessages[action], 'assistant')
}

const addMessage = (content: string, type: 'user' | 'assistant') => {
  messages.value.push({
    id: Date.now(),
    content,
    type
  })
}

const handleSend = async () => {
  console.log('AIAssistant.vue→ 发送消息:', inputText.value)
  if (!inputText.value.trim()) return

  // 添加用户消息
  addMessage(inputText.value, 'user')

  if (currentAction.value === 'search') {
    console.log('AIAssistant.vue→ 语义搜索查询:', inputText.value)
    try {
      const results = await noteStore.semanticSearch(inputText.value)
      console.log('AIAssistant.vue→ 搜索结果:', results)

      // 添加搜索结果消息
      messages.value.push({
        id: Date.now(),
        type: 'assistant',
        content: '',
        searchResults: results.map((note) => ({
          id: note.id,
          title: String(note.title || ''),
          content: String(note.content || ''),
          similarity: Number(note.similarity || 0)
        }))
      })
    } catch (error) {
      console.error('AIAssistant.vue→ 搜索失败:', error)
      addMessage('搜索出错了，请稍后重试。', 'assistant')
    }
  }

  inputText.value = ''
}

// 辅助函数：获取内容预览
const getPreview = (content: string) => {
  return content.length > 100 ? content.slice(0, 100) + '...' : content
}
</script>

<style scoped>
.ai-assistant-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
  padding: 20px;
}

.welcome-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.welcome-content {
  max-width: 800px;
  width: 100%;
}

.welcome-content h2 {
  margin-bottom: 24px;
  font-size: 24px;
  color: #333;
}

.suggested-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  background: #eee;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 24px;
  margin-right: 16px;
}

.action-text h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.action-text p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #666;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  margin: 20px 0;
  border: 1px solid #eee;
  border-radius: 8px;
}

.message {
  margin-bottom: 16px;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
}

.message-content {
  padding: 12px 16px;
  border-radius: 8px;
  background: #f5f5f5;
  line-height: 1.4;
}

.message.user .message-content {
  background: #007aff;
  color: white;
}

.input-container {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.chat-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.send-button {
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  background: #007aff;
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results {
  width: 100%;
}

.result-count {
  margin-bottom: 12px;
  color: #666;
}

.search-result-item {
  padding: 12px;
  margin-bottom: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #eee;
}

.search-result-item h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.result-preview {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.similarity {
  font-size: 12px;
  color: #999;
}

.no-results {
  color: #666;
  text-align: center;
  padding: 20px;
}
</style>
