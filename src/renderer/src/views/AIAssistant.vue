<template>
  <div class="ai-assistant-container">
    <!-- 添加 AppToolbar -->
    <AppToolbar :showBackButton="true" :showForwardButton="true" />
    <!-- 顶部栏 - 固定 -->
    <!-- 更多按钮 - 固定在右上角 -->
    <button class="float-menu-btn" @click="toggleHistoryPanel">
      <div class="icon">
        <More theme="outline" size="18" />
      </div>
    </button>

    <!-- 消息区域 - 可滚动 -->
    <div ref="messagesContainer" class="messages-container">
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
        <div class="messages">
          <div v-for="msg in messages" :key="msg.id" :class="['message-wrapper', msg.role]">
            <div class="message">
              <!-- 用户消息直接显示 -->
              <template v-if="msg.role === 'user'">
                {{ msg.content }}
              </template>
              <!-- AI消息使用打字机效果 -->
              <template v-else-if="msg.role === 'assistant'">
                <TypewriterText
                  :key="msg.id"
                  :content="msg.content"
                  :instant="isHistoryMessage || showHistoryPanel"
                  @complete="onTypewriterComplete"
                  @segment-complete="onSegmentComplete"
                />
                <!-- 引用信息区域 -->
                <div class="message-references">
                  <div class="references-header">
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
                          ? `引用 ${msg.references?.length} 篇笔记作为参考`
                          : '基于 AI 知识库'
                      }}
                    </button>

                    <!-- 添加复制按钮 -->
                    <button
                      v-tooltip.top="'复制内容'"
                      class="copy-btn"
                      @click="copyMessageContent(msg.content)"
                    >
                      <Copy theme="outline" size="14" />
                    </button>
                  </div>

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
                        @click="handleReferenceClick($event, reference.noteId)"
                        @dblclick.stop="handleReferenceDoubleClick(reference.noteId)"
                      >
                        <div class="reference-header">
                          <span class="reference-address">{{ reference.address }}</span>
                          <span class="reference-similarity">
                            相关度 {{ (reference.similarity * 100).toFixed(0) }}%
                          </span>
                        </div>
                        <div class="reference-content">{{ reference.title }}</div>
                        <div class="reference-meta">
                          创建于 {{ formatDate(reference.createdAt) }}
                        </div>
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
    </div>

    <!-- 输入区域 - 固定 -->
    <div class="input-section">
      <div class="input-wrapper">
        <!-- 新对话按钮 -->
        <button
          v-if="currentMode || messages.length > 0"
          class="new-chat-btn"
          @click="startNewChat"
        >
          <div v-if="isProcessing" class="new-chat-loading">
            <Vue3Lottie
              :animationData="loadingAnimation"
              :height="100"
              :width="100"
              :loop="true"
              :autoPlay="true"
            />
          </div>
          <div v-else class="new-chat-avatar">
            <img src="@resources/bot-avatar.svg" alt="AI Assistant" />
          </div>
        </button>

        <div class="input-outer-container">
          <!-- 建议功能/引用笔记显示区域 -->
          <div class="suggestion-reference-area">
            <template v-if="selectedNotes.length > 0">
              <!-- 引用笔记显示 -->
              <div class="references-display">
                <div v-for="note in selectedNotes" :key="note.id" class="note-reference">
                  <div class="reference-icon">
                    <Notes theme="outline" size="14" />
                  </div>
                  <span class="reference-title">{{ note.title }}</span>
                  <button class="remove-reference" @click="removeNote(note.id)">
                    <Close theme="outline" size="12" />
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- 建议功能栏 -->
              <SuggestionBar :current-mode="currentMode" @select="selectMode" />
            </template>
          </div>

          <!-- 输入框容器 -->
          <div class="input-container">
            <!-- 笔记选择器 -->
            <Transition name="slide-fade">
              <NoteSelector
                v-if="showNoteSelector"
                class="note-selector"
                @select="handleNoteSelect"
                @close="showNoteSelector = false"
              />
            </Transition>

            <!-- 输入区域 -->
            <div class="input-content">
              <input
                ref="inputRef"
                v-model="inputMessage"
                :placeholder="getPlaceholder"
                :disabled="isProcessing"
                @input="handleInput"
                @keyup.enter="handleSend"
                @keydown.esc="showNoteSelector = false"
              />
            </div>

            <div class="input-actions">
              <button class="action-icon link-btn" @click="toggleNoteSelector">
                <Link theme="outline" size="18" />
              </button>
              <button class="action-icon send-btn" @click="handleSend">
                <Send theme="outline" size="18" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 历史面板 -->
    <AIChatHistoryPanel
      :show="showHistoryPanel"
      @close="showHistoryPanel = false"
      @new-chat="startNewChat"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, markRaw, onMounted, onUnmounted, nextTick } from 'vue'
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
  More,
  Copy,
  Close
} from '@icon-park/vue-next'
import type { Suggestion } from '@renderer/types/assistant'
import TypewriterText from '@renderer/components/aiassistant/TypewriterText.vue'
import { Vue3Lottie } from 'vue3-lottie'
import loadingAnimation from '@renderer/assets/loading.json'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import { useUIStore } from '@renderer/stores/useUIStore'
import { useRouter } from 'vue-router'
import { message } from '@renderer/utils/message'
import AIChatHistoryPanel from '@renderer/components/aiassistant/AIChatHistoryPanel.vue'
import NoteSelector from '@renderer/components/aiassistant/NoteSelector.vue'
import SuggestionBar from '@renderer/components/aiassistant/SuggestionBar.vue'
// Store
const assistantStore = useAssistantStore()
const { messages, isProcessing } = storeToRefs(assistantStore)

