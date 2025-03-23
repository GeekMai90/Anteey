<template>
  <div class="assistant-panel">
    <div class="assistant-container">
      <div class="assistant-content">
        <!-- 头部区域 -->
        <div class="assistant-header">
          <div class="title-area">
            <div class="tool-btn">
              <div class="icon">
                <Robot theme="outline" size="18" fill="var(--color-primary)" :strokeWidth="3" />
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
              <div
                v-for="msg in messages"
                :key="msg.id"
                :class="['message-wrapper', msg.role]"
                :data-message-id="msg.id"
              >
                <div class="message">
                  <!-- 用户消息 -->
                  <template v-if="msg.role === 'user'">
                    {{ msg.content }}
                  </template>
                  <!-- AI消息 -->
                  <template v-else-if="msg.role === 'assistant'">
                    <TypewriterText
                      :message-id="msg.id"
                      :content="msg.content"
                      :timestamp="msg.timestamp"
                      :instant="true"
                      @segment-complete="onSegmentComplete"
                      @complete="() => onTypewriterComplete(msg.id)"
                    />
                    <!-- 引用信息区域 -->
                    <div class="message-references">
                      <div class="references-header">
                        <button
                          class="reference-btn"
                          :class="{ active: expandedMessageId === msg.id }"
                          @click="toggleReferences(msg.id)"
                        >
                          <div class="icon">
                            <component
                              :is="msg.sourceType === 'notes' ? Notes : Brain"
                              theme="outline"
                              size="14"
                              :stroke-width="3"
                            />
                          </div>
                          <div class="name">
                            {{
                              msg.sourceType === 'notes'
                                ? `引用 ${msg.references?.length} 篇笔记作为参考`
                                : '基于 AI 知识库'
                            }}
                          </div>
                        </button>

                        <!-- 添加复制按钮 -->
                        <button
                          v-tooltip.top="'复制内容'"
                          class="copy-btn"
                          @click="copyMessageContent(msg.content)"
                        >
                          <div class="icon">
                            <Copy theme="outline" size="14" :stroke-width="3" />
                          </div>
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
                          </div>
                        </template>
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
                <div class="model-switcher">
                  <button class="model-switch-btn" @click="showModelMenu = !showModelMenu">
                    <Receiver theme="outline" size="16" :strokeWidth="3" />
                  </button>

                  <!-- 模型选择菜单 -->
                  <div v-if="showModelMenu" class="model-menu">
                    <div
                      v-for="config in modelConfigStore.configs"
                      :key="config.id"
                      class="model-option"
                      :class="{ active: config.isDefault }"
                      @click="handleModelSwitch(config.id)"
                    >
                      <span class="model-name">{{ config.name }}</span>
                      <Check v-if="config.isDefault" theme="outline" size="14" :strokeWidth="3" />
                    </div>
                  </div>
                </div>

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
  Check,
  Receiver,
  Brain
} from '@icon-park/vue-next'
import type { Suggestion } from '@shared/types'
import TypewriterText from '@renderer/components/aiassistant/TypewriterText.vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import RightSidebarAIChatHistory from '@renderer/components/rightSidebar/RightSidebarAIChatHistory.vue'
import RightSidebarNoteSelector from '@renderer/components/rightSidebar/RightSidebarNoteSelector.vue'
import { message } from '@renderer/utils/message'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useAgentStore } from '@renderer/stores/agentStore'

// Store
const assistantStore = useAssistantStore()
const { messages, isProcessing } = storeToRefs(assistantStore)
const router = useRouter()
const uiStore = useUIStore()
const modelConfigStore = useModelConfigStore()
const noteStore = useNoteStore()
const agentStore = useAgentStore()

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
const currentMode = ref<Suggestion>(suggestions[assistantStore.defaultMode === 'chat' ? 1 : 0])
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)
const expandedMessageId = ref<string | null>(null)
const showHistory = ref(false)
const historyBtnRef = ref<HTMLElement | null>(null)
const selectedNotes = ref<{ id: string; title: string }[]>([])
const showNoteSelector = ref(false)
const lastAtPosition = ref(-1)
const noteSelectorRef = ref<{ focusSearchInput: () => void } | null>(null)
const showModelMenu = ref(false)

// 计算属性
const getPlaceholder = computed(() => {
  if (isProcessing.value) return '思考中...'
  if (currentMode.value) return `${currentMode.value.description}...`
  return '提问、思考、聊天...'
})

