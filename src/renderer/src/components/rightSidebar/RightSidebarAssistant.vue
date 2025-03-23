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
            <!-- 修改蜡烛加载动画容器的类名 -->
            <div
              class="candle-container"
              :style="{ bottom: `${assistantStore.loadingAnimation.bottomOffset}px` }"
            >
              <LoadingCandle v-if="assistantStore.loadingAnimation.type === 'candle'" />
              <LoadingPencil v-if="assistantStore.loadingAnimation.type === 'pencil'" />
              <LoadingMouse v-if="assistantStore.loadingAnimation.type === 'mouse'" />
              <LoadingPacMan v-if="assistantStore.loadingAnimation.type === 'pacman'" />
              <LoadingTaiChi v-if="assistantStore.loadingAnimation.type === 'taichi'" />
              <LoadingWindmill v-if="assistantStore.loadingAnimation.type === 'windmill'" />
              <LoadingWashing v-if="assistantStore.loadingAnimation.type === 'washing'" />
              <LoadingTypewriter v-if="assistantStore.loadingAnimation.type === 'typewriter'" />
              <LoadingFox v-if="assistantStore.loadingAnimation.type === 'loadingFox'" />
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
                  <LoadingCircle />
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
              <Button icon-only :icon="Plus" @click="startNewChat"> 新会话 </Button>
              <div ref="historyBtnRef" class="history-btn-wrapper">
                <Button icon-only :icon="History" @click="showHistory = !showHistory">
                  历史会话
                </Button>
              </div>

              <!-- Agents 下拉菜单 -->
              <Dropdown
                :items="agentItems"
                :showSelected="false"
                align="end"
                placement="top"
                icon-only
                :icon="Robot"
                @select="handleAgentSelect"
              >
                AI 助手
              </Dropdown>

              <!-- 使用 SegmentedButton 组件 -->
              <SegmentedButton
                v-model="currentModeValue"
                :options="modeOptions"
                width="auto"
                height="32px"
                :iconSize="14"
                :iconStrokeWidth="3"
                tooltipPlacement="top"
              />
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
                  @keydown="handleInputKeyDown"
                  @compositionstart="handleCompositionStart"
                  @compositionend="handleCompositionEnd"
                ></textarea>

                <!-- 添加中断按钮 -->
                <button
                  v-if="isProcessing"
                  v-tooltip.top="'中断请求 (⌘+Backspace)'"
                  class="abort-btn"
                  @click="handleAbortRequest"
                >
                  <Close theme="outline" size="16" :strokeWidth="3" />
                </button>

                <!-- 发送按钮 -->
                <button
                  v-else
                  class="send-btn"
                  :disabled="!inputMessage.trim() || isProcessing"
                  @click="handleSend"
                >
                  <Send theme="outline" size="16" :strokeWidth="3" />
                </button>
              </div>
            </div>
            <!-- 添加模型选择下拉菜单 -->
            <div class="model-selector">
              <Dropdown
                :items="modelItems"
                :show-selected="true"
                size="small"
                align="end"
                placement="top"
                @select="handleModelSwitch"
              >
                模型
              </Dropdown>
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
import LoadingCandle from '@renderer/components/ui/LoadingCandle.vue'
import LoadingMouse from '@renderer/components/ui/LoadingMouse.vue'
import LoadingPencil from '@renderer/components/ui/LoadingPencil.vue'
import LoadingPacMan from '@renderer/components/ui/LoadingPacMan.vue'
import LoadingTaiChi from '@renderer/components/ui/LoadingTaiChi.vue'
import LoadingWindmill from '@renderer/components/ui/LoadingWindmill.vue'
import LoadingWashing from '@renderer/components/ui/LoadingWashing.vue'
import LoadingTypewriter from '@renderer/components/ui/LoadingTypewriter.vue'
import LoadingCircle from '@renderer/components/ui/LoadingCircle.vue'
import LoadingFox from '@renderer/components/ui/LoadingFox.vue'
import Button from '@renderer/components/ui/Button.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
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

// 计算属性
const getPlaceholder = computed(() => {
  if (isProcessing.value) return '思考中...'
  if (currentMode.value) return `${currentMode.value.description}...`
  return '提问、思考、聊天...'
})

// 计算 agents 下拉菜单项
const agentItems = computed(() => {
  // 如果没有 agents,返回一个空状态的项
  if (agentStore.nonMenuAgents.length === 0) {
    return [
      {
        key: 'empty',
        label: '暂无 AI 助手',
        icon: Robot,
        disabled: true // 添加禁用状态
      }
    ]
  }

  // 有数据时返回正常的列表
  return agentStore.nonMenuAgents.map((agent) => ({
    key: agent.id,
    label: agent.name,
    icon: Robot
  }))
})

// 添加计算属性和值转换
const currentModeValue = computed({
  get: () => currentMode.value?.mode || 'ask',
  set: (value) => {
    const selectedSuggestion = suggestions.find((s) => s.mode === value)
    if (selectedSuggestion) {
      selectMode(selectedSuggestion)
    }
  }
})

// 添加模式选项
const modeOptions = computed(() => [
  {
    value: 'ask',
    label: '问一问',
    icon: ThinkingProblem,
    tooltip: { content: '基于笔记解答', delay: { show: 500 } }
  },
  {
    value: 'chat',
    label: '聊一聊',
    icon: MessageEmoji,
    tooltip: { content: 'AI 助手对话', delay: { show: 500 } }
  }
])

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

  // 将变量声明移到最外层作用域
  const messageText = inputMessage.value
  const noteRefs = selectedNotes.value.slice() // 创建一个副本

  try {
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
          await assistantStore.handleAskQuestion(messageText, noteRefs)
          break
        case 'chat':
          await assistantStore.handleChat(messageText)
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
    // 不需要在这里显示错误消息,因为 store 中已经处理了
    console.error('发送消息失败:', error)
    // 如果不是取消请求导致的错误,才恢复输入内容
    if (
      !(
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('canceled'))
      )
    ) {
      // 恢复输入内容和选中的笔记
      inputMessage.value = messageText
      selectedNotes.value = noteRefs
    }
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
  // 只标记消息为已显示
  assistantStore.markMessageAsDisplayed(messageId)
  focusInput()
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