// Refs
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const currentMode = ref<Suggestion | null>(null)
const noteStore = useNoteStore()
const uiStore = useUIStore()
const router = useRouter()

const showHistoryPanel = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// 添加笔记选择器的状态控制
const showNoteSelector = ref(false)
const lastAtPosition = ref(-1)

const selectedNotes = ref<Array<{ id: string; title: string }>>([])

// 监听输入内容变化
const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value
  const cursorPosition = input.selectionStart || 0

  // 检查是否输入了 @
  if (value[cursorPosition - 1] === '@') {
    showNoteSelector.value = true
    lastAtPosition.value = cursorPosition - 1
  }
}

// 处理笔记选择
const handleNoteSelect = (note: { id: string; title: string }) => {
  // 检查是否已经选择了这个笔记
  const isAlreadySelected = selectedNotes.value.some((n) => n.id === note.id)
  if (!isAlreadySelected) {
    // 添加到已选择的笔记数组中
    selectedNotes.value.push(note)
  }
  showNoteSelector.value = false

  // 清除 @ 符号
  if (lastAtPosition.value >= 0) {
    inputMessage.value =
      inputMessage.value.slice(0, lastAtPosition.value) +
      inputMessage.value.slice(lastAtPosition.value + 1)
    lastAtPosition.value = -1 // 重置位置
  }
  // 重新聚焦到输入框并将光标移到末尾
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      // 可选：将光标移到文本末尾
      const length = inputRef.value.value.length
      inputRef.value.setSelectionRange(length, length)
    }
  })
}

const removeNote = (noteId: string) => {
  selectedNotes.value = selectedNotes.value.filter((note) => note.id !== noteId)
}

const toggleNoteSelector = () => {
  showNoteSelector.value = !showNoteSelector.value
}

// 添加点击外部关闭选择器的处理
onMounted(() => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (!target.closest('.note-selector') && !target.closest('.input-container')) {
      showNoteSelector.value = false
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', () => {})
})

// 判断是否是历史消息
const isHistoryMessage = computed((): boolean => {
  // 如果历史面板打开，直接返回 true
  if (showHistoryPanel.value) {
    return true
  }

  // 如果是在加载历史记录时的消息，则为 true
  if (assistantStore.isLoadingHistory) {
    return true
  }

  // 如果没有消息，返回 false
  if (messages.value.length === 0) {
    return false
  }

  // 如果没有当前会话开始时间，说明是新会话
  if (!assistantStore.currentSessionStartTime) {
    return false
  }

  // 获取最后一条消息的时间戳
  const lastMessageTimestamp = messages.value[messages.value.length - 1].timestamp
  return lastMessageTimestamp < assistantStore.currentSessionStartTime
})

