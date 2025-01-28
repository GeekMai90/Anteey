<template>
  <div class="assistant-panel">
    <div class="assistant-container">
      <div class="assistant-content">
        <!-- 头部区域 -->
        <div class="assistant-header">
          <div class="title-area">
            <div
              v-tooltip.top="{
                content: isInitializingEmbeddings ? `正在向量化` : '初始化向量库',
                delay: { show: 1000 }
              }"
              class="tool-btn"
              :class="{ 'is-processing': isInitializingEmbeddings }"
              @click="handleInitializeEmbeddings"
            >
              <div class="icon">
                <Loading
                  v-if="isInitializingEmbeddings"
                  theme="outline"
                  size="18"
                  fill="var(--color-primary)"
                  :strokeWidth="3"
                  class="loading-icon"
                />
                <Robot
                  v-else
                  theme="outline"
                  size="18"
                  fill="var(--color-primary)"
                  :strokeWidth="3"
                />
              </div>
            </div>
            <span class="title">AI 助手</span>
          </div>
          <!-- 右侧工具栏 -->
          <div class="toolbar-right">
            <!-- 现有的主面板打开按钮 -->
            <div
              v-tooltip.top="{ content: '在主面板打开', delay: { show: 1000 } }"
              class="tool-btn"
              @click="openInMainPanel"
            >
              <div class="icon">
                <Afferent
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-default)"
                  :strokeWidth="3"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 消息区域 -->
        <div ref="messagesContainer" class="messages-container">
          <!-- 初始状态：建议操作区 -->
          <div v-if="messages.length === 0" class="welcome-section">
            <div class="ai-info">
              <img src="@resources/avatar.png" alt="安安" class="ai-avatar" />
              <div class="ai-name">安安</div>
            </div>
            <div class="welcome-text">
              {{
                currentMode.mode === 'chat'
                  ? '👋🏻 Hi！我是你的智能助理，我们可以聊聊你感兴趣的任何问题！'
                  : '👋🏻 Hi！我是你的知识伴侣，随时准备为你探索卡片盒中的智慧宝藏！'
              }}
            </div>
          </div>

          <!-- 对话区域 -->
          <div v-else class="chat-section">
            <!-- 模式指示器 -->
            <div v-if="currentMode" class="mode-indicator">
              <div class="mode-badge">
                <div class="icon">
                  <component :is="currentMode.icon" theme="outline" size="14" :strokeWidth="3" />
                </div>
                <div class="name">{{ currentMode.text }}</div>
              </div>
            </div>

            <!-- 消息列表 -->
            <div class="messages">
              <div v-for="msg in messages" :key="msg.id" :class="['message-wrapper', msg.role]">
                <div class="message">
                  <!-- 用户消息 -->
                  <template v-if="msg.role === 'user'">
                    {{ msg.content }}
                  </template>
                  <!-- AI消息 -->
                  <template v-else-if="msg.role === 'assistant'">
                    <TypewriterText
                      :key="msg.id"
                      :content="msg.content"
                      :instant="isMessageDisplayed(msg.id)"
                      @complete="() => handleTypewriterComplete(msg.id)"
                      @segment-complete="onSegmentComplete"
                    />
                    <!-- 引用信息 -->
                    <div v-if="msg.references?.length" class="message-references">
                      <div class="references-header">
                        <button class="reference-btn" @click="toggleReferences(msg.id)">
                          <div class="icon">
                            <Notes theme="outline" size="12" :strokeWidth="3" />
                          </div>
                          <div class="name">引用 {{ msg.references.length }} 篇笔记</div>
                        </button>
                        <!-- 添加复制按钮 -->
                        <button
                          v-tooltip.top="'复制内容'"
                          class="copy-btn"
                          @click="copyMessageContent(msg.content)"
                        >
                          <div class="icon">
                            <Copy theme="outline" size="14" :strokeWidth="3" />
                          </div>
                        </button>
                      </div>

                      <!-- 添加展开的引用列表 -->
                      <div v-if="expandedMessageId === msg.id" class="references-list">
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
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 加载状态 -->
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

        <!-- 输入区域 -->
        <div class="input-section">
          <!-- 添加已选择笔记展示区域 -->
          <div v-if="selectedNotes.length > 0" class="selected-notes">
            <div v-for="note in selectedNotes" :key="note.id" class="selected-note">
              <div class="note-icon">
                <Notes theme="outline" size="14" :strokeWidth="3" />
              </div>
              <span class="note-title">{{ note.title }}</span>
              <button class="remove-btn" @click="removeNote(note.id)">
                <Close theme="outline" size="12" :strokeWidth="3" />
              </button>
            </div>
          </div>
          <div class="input-wrapper">
            <!-- 功能按钮区域 -->
            <div class="function-buttons">
              <button class="function-btn" @click="startNewChat">
                <div class="icon">
                  <Plus theme="outline" size="16" :strokeWidth="3" />
                </div>
                <span class="text">新会话</span>
              </button>
              <div ref="historyBtnRef" class="history-btn-wrapper">
                <button class="function-btn" @click="showHistory = !showHistory">
                  <div class="icon">
                    <History theme="outline" size="16" :strokeWidth="3" />
                  </div>
                  <span class="text">历史会话</span>
                </button>
              </div>
              <div class="mode-switch">
                <button
                  class="mode-btn"
                  :class="{ active: currentMode?.mode === 'ask' }"
                  @click="selectMode(suggestions[0])"
                >
                  <div class="icon">
                    <ThinkingProblem theme="outline" size="14" :strokeWidth="3" />
                  </div>
                  <span class="text">问一问</span>
                </button>
                <button
                  class="mode-btn"
                  :class="{ active: currentMode?.mode === 'chat' }"
                  @click="selectMode(suggestions[1])"
                >
                  <div class="icon">
                    <MessageEmoji theme="outline" size="14" :strokeWidth="3" />
                  </div>
                  <span class="text">聊一聊</span>
                </button>
              </div>
            </div>

            <!-- 输入框容器 -->
            <div class="input-container">
              <!-- 添加笔记选择器 -->
              <Teleport to="body">
                <RightSidebarNoteSelector
                  v-if="showNoteSelector"
                  ref="noteSelectorRef"
                  class="note-selector"
                  :style="noteSelectorStyle"
                  @select="handleNoteSelect"
                  @close="showNoteSelector = false"
                />
              </Teleport>

              <div class="input-content">
                <textarea
                  ref="inputRef"
                  v-model="inputMessage"
                  :placeholder="getPlaceholder"
                  :disabled="isProcessing"
                  rows="3"
                  @input="handleInput"
                  @keydown="handleKeyDown"
                  @compositionstart="handleCompositionStart"
                  @compositionend="handleCompositionEnd"
                ></textarea>
              </div>
              <div class="input-actions">
                <button
                  class="send-btn"
                  :disabled="!inputMessage.trim() || isProcessing"
                  @click="handleSend"
                >
                  <Send theme="outline" size="16" :strokeWidth="3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史面板 -->
    <Teleport to="body">
      <RightSidebarAIChatHistory
        :show="showHistory"
        :style="historyPanelStyle"
        @close="showHistory = false"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, onMounted, onUnmounted, nextTick } from 'vue'