// 1. 重命名原来的输入框键盘事件处理函数
const handleInputKeyDown = (event: KeyboardEvent) => {
  // 如果正在使用输入法，不处理键盘事件
  if (isComposing.value) return

  // 如果按下 Enter 键且没有按住 Shift 键
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault() // 阻止默认的换行行为
    handleSend()
    return
  }

  // 处理 Escape 键关闭笔记选择器
  if (event.key === 'Escape') {
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

// 添加模型项的计算属性
const modelItems = computed(() => {
  return modelConfigStore.configs.map((config) => ({
    key: config.id,
    label: config.name,
    active: config.isDefault,
    icon: config.provider === 'openai' ? 'OpenaiLogo' : Receiver
  }))
})

// 修改模型切换处理方法
const handleModelSwitch = async (modelId: string) => {
  try {
    await modelConfigStore.setDefaultConfig(modelId)
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

// 1. 将事件处理函数移到组件顶层
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.note-selector') && !target.closest('.input-container')) {
    showNoteSelector.value = false
  }
}

// 2. 将新消息事件处理函数移到顶层
const handleNewAssistantMessage = (event: CustomEvent) => {
  const { messageId } = event.detail
  nextTick(() => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`)
    if (messageElement) {
      scrollToElement(messageElement)
    }
  })
}

// 3. 将全局键盘事件处理函数保持在顶层
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
    event.preventDefault()
    handleAbortRequest()
  }
}

// 4. 修改 onMounted 和 onUnmounted 钩子
onMounted(async () => {
  // 预加载 Agent 数据
  await agentStore.fetchMenuAgents()

  // 确保当前模式与 defaultMode 一致
  const defaultSuggestion = suggestions.find((s) => s.mode === assistantStore.defaultMode)
  if (defaultSuggestion) {
    currentMode.value = defaultSuggestion
  }

  // 添加所有事件监听器
  window.addEventListener('resize', updatePosition)
  window.addEventListener('resize', updateNoteSelectorPosition)
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('new-assistant-message', handleNewAssistantMessage as EventListener)
  window.addEventListener('keydown', handleGlobalKeyDown)

  focusInput()
  modelConfigStore.loadConfigs()

  // 设置消息容器的初始滚动位置
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = 0
  }
})

// 5. 单独定义 onUnmounted 钩子
onUnmounted(() => {
  // 移除所有事件监听器
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('resize', updateNoteSelectorPosition)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('new-assistant-message', handleNewAssistantMessage as EventListener)
  window.removeEventListener('keydown', handleGlobalKeyDown)
})

// 2. 修改 handleAbortRequest 函数
const handleAbortRequest = async () => {
  try {
    console.log('尝试中断请求, 当前模式:', currentMode.value?.mode)
    console.log('当前活跃的 Agent:', agentStore.currentAgent)

    // 通过 agentStore 判断是否在使用 Agent
    if (agentStore.currentAgent) {
      console.log('中断 Agent 聊天请求')
      await assistantStore.abortCurrentAgentChat()
      return
    }

    // 其他模式的中断逻辑
    if (currentMode.value?.mode === 'ask') {
      console.log('中断问答请求')
      await assistantStore.abortCurrentAskQuestion()
    } else {
      console.log('中断普通聊天请求')
      await assistantStore.abortCurrentChat()
    }
  } catch (error) {
    console.error('中断请求失败:', error)
    message.error('中断请求失败')
  }
}

// 3. 添加 scrollToTop 函数
const scrollToTop = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 4. 添加 handleAgentSelect 函数
const handleAgentSelect = async (agentId: string) => {
  // 如果是空状态,直接返回
  if (agentId === 'empty') {
    return
  }

  try {
    // 清空当前对话
    assistantStore.clearMessages()

    // 切换到聊一聊模式
    assistantStore.setDefaultMode('chat')

    // 使用新的纯对话方法
    await assistantStore.handleAgentPureChat({
      agentId
    })
  } catch (error) {
    // 只在非取消请求的情况下显示错误
    if (
      !(
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('canceled'))
      )
    ) {
      console.error('切换 Agent 失败:', error)
      message.error('切换 AI 助手失败')
    }
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
    padding: 2rem 0 0 0;
    position: relative;
    height: 100%;

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

    .candle-container {
      position: absolute;
      left: 50%;
      transform: translateX(-50%) scale(0.4);
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
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
    padding: 0.7rem 1rem 10px 1rem;
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
    position: relative;

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

  .send-btn {
    position: absolute;
    right: 10px;
    bottom: 10px;
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
    z-index: 2;

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

  .message.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60px;
    padding: 10px;
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
    min-height: 24px;
  }

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

  .references-list {
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
  }

  .reference-address {
    font-weight: 500;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    line-height: 1.4;
  }

  .reference-similarity {
    font-size: 12px;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    line-height: 1.4;
  }

  .reference-content {
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin-bottom: 0;
    user-select: none;
    display: flex;
    align-items: center;
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

  :deep(.radio-inputs) {
    margin-left: 4px;
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
  scrollbar-width: thin;
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

.model-selector {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  margin-top: 4px;
}

.abort-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: none;
  border-radius: 50%;
  color: var(--color-error);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  z-index: 2;

  &:hover {
    transform: scale(1.1);
    background: var(--color-hover-bg);
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
</style>