// 方法
const selectMode = (suggestion: Suggestion) => {
  assistantStore.clearMessages()
  currentMode.value = suggestion
  // 保存用户的选择
  assistantStore.setDefaultMode(suggestion.mode as 'ask' | 'chat')
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

    // 确保有模式选择
    if (!currentMode.value) {
      const askSuggestion = suggestions.find((s) => s.mode === 'ask')
      if (askSuggestion) {
        currentMode.value = askSuggestion
      }
    }

    const mode = currentMode.value?.mode || 'ask'

    // 发送消息
    try {
      switch (mode) {
        case 'ask':
          await assistantStore.handleAskQuestion(message, noteReferences)
          break
        case 'chat':
          await assistantStore.handleChat(message)
          break
      }

      // 使用多层延迟确保DOM更新
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToLatestUserMessage()
        }, 100)
      })
    } finally {
      focusInput()
    }
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

const scrollToLatestUserMessage = () => {
  console.log('尝试滚动到最新用户消息')

  if (messages.value.length === 0) return

  // 使用requestAnimationFrame + setTimeout组合确保DOM完全更新
  requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        // 找到最后一条用户消息
        let lastUserMessageIndex = -1
        for (let i = messages.value.length - 1; i >= 0; i--) {
          if (messages.value[i].role === 'user') {
            lastUserMessageIndex = i
            break
          }
        }

        if (lastUserMessageIndex === -1) return

        const lastUserMessage = messages.value[lastUserMessageIndex]
        console.log('最后用户消息ID:', lastUserMessage.id)

        // 查找相应的DOM元素
        const messageElement = document.querySelector(`[data-message-id="${lastUserMessage.id}"]`)

        if (messageElement) {
          // 强制浏览器重排布局 - 使用类型断言解决TypeScript错误
          void (messageElement as HTMLElement).offsetHeight

          // 使用scrollIntoView滚动
          messageElement.scrollIntoView({
            behavior: 'auto',
            block: 'start'
          })

          console.log('已执行scrollIntoView')

          // 再次确认滚动位置
          if (messagesContainer.value) {
            // 获取元素相对于容器的位置
            const msgRect = messageElement.getBoundingClientRect()
            const containerRect = messagesContainer.value.getBoundingClientRect()
            const offsetTop = msgRect.top - containerRect.top

            // 如果消息不在容器顶部附近，进行额外调整
            if (Math.abs(offsetTop) > 20) {
              messagesContainer.value.scrollTop = messagesContainer.value.scrollTop + offsetTop
              console.log('额外滚动调整:', offsetTop)
            }
          }
        } else {
          console.log('未找到消息元素')
        }
      } catch (error) {
        console.error('滚动过程中出错:', error)
      }
    }, 100)
  })
}

const onSegmentComplete = () => {
  // 删除滚动代码
  // requestAnimationFrame(() => {
  //   if (messagesContainer.value) {
  //     messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  //   }
  // })
}