import { useAssistantStore } from '@renderer/stores/assistantStore'
import { storeToRefs } from 'pinia'
import {
  ThinkingProblem,
  MessageEmoji,
  Robot,
  Notes,
  Send,
  Afferent,
  Plus,
  History,
  Close,
  Copy,
  Loading
} from '@icon-park/vue-next'
import type { Suggestion } from '@shared/types'
import TypewriterText from '@renderer/components/aiassistant/TypewriterText.vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import RightSidebarAIChatHistory from '@renderer/components/layout/RightSidebarAIChatHistory.vue'
import RightSidebarNoteSelector from '@renderer/components/layout/RightSidebarNoteSelector.vue'
import { message } from '@renderer/utils/message'

// Store
const assistantStore = useAssistantStore()
const { messages, isProcessing, isInitializingEmbeddings } = storeToRefs(assistantStore)
const router = useRouter()
const uiStore = useUIStore()

// 建议列表
const suggestions: Suggestion[] = [
  {
    id: 'ask',
    text: '问一问',
    icon: markRaw(ThinkingProblem),
    mode: 'ask',
    prompt: '',
    description: '基于笔记解答'
  },
  {
    id: 'chat',
    text: '聊一聊',
    icon: markRaw(MessageEmoji),
    mode: 'chat',
    prompt: '',
    description: 'AI 助手对话'
  }
]