// 修改 toggleHistoryPanel 方法
const toggleHistoryPanel = () => {
  showHistoryPanel.value = !showHistoryPanel.value
}

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

// 发送普通消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isProcessing.value) return

  const message = inputMessage.value
  inputMessage.value = ''
  selectedNotes.value = []

  try {
    await assistantStore.sendMessage(message)
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 发送带引用的消息
const sendMessageWithReference = async () => {
  if (!inputMessage.value.trim() && !selectedNotes.value.length) return
  if (isProcessing.value) return

  const content = inputMessage.value.trim()
  const noteReferences = selectedNotes.value
  inputMessage.value = ''
  selectedNotes.value = []
  // 发送带引用的消息给 AI
  await assistantStore.sendMessageWithReference(content, noteReferences)
}

// 统一的发送处理
const handleSend = () => {
  if (selectedNotes.value.length > 0) {
    sendMessageWithReference()
  } else {
    sendMessage()
  }
}

// 控制引用列表的展开状态
const expandedMessageId = ref<string | null>(null)

// 切换引用列表的展开/收起
// 切换引用列表的展开/收起
const toggleReferences = (messageId: string) => {
  expandedMessageId.value = expandedMessageId.value === messageId ? null : messageId
  // 如果是展开操作，添加滚动
  if (expandedMessageId.value === messageId) {
    // 给一点延迟确保内容已经渲染
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }, 50)
  }
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

// 最简单的自动滚动实现
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 简化监听
watch([() => messages.value.length, () => isProcessing.value], () => {
  setTimeout(scrollToBottom, 50)
})

// 每个段落完成时的处理
const onSegmentComplete = () => {
  requestAnimationFrame(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 打字机效果完成时也触发滚动

const onTypewriterComplete = () => {
  console.log('打字机效果完成')
  requestAnimationFrame(() => {
    console.log('执行滚动')
    scrollToBottom()
  })
}

// 处理引用点击事件
const handleReferenceClick = (event: MouseEvent, noteId: string) => {
  // Command/Ctrl + 点击: 在展开编辑器中打开
  if (event.metaKey || event.ctrlKey) {
    router.push({ name: 'NoteExpandEditor', params: { id: noteId } })
    return
  }

  // Alt + 点击: 在右侧边栏打开
  if (event.altKey) {
    noteStore.addNoteToRightSidebar(noteId)
    uiStore.openRightSidebarWithTab('multi')
    return
  }
}

// 处理引用双击事件
const handleReferenceDoubleClick = (noteId: string) => {
  // 双击: 小窗打开
  noteStore.openNoteEditor(noteId)
}

// 添加复制功能
const copyMessageContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
    message.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
/* 1. 基础布局 */
.ai-assistant-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-primary);
}

/* 2. 顶部区域 */
.float-menu-btn {
  position: fixed;
  top: 40px;
  right: 19px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-hover-button);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    :deep(svg) {
      width: 16px;
      height: 16px;
      color: var(--color-text-secondary);
    }
  }
}