const onTypewriterComplete = (messageId: string) => {
  // 只标记消息为已显示，不执行滚动
  onAgentMessageComplete(messageId)

  // 移除滚动到消息顶部的代码
  // 不再执行这部分代码
  // nextTick(() => {
  //   const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
  //   if (messageElement && messagesContainer.value) {
  //     // 计算这个消息元素的顶部位置（相对于容器）
  //     const messageTop = messageElement.getBoundingClientRect().top
  //     const containerTop = messagesContainer.value.getBoundingClientRect().top
  //     const scrollOffset = messageTop - containerTop
  //
  //     // 滚动到消息的顶部位置
  //     messagesContainer.value.scrollTop = messagesContainer.value.scrollTop + scrollOffset - 16 // 添加一点上边距
  //   }
  // })
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
watch([() => messages.value.length], () => {
  console.log('消息数量变化，当前数量:', messages.value.length)
  if (messages.value.length > 0) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage.role === 'user') {
      console.log('最后一条是用户消息，准备滚动')
      // 尝试多种滚动方法
      scrollToTop() // 直接滚动到顶部
      setTimeout(scrollToLatestUserMessage, 100) // 然后尝试滚动到最新消息
    }
  }
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

// 修改 startNewChat 方法
const startNewChat = () => {
  // 根据默认模式设置初始模式
  const defaultSuggestion = suggestions.find((s) => s.mode === assistantStore.defaultMode)
  currentMode.value = defaultSuggestion || suggestions[0] // 使用默认模式或回退到第一个选项
  assistantStore.clearMessages() // 改回使用 clearMessages
  currentMode.value = defaultSuggestion || suggestions[0]
  inputMessage.value = ''
  focusInput()
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

// 处理模型切换
const handleModelSwitch = async (modelId: string) => {
  try {
    await modelConfigStore.setDefaultConfig(modelId)
    showModelMenu.value = false
    message.success('已切换模型')
  } catch (error) {
    message.error('切换模型失败')
  }
}

// 添加处理引用点击和双击的方法
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

const handleReferenceDoubleClick = (noteId: string) => {
  // 双击: 小窗打开
  noteStore.openNoteEditor(noteId)
}

// 添加监听 defaultMode 变化
watch(
  () => assistantStore.defaultMode,
  (newMode) => {
    console.log('默认模式变更:', newMode)
    const newSuggestion = suggestions.find((s) => s.mode === newMode)
    if (newSuggestion) {
      currentMode.value = newSuggestion
    }
  }
)

// 添加一个通用的滚动到元素函数 (移到组件顶层作用域)
const scrollToElement = (element: Element, offset = 16) => {
  if (!messagesContainer.value) return

  const elementRect = element.getBoundingClientRect()
  const containerRect = messagesContainer.value.getBoundingClientRect()
  const relativeTop = elementRect.top - containerRect.top

  messagesContainer.value.scrollTop = messagesContainer.value.scrollTop + relativeTop - offset
}

// 修改 onMounted 钩子，移除内部的 scrollToElement 定义
onMounted(async () => {
  // 预加载 Agent 数据
  await agentStore.fetchMenuAgents()

  // 确保当前模式与 defaultMode 一致
  const defaultSuggestion = suggestions.find((s) => s.mode === assistantStore.defaultMode)
  if (defaultSuggestion) {
    currentMode.value = defaultSuggestion
  }

  window.addEventListener('resize', updatePosition)
  window.addEventListener('resize', updateNoteSelectorPosition)
  focusInput()

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.note-selector') && !target.closest('.input-container')) {
      showNoteSelector.value = false
    }
    if (!target.closest('.model-switcher')) {
      showModelMenu.value = false
    }
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('resize', updateNoteSelectorPosition)
    document.removeEventListener('click', handleClickOutside)
  })

  modelConfigStore.loadConfigs()

  // 监听新的助手消息事件
  const handleNewAssistantMessage = (event: CustomEvent) => {
    const { messageId } = event.detail
    nextTick(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageElement) {
        scrollToElement(messageElement)
      }
    })
  }

  window.addEventListener('new-assistant-message', handleNewAssistantMessage as EventListener)

  onUnmounted(() => {
    window.removeEventListener('new-assistant-message', handleNewAssistantMessage as EventListener)
  })

  // 添加以下代码设置消息容器的初始滚动位置
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = 0
  }
})

// 修改 onAgentMessageComplete 方法，移除滚动逻辑
const onAgentMessageComplete = (messageId: string) => {
  // 标记消息为已显示
  assistantStore.markMessageAsDisplayed(messageId)

  // 只聚焦输入框
  focusInput()
}

// 添加更明确的滚动到顶部函数
const scrollToTop = () => {
  console.log('执行滚动到顶部')
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = 0
    console.log('设置scrollTop为0')
  }
}
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
    border: 1px solid var(--color-border-light);
    border-radius: 0.5rem;
    background: var(--color-bg-primary);
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: left;

    &:hover {
      background: var(--color-border-light);
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
        // color: var(--color-text-inverse);
        border-radius: 1rem 0 1rem 1rem;
      }
    }

    &.assistant .message {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border-radius: 0 1rem 1rem 1rem;
      max-width: calc(100% - 2rem);
    }

    &.agent-message {
      animation: slideIn 0.3s ease-out forwards;
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
      border-color: var(--color-border-light);
    }
  }

  .input-container {
    display: flex;
    align-items: flex-start;
    border: 1px solid var(--color-border-light);
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
    display: flex;
    align-items: center;
    gap: 8px;
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
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
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

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
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
          width: 14px;
          height: 14px;
        }
      }

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

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
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
        width: 14px;
        height: 14px;
      }
    }

    &:hover {
      background: var(--color-hover-bg);
    }

    &.active {
      color: var(--color-primary);
      background: var(--color-hover-bg);
    }
  }

  .ai-reference-tip {
    padding: 12px;
    font-size: 13px;
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border-radius: 6px;
    text-align: center;
  }

  .model-switcher {
    position: absolute;
    right: 0px;
    bottom: 30px;
    opacity: 0;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    }
  }

  // .input-container:hover .model-switcher {
  //   opacity: 1;
  // }

  .model-switch-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border-radius: 8px;
    background-color: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;

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

  .model-menu {
    position: absolute;
    bottom: 100%;
    right: 0;
    margin-bottom: 8px;
    width: 200px;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: var(--shadow-primary);
    z-index: 1000;
  }

  .model-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-secondary);
    font-size: 13px;
    white-space: nowrap;

    &:hover {
      background: var(--color-hover-bg);
    }

    &.active {
      color: var(--color-primary);
      background: rgba(var(--color-primary-rgb), 0.1);
    }

    .model-name {
      margin-right: 8px;
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
  user-select: none;

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
  margin-bottom: 8px;
  user-select: none;
}

.reference-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
  user-select: none;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