// Refs
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const currentMode = ref<Suggestion>(suggestions[0])
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)
const expandedMessageId = ref<string | null>(null)
const showHistory = ref(false)
const historyBtnRef = ref<HTMLElement | null>(null)
const selectedNotes = ref<{ id: string; title: string }[]>([])
const showNoteSelector = ref(false)
const lastAtPosition = ref(-1)
const noteSelectorRef = ref<{ focusSearchInput: () => void } | null>(null)

// 计算属性
const getPlaceholder = computed(() => {
  if (isProcessing.value) return '思考中...'
  if (currentMode.value) return `${currentMode.value.description}...`
  return '提问、思考、聊天...'
})

// 修改计算属性
const isMessageDisplayed = (messageId: string) => {
  return assistantStore.displayedMessageIds.has(messageId)
}

// 添加处理完成的回调方法
const handleTypewriterComplete = (messageId: string) => {
  assistantStore.markMessageAsDisplayed(messageId)
  requestAnimationFrame(scrollToBottom)
}

// 方法
const selectMode = (suggestion: Suggestion) => {
  assistantStore.clearMessages()
  currentMode.value = suggestion
  focusInput()
}

const handleSend = async () => {
  if (!inputMessage.value.trim() || assistantStore.isProcessing) return

  try {
    const message = inputMessage.value
    const noteReferences = selectedNotes.value

    // 清空输入和选中的笔记
    inputMessage.value = ''
    selectedNotes.value = []

    if (!currentMode.value) {
      const askSuggestion = suggestions.find((s) => s.mode === 'ask')
      if (askSuggestion) {
        currentMode.value = askSuggestion
      }
    }

    const mode = currentMode.value?.mode || 'ask'
    switch (mode) {
      case 'ask':
        await assistantStore.handleAskQuestion(message, noteReferences)

        break
      case 'chat':
        await assistantStore.handleChat(message)
        break
    }
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const onSegmentComplete = () => {
  requestAnimationFrame(scrollToBottom)
}

const openInMainPanel = () => {
  router.push('/ai-assistant')
  uiStore.toggleRightSidebar()
}

// 输入法相关
const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const handleKeyDown = (event: KeyboardEvent) => {
  // 如果正在使用输入法，不处理键盘事件
  if (isComposing.value) return

  // 如果按下 Enter 键且没有按住 Shift 键
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault() // 阻止默认的换行行为
    handleSend()
  }
  // 处理 Escape 键关闭笔记选择器
  else if (event.key === 'Escape') {
    showNoteSelector.value = false
  }
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const cursorPosition = target.selectionStart
  const content = target.value

  if (content[cursorPosition - 1] === '@') {
    showNoteSelector.value = true
    lastAtPosition.value = cursorPosition - 1
  }
}

const handleNoteSelect = (note: { id: string; title: string }) => {
  const isAlreadySelected = selectedNotes.value.some((n) => n.id === note.id)
  if (!isAlreadySelected) {
    selectedNotes.value.push(note)
  }
  showNoteSelector.value = false

  if (lastAtPosition.value >= 0) {
    inputMessage.value =
      inputMessage.value.slice(0, lastAtPosition.value) +
      inputMessage.value.slice(lastAtPosition.value + 1)
    lastAtPosition.value = -1
  }

  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      const length = inputRef.value.value.length
      inputRef.value.setSelectionRange(length, length)
    }
  })
}