/* 3. 助手信息 */
.assistant-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.assistant-avatar {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.assistant-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 4. 顶部操作区 */
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

.menu-btn {
  padding: 0.5rem;

  &:hover {
    background: var(--color-shape-secondary);
    border-color: var(--color-shape-secondary);
  }
}

/* 5. 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 6. 欢迎区域 */
.welcome-section {
  width: 100%;
  max-width: 768px;
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  min-height: 100%;
  justify-content: center;
  padding-bottom: 15vh;
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
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.ai-name {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 7. 建议区域 */
.suggestions-container {
  width: 100%;
  margin-top: 1rem;

  h3 {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }
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
    line-height: 1;
  }

  &:hover {
    background: var(--color-shape-secondary);
  }
}

/* 8. 对话区域 */
.chat-section {
  width: 100%;
  max-width: 768px;
  display: flex;
  flex-direction: column;
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

/* 9. 消息列表 */
.messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
}

.message-wrapper {
  display: flex;
  max-width: 85%;
  animation: messageSlide 0.3s ease-out;
  opacity: 0;
  animation-fill-mode: forwards;

  &.user {
    margin-left: auto;
  }
}

.message {
  padding: 0.7rem 1rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}

.message-wrapper.user .message {
  background: var(--color-primary);
  color: var(--color-text-inversion);
  border-radius: 1rem 0 1rem 1rem;
}

.message-wrapper.assistant .message {
  background: var(--color-bg-ai-assistant);
  color: var(--color-text-primary);
  border-radius: 0 1rem 1rem 1rem;
}

/* 10. 引用区域 */
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
  cursor: pointer;
  transition: background-color 0.2s ease;

  & + .reference-item {
    margin-top: 8px;
  }
  &:hover {
    background: var(--color-hover-bg);
  }
}

.reference-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.references-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-tertiary);
    border-radius: 4px;
    transition: all 0.2s ease;
    opacity: 0;

    &:hover {
      background: var(--color-hover-bg);
      color: var(--color-text-secondary);
    }
  }

  &:hover {
    .copy-btn {
      opacity: 1;
    }
  }
}

.reference-address {
  font-weight: 500;
  color: var(--color-text-primary);
}

.reference-similarity {
  font-size: 12px;
  color: var(--color-primary);
  user-select: none;
}

.reference-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  user-select: none;
}

.reference-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
  user-select: none;
}

.ai-reference-tip {
  padding: 12px;
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border-radius: 6px;
  text-align: center;
}

/* 11. 输入区域 */
.input-section {
  flex-shrink: 0;
  padding: 1rem 2rem;
  background: var(--color-bg-primary);

  .input-wrapper {
    max-width: 768px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
}

.input-outer-container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-chat-btn {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: var(--color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  border: none;

  .new-chat-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
  }

  .new-chat-avatar {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.suggestion-reference-area {
  min-height: 40px; // 给一个固定的最小高度,避免切换时的跳动
  transition: all 0.3s ease; // 添加过渡效果
}

.input-container {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-shape-secondary);
  border-radius: 0.5rem;
  padding: 6px;
  background: var(--color-bg-primary);
  transition: border-color 0.2s ease;
  position: relative;

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
  }
}

.note-selector {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 1000;
}

.input-content {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  // padding: 8px 12px;
  min-height: 30px;

  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    line-height: 1.5;
    padding: 0 8px;

    &::placeholder {
      color: var(--color-text-secondary);
    }
  }
}
.references-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  // &:not(:empty) {
  //   margin-top: 8px;
  // }
}
.note-reference {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-bg-hover);
  padding: 8px 4px;
  border-radius: 6px;
  max-width: 150px;
  border: 1px solid var(--color-border);

  .reference-icon {
    flex-shrink: 0;
    background: none;
    border: none;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--color-text-secondary);
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 14px;
      height: 14px;
    }
  }

  .reference-title {
    color: var(--color-primary);
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1;
  }

  .remove-reference {
    flex-shrink: 0;
    background: none;
    border: none;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    opacity: 0.6;
    color: var(--color-text-secondary);
    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 12px;
      height: 12px;
    }

    &:hover {
      opacity: 1;
      background: var(--color-bg-secondary);
    }
  }
}

.input-actions {
  display: flex;
  gap: 8px;
  padding: 4px;
}

.action-icon {
  padding: 0.25rem;
  cursor: pointer;
  background: none;
  border: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--color-text-secondary);

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
  width: 26px;
  height: 26px;
  background: var(--color-primary);
  border-radius: 50%;
  color: white;

  &:hover {
    opacity: 0.8;
  }
}

.link-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;

  &:hover {
    background: var(--color-shape-secondary);
  }
}

/* 12. 加载动画 */
.loading-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  span {
    width: 6px;
    height: 6px;
    background-color: var(--color-text-secondary);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      background-color: var(--color-pink);
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      background-color: var(--color-yellow);
      animation-delay: -0.16s;
    }

    &:nth-child(3) {
      background-color: var(--color-primary);
    }
  }
}

/* 13. 动画 */
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

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(10px);
  opacity: 0;
}
</style>
