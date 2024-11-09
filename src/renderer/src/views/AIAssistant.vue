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
    <div ref="chatContainerRef" class="chat-container">
      <div v-for="message in messages" :key="message.id" class="message" :class="message.type">
        <div class="message-content" v-if="message.type === 'user'">
          {{ message.content }}
        </div>
        <div class="message-content" v-else>
          <div v-if="message.loading" class="loading-indicator">
            <span>搜索中...</span>
          </div>
          <div v-else-if="message.searchResults" class="search-results">
            <div v-if="message.searchResults.length > 0">
              <div class="result-count">找到 {{ message.searchResults.length }} 条相关笔记</div>
              <div
                v-for="result in message.searchResults"
                :key="result.noteId"
                class="search-result-item"
                @click="openNote(result.noteId)"
              >
                <div class="result-header">
                  <div class="similarity-badge" :class="result.similarityLevel.toLowerCase()">
                    {{ getSimilarityText(result.similarity) }}
                  </div>
                </div>
                <div class="result-content">
                  <p class="result-preview">{{ getPreview(result.text) }}</p>
                </div>
              </div>
            </div>
            <div v-else class="no-results">没有找到相关笔记</div>
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
      <button class="send-button" :disabled="!inputText.trim() || isProcessing" @click="handleSend">
        {{ isProcessing ? '处理中...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSemanticStore } from '../stores/semanticStore'
import { useRouter } from 'vue-router'
import log from 'electron-log'
import type { SearchResult, SearchOptions } from '../types/semantic'

interface Message {
  id: number
  content: string
  type: 'user' | 'assistant'
  loading?: boolean
  searchResults?: SearchResult[]
  metadata?: {
    query?: string
    strategy?: string
    timeTaken?: number
    totalFound?: number
  }
}

const router = useRouter()
const semanticStore = useSemanticStore()
const inputText = ref('')
const messages = ref<Message[]>([])
const hasStartedChat = ref(false)
const currentAction = ref<'search' | 'brainstorm' | 'summarize' | null>(null)
const chatContainerRef = ref<HTMLElement | null>(null)
const isProcessing = ref(false)

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

onMounted(async () => {
  try {
    await semanticStore.initialize()
    log.info('AIAssistant: 语义服务初始化成功')
  } catch (error) {
    log.error('AIAssistant: 语义服务初始化失败:', error)
  }
})

const startAction = (action: 'search' | 'brainstorm' | 'summarize') => {
  log.info('AIAssistant: 开始动作:', action)
  hasStartedChat.value = true
  currentAction.value = action

  const welcomeMessages = {
    search: '好的，我来帮你搜索相关笔记。请输入你想搜索的内容。',
    brainstorm: '让我们开始头脑风暴吧！请告诉我你想探讨的主题。',
    summarize: '我可以帮你总结内容。请输入需要总结的文本。'
  }

  addMessage(welcomeMessages[action], 'assistant')
}

const addMessage = (
  content: string,
  type: 'user' | 'assistant',
  metadata?: Message['metadata']
) => {
  messages.value.push({
    id: Date.now(),
    content,
    type,
    metadata
  })
}

const handleSend = async () => {
  if (!inputText.value.trim() || isProcessing.value) return

  isProcessing.value = true
  addMessage(inputText.value, 'user')

  const tempMessage: Message = {
    id: Date.now(),
    type: 'assistant',
    content: '',
    loading: true
  }
  messages.value.push(tempMessage)
  scrollToBottom()

  try {
    switch (currentAction.value) {
      case 'search': {
        log.info('AIAssistant: 执行语义搜索:', inputText.value)
        const searchOptions: SearchOptions = {
          limit: 5,
          minSimilarity: 0.3,
          includeMetadata: true
        }

        const response = await semanticStore.enhancedSearch(inputText.value, searchOptions)
        log.info('AIAssistant: 搜索结果:', {
          query: inputText.value,
          resultCount: response.length,
          metadata: semanticStore.searchMetadata
        })

        if (response.length === 0) {
          tempMessage.loading = false
          tempMessage.content = '抱歉，没有找到相关的笔记内容。'
          break
        }

        tempMessage.loading = false
        tempMessage.searchResults = response
        tempMessage.metadata = semanticStore.searchMetadata || {}
        tempMessage.content = `为您找到 ${response.length} 条相关笔记：`
        break
      }

      case 'brainstorm': {
        tempMessage.loading = false
        tempMessage.content = '头脑风暴功能正在开发中...'
        break
      }

      case 'summarize': {
        tempMessage.loading = false
        tempMessage.content = '内容总结功能正在开发中...'
        break
      }

      default: {
        tempMessage.loading = false
        tempMessage.content = '请先选择一个功能。'
      }
    }
  } catch (error) {
    log.error('AIAssistant: 操作失败:', error)
    tempMessage.loading = false
    tempMessage.content = '抱歉，处理过程中出现错误，请稍后重试。'
  } finally {
    isProcessing.value = false
    scrollToBottom()
    inputText.value = ''
  }
}

const scrollToBottom = () => {
  if (chatContainerRef.value) {
    setTimeout(() => {
      chatContainerRef.value!.scrollTop = chatContainerRef.value!.scrollHeight
    }, 100)
  }
}

const getPreview = (text: string): string => {
  const maxLength = 200
  if (!text) return '无内容预览'

  // 如果有高亮片段，优先显示高亮内容
  const highlights = text.match(/<mark>(.*?)<\/mark>/g)
  if (highlights && highlights.length > 0) {
    const highlightText = highlights.map((h) => h.replace(/<\/?mark>/g, '')).join(' ... ')
    return highlightText.length > maxLength
      ? highlightText.slice(0, maxLength) + '...'
      : highlightText
  }

  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

const getSimilarityText = (similarity: number): string => {
  const percentage = (similarity * 100).toFixed(0)
  let level = ''
  if (similarity >= 0.8) level = '(几乎相同)'
  else if (similarity >= 0.6) level = '(高度相关)'
  else if (similarity >= 0.4) level = '(相关)'
  else level = '(部分相关)'

  return `相关度 ${percentage}% ${level}`
}

const openNote = async (noteId: string) => {
  try {
    await router.push({
      name: 'note',
      params: { id: noteId }
    })
  } catch (error) {
    log.error('AIAssistant: 打开笔记失败:', error)
  }
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

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
}

.search-results {
  width: 100%;
}

.result-count {
  margin-bottom: 12px;
  color: #666;
}

.search-result-item {
  padding: 16px;
  margin-bottom: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.similarity-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.similarity-badge.high {
  background: #e6f4ea;
  color: #1e8e3e;
}

.similarity-badge.medium {
  background: #fef7e0;
  color: #b06000;
}

.similarity-badge.low {
  background: #fce8e6;
  color: #c5221f;
}

.result-preview {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
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
  transition: all 0.2s;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-results {
  text-align: center;
  padding: 32px;
  color: #666;
  font-size: 14px;
  background: #f9f9f9;
  border-radius: 8px;
}
</style>