const removeNote = (noteId: string) => {
  selectedNotes.value = selectedNotes.value.filter((note) => note.id !== noteId)
}

// 监听消息变化自动滚动
watch([() => messages.value.length, () => isProcessing.value], () => {
  setTimeout(scrollToBottom, 50)
})

// 添加 toggleReferences 方法
const toggleReferences = (messageId: string) => {
  expandedMessageId.value = expandedMessageId.value === messageId ? null : messageId
  // 如果是展开操作，添加滚动
  if (expandedMessageId.value === messageId) {
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }, 50)
  }
}

const startNewChat = () => {
  assistantStore.clearMessages()
  currentMode.value = suggestions[0]
}

const historyPanelStyle = ref({
  position: 'fixed',
  top: '0px',
  right: '0px'
})

// 更新位置计算方法
const updatePosition = () => {
  if (historyBtnRef.value) {
    const rect = historyBtnRef.value.getBoundingClientRect()
    const panelHeight = 400 // 面板高度
    const margin = 8 // 面板与按钮之间的间距

    historyPanelStyle.value = {
      position: 'fixed',
      top: `${rect.top - panelHeight - margin}px`, // 从按钮顶部减去面板高度和间距
      right: `${window.innerWidth - rect.right}px`
    }
  }
}

// 监听窗口大小变化以更新位置
watch(
  () => showHistory.value,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        updatePosition()
      })
    }
  }
)

const noteSelectorStyle = ref({
  position: 'fixed',
  bottom: '0px',
  right: '0px',
  zIndex: 1000
})

const updateNoteSelectorPosition = () => {
  const inputContainer = document.querySelector('.input-container')
  if (inputContainer) {
    const rect = inputContainer.getBoundingClientRect()
    noteSelectorStyle.value = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: `${window.innerWidth - rect.right}px`,
      zIndex: 1000
    }
  }
}

// 监听 showNoteSelector 变化时更新位置
watch(
  () => showNoteSelector.value,
  (newValue) => {
    if (newValue) {
      nextTick(() => {
        updateNoteSelectorPosition()
        // 调用聚焦方法
        noteSelectorRef.value?.focusSearchInput()
      })
    }
  }
)

const focusInput = () => {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

// 复制消息内容
const copyMessageContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
    message.error('复制失败')
  }
}

const handleInitializeEmbeddings = () => {
  assistantStore.initializeEmbeddings()
}

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('resize', updateNoteSelectorPosition)
  focusInput()

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.note-selector') && !target.closest('.input-container')) {
      showNoteSelector.value = false
    }
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('resize', updateNoteSelectorPosition)
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style lang="scss" scoped>
.assistant-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);

  .assistant-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-primary);
  }

  .assistant-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .assistant-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border);
    height: 48px;

    .title-area {
      display: flex;
      align-items: center;
      gap: 2px;

      .tool-btn {
        display: flex;
        align-items: center;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
        padding: 4px;

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
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

        &:hover {
          background-color: var(--color-hover-button);
        }
      }

      .title {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text);
        user-select: none;
      }
    }

    .toolbar-right {
      display: flex;
      gap: 4px;
      align-items: center;
      .tool-btn {
        display: flex;
        align-items: center;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
        padding: 4px;

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
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

        &:hover {
          background-color: var(--color-hover-button);
        }
      }
    }
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    width: 100%;
    max-width: 100%;
  }

  .welcome-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem 0;

    .ai-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;

      .ai-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
      }

      .ai-name {
        font-size: 16px;
        font-weight: 500;
      }
    }

    .welcome-text {
      text-align: center;
      color: var(--color-text-primary);
      font-size: 14px;
      margin: 16px 24px 24px;
      line-height: 1.6;
    }
  }

  .suggestions-container {
    width: 100%;
    .suggestions-scroll {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
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

    &:hover {
      background: var(--color-shape-secondary);
    }
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .message-wrapper {
    display: flex;
    max-width: 100%;
    width: 100%;
    animation: messageSlide 0.3s ease-out forwards;

    &.user {
      justify-content: flex-end;

      .message {
        background: rgba(var(--color-primary-rgb), 0.15);
        color: var(--color-primary);
        font-weight: 500;
        // color: var(--color-text-inversion);
        border-radius: 1rem 0 1rem 1rem;
      }
    }

    &.assistant .message {
      background: var(--color-bg-ai-assistant);
      color: var(--color-text-primary);
      border-radius: 0 1rem 1rem 1rem;
      max-width: calc(100% - 2rem);
    }
  }

  .message {
    padding: 0.7rem 1rem;
    font-size: 0.875rem;
    line-height: 1.6;
    word-break: break-word;
    max-width: 100%;
    overflow-wrap: break-word;
  }

  .input-section {
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-primary);
  }

  .function-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .mode-switch {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;

    .mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: none;
      background: var(--color-bg-primary);
      color: var(--color-text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-right: 1px solid var(--color-border);

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
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

      &:last-child {
        border-right: none;
      }

      &:hover:not(.active) {
        background: var(--color-hover-bg);
      }

      &.active {
        background: var(--color-primary);
        color: white;

        .icon {
          :deep(svg) {
            fill: white;
            stroke: white;
          }
        }
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .text {
        line-height: 1;
      }
    }
  }

  .history-btn-wrapper {
    position: relative;
  }

  .function-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;

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

    .text {
      line-height: 1;
    }

    &:hover {
      background: var(--color-hover-bg);
      border-color: var(--color-shape-secondary);
    }
  }

  .input-container {
    display: flex;
    align-items: flex-start;
    border: 1px solid var(--color-shape-secondary);
    border-radius: 0.5rem;
    padding: 6px;
    background: var(--color-bg-secondary);
    transition: border-color 0.2s ease;
    position: relative;

    &:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
    }
  }

  .input-content {
    flex: 1;
    border-radius: 8px;
    min-height: 80px;

    textarea {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.5;
      padding: 8px 40px 8px 8px;
      resize: none;
      height: 100%;
      min-height: 80px;

      &::placeholder {
        color: var(--color-text-secondary);
      }
    }
  }

  .input-actions {
    position: absolute;
    right: 12px;
    bottom: 8px;
  }

  .send-btn {
    background: none;
    border-radius: 50%;
    color: var(--color-text-tertiary);
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &:not(:disabled) {
      color: var(--color-primary);

      &:hover {
        transform: scale(1.1);
      }
    }

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

  // 打字机动画
  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;

    span {
      width: 4px;
      height: 4px;
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

  .message-references {
    margin-top: 8px;

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
    }
  }
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

.chat-section {
  display: flex;
  flex-direction: column;
}

.mode-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;

  .mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--color-bg-secondary);
    border-radius: 20px;
    font-size: 13px;
    color: var(--color-text-secondary);

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;

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

    .name {
      line-height: 1;
    }
  }
}

.selected-notes {
  display: flex;
  gap: 8px;
  padding-bottom: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin; // Firefox
}

.selected-note {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 12px;

  .note-icon {
    display: flex;
    align-items: center;
    justify-content: center;
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

  .note-title {
    color: var(--color-text-secondary);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-text-tertiary);
    border-radius: 50%;

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
      background: var(--color-hover-bg);
      color: var(--color-text-secondary);
    }
  }
}

.note-selector {
  box-shadow: var(--shadow-primary);
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

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      transition: all 0.2s ease;
      padding: 0;

      :deep(svg) {
        width: 14px;
        height: 14px;
      }
    }
  }

  &:hover {
    .copy-btn {
      opacity: 1;
    }
  }
}
</style>
