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
            <Button
              icon-only
              :icon="RobotTwo"
              :tooltip="{ content: 'Agents 设置', placement: 'top' }"
              noBorder
              :default-icon-color="true"
              @click="handleAgentSetting"
            >
              管理 AI Agents
            </Button>
            <!-- 现有的主面板打开按钮 -->
            <!-- <div
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
            </div> -->
          </div>
        </div>

        <!-- 消息区域 -->
        <div ref="messagesContainer" class="messages-container">
          <!-- 初始状态：建议操作区 -->
          <div v-if="!currentConversation?.messages?.length" class="welcome-section">
            <div class="ai-info">
              <!-- <img src="@resources/avatar.png" alt="安安" class="ai-avatar" />
              <div class="ai-name">安安</div> -->
              <AgentAvatar />
            </div>
            <div class="welcome-text">✨ 你好，让我们一起探索笔记的智慧花园...</div>
            <!-- 修改蜡烛加载动画容器的类名 -->
            <div
              class="candle-container"
              :style="{ bottom: `${aiChatStore.loadingAnimation.bottomOffset}px` }"
            >
              <component
                :is="loadingComponents[aiChatStore.loadingAnimation.type]"
                v-if="aiChatStore.loadingAnimation.type"
              />
            </div>
          </div>

          <!-- 对话区域 -->
          <div v-else class="chat-section">
            <!-- 调试信息 -->
            <!-- <div style="display: none">
              {{
                console.log('渲染对话区域:', {
                  conversationId: currentConversation?.id,
                  messageCount: currentConversation?.messages?.length,
                  messages: currentConversation?.messages?.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content.slice(0, 20) + '...',
                    hasReferences: !!m.references?.notes?.length,
                    referenceCount: m.references?.notes?.length || 0,
                    sourceTypes: m.sourceTypes,
                    references: m.references
                  }))
                })
              }}
            </div> -->

            <!-- 消息列表 -->
            <div class="messages">
              <div
                v-for="msg in currentConversation.messages"
                :key="msg.id"
                :class="['message-wrapper', msg.role]"
                :data-message-id="msg.id"
              >
                <!-- {{ console.log('渲染消息:', formatMessageForLog(msg)) }} -->
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
                      :timestamp="getMessageTimestamp(msg.createdAt)"
                      :instant="true"
                    />
                    <!-- 引用信息区域 -->
                    <div
                      v-if="
                        msg.references?.notes?.length ||
                        msg.sourceTypes?.hasNotes ||
                        msg.role === 'assistant'
                      "
                      class="message-references"
                    >
                      <div class="references-header">
                        <button
                          class="reference-btn"
                          :class="{ active: expandedMessageId === msg.id }"
                          @click="toggleReferences(msg.id)"
                        >
                          <div class="icon">
                            <component
                              :is="msg.references?.notes?.length ? Notes : Brain"
                              theme="outline"
                              size="14"
                              :stroke-width="3"
                            />
                          </div>
                          <div class="name">
                            {{
                              msg.references?.notes?.length
                                ? `引用 ${msg.references.notes.length} 篇笔记`
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
                        <div v-if="!msg.references?.notes?.length" class="ai-reference-tip">
                          所有内容均由 AI 生成，仅供参考
                        </div>

                        <!-- 笔记引用列表 -->
                        <template v-else>
                          <div
                            v-for="note in msg.references.notes"
                            :key="note.noteId"
                            class="reference-item"
                            @click="handleReferenceClick($event, note.noteId)"
                            @dblclick.stop="handleReferenceDoubleClick(note.noteId)"
                          >
                            <div class="reference-header">
                              <span class="reference-address">{{ note.address }}</span>
                            </div>
                            <div class="reference-content">{{ note.title }}</div>
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 加载状态 -->
              <div v-if="isLoading" class="message-wrapper assistant">
                <div class="message loading">
                  <LoadingCircle />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-section">
          <div class="input-wrapper">
            <!-- 功能按钮区域 -->
            <div class="function-buttons">
              <!-- 左侧按钮组 -->
              <div class="left-buttons">
                <Button
                  icon-only
                  :icon="Plus"
                  :tooltip="{ content: '新会话', placement: 'top' }"
                  @click="handleNewConversation"
                >
                  新会话
                </Button>
                <div ref="historyBtnRef" class="history-btn-wrapper">
                  <Button
                    icon-only
                    :icon="History"
                    :tooltip="{ content: '历史会话', placement: 'top' }"
                    @click="showHistory = !showHistory"
                  >
                    历史会话
                  </Button>
                </div>
                <Dropdown
                  :items="agentItems"
                  :showSelected="false"
                  align="end"
                  placement="top"
                  :tooltip="{ content: 'AI Agents', placement: 'top' }"
                  icon-only
                  :icon="Robot"
                  @select="handleAgentSelect"
                >
                  AI 助手
                </Dropdown>
                <!-- 添加清空笔记按钮 -->
                <Button
                  v-if="selectedNotes.length > 0"
                  icon-only
                  :icon="Clear"
                  :tooltip="{ content: '清空已选择笔记', placement: 'top' }"
                  @click="clearSelectedNotes"
                >
                  清空已选择笔记
                </Button>
              </div>

              <!-- 右侧模型选择器 -->
              <div class="right-buttons">
                <Dropdown
                  :items="modelItems"
                  :showSelected="true"
                  size="medium"
                  :tooltip="{ content: '选择默认模型', placement: 'top' }"
                  align="end"
                  placement="top"
                  @select="handleModelSwitch"
                >
                  模型
                </Dropdown>
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
                  @close="handleNoteSelectorClose"
                />
              </Teleport>

              <div class="input-content">
                <textarea
                  ref="inputRef"
                  v-model="inputMessage"
                  :placeholder="getPlaceholder"
                  :disabled="isLoading"
                  rows="3"
                  @input="handleInput"
                  @keydown="handleInputKeyDown"
                  @compositionstart="handleCompositionStart"
                  @compositionend="handleCompositionEnd"
                  @focus="onFocus"
                  @blur="onBlur"
                ></textarea>

                <!-- 添加思考中的加载动画 -->
                <div v-if="isLoading" class="thinking-animation">
                  <LoadingThinking />
                </div>

                <!-- 添加中断按钮 -->
                <button
                  v-if="isLoading"
                  v-tooltip.top="'中断请求 (⌘+Backspace)'"
                  class="abort-btn"
                  @click="handleAbortRequest"
                >
                  <PauseOne theme="outline" size="16" :strokeWidth="3" />
                </button>

                <!-- 发送按钮 -->
                <button
                  v-else
                  v-tooltip.top="'发送消息 (Enter)'"
                  class="send-btn"
                  :disabled="!inputMessage.trim() || isLoading"
                  @click="handleSendMessage"
                >
                  <Send theme="outline" size="16" :strokeWidth="3" />
                </button>
              </div>
            </div>
          </div>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
// import { useAssistantStore } from '@renderer/stores/assistantStore'
import { storeToRefs } from 'pinia'
import {
  Robot,
  Notes,
  Send,
  Plus,
  History,
  Close,
  Copy,
  Brain,
  PauseOne,
  Clear,
  RobotTwo,
  Receiver
} from '@icon-park/vue-next'
import TypewriterText from '@renderer/components/rightSidebar/TypewriterText.vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/UIStore'
import RightSidebarAIChatHistory from '@renderer/components/rightSidebar/RightSidebarAIChatHistory.vue'
import RightSidebarNoteSelector from '@renderer/components/rightSidebar/RightSidebarNoteSelector.vue'
import { message } from '@renderer/utils/message'
import { useAgentStore } from '@renderer/stores/agentStore'
import LoadingCircle from '@renderer/components/ui/LoadingCircle.vue'
import Button from '@renderer/components/ui/Button.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import { useAIChatStore } from '@renderer/stores/aiChatStore'
import type { ChatRequest } from '@shared/types/ai-chat'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import LoadingThinking from '@renderer/components/ui/LoadingThinking.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import AgentAvatar from '@renderer/components/ui/AgentAvatar.vue'

// Store
const aiChatStore = useAIChatStore()
// const assistantStore = useAssistantStore()
const { currentConversation, isLoading } = storeToRefs(aiChatStore)
const router = useRouter()
const uiStore = useUIStore()
const agentStore = useAgentStore()
const modelConfigStore = useModelConfigStore()
const noteStore = useNoteStore()
// Refs
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)
const expandedMessageId = ref<string | null>(null)
const showHistory = ref(false)
const historyBtnRef = ref<HTMLElement | null>(null)
const selectedNotes = ref<{ id: string; title: string }[]>([])
const showNoteSelector = ref(false)
const lastAtPosition = ref(-1)
const noteSelectorRef = ref<{ focusSearchInput: () => void } | null>(null)

const placeholders = [
  '@ 笔记，和 AI 聊聊...',
  '选择 AI Agent 开始对话...',
  '让 AI 帮你梳理思路...',
  '试试 @ 多篇笔记进行总结对比...'
]

const currentIndex = ref(0)
// 明确指定 timer 的类型
let timer: number | null = null

// 随机切换函数
const randomPlaceholder = () => {
  let newIndex
  do {
    newIndex = Math.floor(Math.random() * placeholders.length)
  } while (newIndex === currentIndex.value)
  currentIndex.value = newIndex
}

// 计算属性
const getPlaceholder = computed(() => {
  if (isLoading.value) return '          思考中...'
  return placeholders[currentIndex.value]
})

// 开始轮换
const startRotation = () => {
  if (!timer) {
    timer = window.setInterval(randomPlaceholder, 5000)
  }
}

// 停止轮换
const stopRotation = () => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  startRotation()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyboardShortcuts)

  // 添加初始化加载动画配置
  aiChatStore.initLoadingAnimation()
})

onUnmounted(() => {
  stopRotation()
})

// 可以在输入框获得焦点时停止轮换
const onFocus = () => {
  stopRotation()
}

// 在输入框失去焦点时重新开始轮换
const onBlur = () => {
  startRotation()
}

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

// 添加模型项的计算属性
const modelItems = computed(() => {
  return modelConfigStore.configs.map((config) => ({
    key: config.id,
    label: config.name,
    active: config.isDefault,
    icon: Receiver
  }))
})

// 方法
const handleSend = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const messageText = inputMessage.value
  const noteRefs = selectedNotes.value.slice()

  try {
    inputMessage.value = ''
    selectedNotes.value = []

    const request: ChatRequest = {
      query: messageText,
      conversationId: currentConversation.value?.id,
      references:
        noteRefs.length > 0
          ? {
              noteIds: noteRefs.map((note) => note.id),
              shouldSearchNotes: true
            }
          : undefined,
      agentId: agentStore.currentAgent?.id
    }

    const response = await aiChatStore.sendChatRequest(request)
    console.log('消息发送完成:', {
      messageId: response.messageId,
      conversationId: currentConversation.value?.id,
      messageCount: currentConversation.value?.messages?.length,
      lastMessageTimestamp: currentConversation.value?.messages?.length
        ? getMessageTimestamp(
            currentConversation.value.messages[currentConversation.value.messages.length - 1]
              .createdAt
          )
        : null
    })

    // 等待一下再滚动，确保DOM更新
    nextTick(() => {
      scrollToLatestMessage()
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    if (error instanceof Error) {
      if (error.message.includes('发送消息太快')) {
        message.warning(error.message)
      } else if (!error.message.includes('aborted')) {
        message.error('发送消息失败: ' + error.message)
      }
    } else {
      message.error('发送消息失败，请稍后重试')
    }

    // 恢复输入内容
    if (!(error instanceof Error && error.message.includes('aborted'))) {
      inputMessage.value = messageText
      selectedNotes.value = noteRefs
    }
  }
}

const scrollToLatestMessage = () => {
  console.log('尝试滚动到最新消息')

  const messages = currentConversation.value?.messages
  if (!messages?.length) {
    console.log('没有消息，不需要滚动')
    return
  }

  requestAnimationFrame(() => {
    try {
      // 找到最后一条用户消息
      let lastUserMessageIndex = -1
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessageIndex = i
          break
        }
      }

      if (lastUserMessageIndex === -1) {
        console.log('未找到用户消息')
        return
      }

      // 找到对应的消息元素
      const messageElements = document.querySelectorAll('.message-wrapper')
      const lastUserMessageElement = messageElements[lastUserMessageIndex]

      if (!lastUserMessageElement || !messagesContainer.value) {
        console.log('未找到消息元素或容器')
        return
      }

      // 计算需要滚动的位置
      const containerRect = messagesContainer.value.getBoundingClientRect()
      const messageRect = lastUserMessageElement.getBoundingClientRect()
      const scrollTop = messagesContainer.value.scrollTop + (messageRect.top - containerRect.top)

      // 滚动到计算出的位置
      messagesContainer.value.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })

      console.log('执行滚动到指定位置:', {
        scrollTop,
        messageTop: messageRect.top,
        containerTop: containerRect.top
      })
    } catch (error) {
      console.error('滚动过程中出错:', error)
    }
  })
}

// const onTypewriterComplete = (messageId: string) => {
//   // 只标记消息为已显示
//   assistantStore.markMessageAsDisplayed(messageId)
//   focusInput()
// }

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
  if (event.key === 'Escape' && showNoteSelector.value) {
    showNoteSelector.value = false
    // 添加聚焦到输入框
    focusInput()
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
  // 不再关闭笔记选择器
  // showNoteSelector.value = false

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

// 修改监听逻辑
watch(
  () => currentConversation.value?.messages?.length,
  () => {
    if (!currentConversation.value?.messages?.length) return

    const messages = currentConversation.value.messages
    const lastMessage = messages[messages.length - 1]

    // 只在用户发送消息时触发滚动
    if (lastMessage.role === 'user') {
      console.log('检测到新的用户消息，准备滚动')
      scrollToLatestMessage()
    }
  }
)

// 添加 toggleReferences 方法
const toggleReferences = (messageId: string) => {
  console.log('切换引用展示:', {
    messageId,
    currentExpanded: expandedMessageId.value,
    hasReferences: currentConversation.value?.messages?.find((m) => m.id === messageId)?.references
      ?.notes?.length
  })

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
      bottom: `${window.innerHeight - rect.top + 50}px`,
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

// 2. 修改 handleAbortRequest 函数
const handleAbortRequest = async () => {
  console.log('用户触发中断请求')
  try {
    await aiChatStore.abortCurrentRequest()
    console.log('请求中断成功')
    message.success('已中断请求')
  } catch (error) {
    console.error('中断请求失败:', error)
    message.error('中断请求失败')
  }
}

/**
 * 处理 Agent 选择
 * @async
 * @description 选择 AI Agent 并开始新对话，同时处理已选择的笔记引用
 * @param {string} agentId - Agent ID
 */
const handleAgentSelect = async (agentId: string) => {
  console.log('选择 Agent:', agentId)

  if (agentId === 'empty') {
    return
  }

  try {
    const agent = agentStore.agents.find((a) => a.id === agentId)
    if (!agent) {
      throw new Error('未找到指定的 Agent')
    }

    console.log('切换到 Agent:', {
      name: agent.name,
      id: agent.id,
      hasSelectedNotes: selectedNotes.value.length > 0
    })

    // 清空当前对话
    aiChatStore.createNewConversation()

    // 保存当前选中的笔记，因为发送后要清空
    const noteRefs = selectedNotes.value.slice()

    // 构造请求，包含已选择的笔记引用
    const request: ChatRequest = {
      agentId,
      references:
        noteRefs.length > 0
          ? {
              noteIds: noteRefs.map((note) => note.id),
              shouldSearchNotes: true
            }
          : undefined
    }

    console.log('开始新对话，请求数据:', {
      agentId,
      selectedNotesCount: noteRefs.length,
      request
    })

    // 发送请求
    await aiChatStore.sendChatRequest(request)

    // 清空已选择的笔记
    selectedNotes.value = []
  } catch (error) {
    console.error('切换 Agent 失败:', error)
    message.error('切换 Agent 失败')
  }
}

// 添加时间戳处理函数
const getMessageTimestamp = (createdAt: Date | string | number): number => {
  if (createdAt instanceof Date) {
    return createdAt.getTime()
  }
  if (typeof createdAt === 'string') {
    return new Date(createdAt).getTime()
  }
  if (typeof createdAt === 'number') {
    return createdAt
  }
  return Date.now() // 默认返回当前时间戳
}

// 修改 watch 函数，添加时间戳检查
watch(
  () => currentConversation.value?.messages,
  (newMessages) => {
    console.log('消息数组变化:', {
      messageCount: newMessages?.length,
      messages: newMessages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        hasReferences: !!msg.references?.notes?.length,
        referenceCount: msg.references?.notes?.length || 0,
        sourceTypes: msg.sourceTypes,
        references: msg.references,
        timestamp: getMessageTimestamp(msg.createdAt)
      }))
    })
  },
  { deep: true }
)

const handleNewConversation = () => {
  // 调用 store 中的新建会话方法
  aiChatStore.createNewConversation()
  // 清空输入框
  inputMessage.value = ''
}

const handleSendMessage = async () => {
  if (!inputMessage.value.trim()) return

  const currentInput = inputMessage.value
  inputMessage.value = '' // 立即清空输入框

  try {
    const request: ChatRequest = {
      // 如果没有 currentConversationId，则不传入 conversationId，表示新会话
      conversationId: currentConversation.value?.id || undefined,
      query: currentInput
      // ... 其他请求参数
    }

    // 发送请求并处理响应
    await aiChatStore.sendChatRequest(request)
  } catch (error) {
    // 错误处理...
    console.error('发送消息失败:', error)
    // 可以添加用户提示
    // message.error('发送消息失败，请重试')
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

// 添加模型切换处理方法
const handleModelSwitch = async (modelId: string) => {
  try {
    await modelConfigStore.setDefaultConfig(modelId)
    message.success('已切换模型')
  } catch (error) {
    console.error('切换模型失败:', error)
    message.error('切换模型失败')
  }
}

// 修改 handleClickOutside 函数
const handleClickOutside = (event: MouseEvent) => {
  // 检查点击是否在笔记选择器外部
  if (showNoteSelector.value) {
    const noteSelectorEl = document.querySelector('.note-selector')
    if (noteSelectorEl && !noteSelectorEl.contains(event.target as Node)) {
      showNoteSelector.value = false
      // 在关闭笔记选择器后，重新聚焦到输入框
      focusInput()
    }
  }

  // 检查点击是否在历史菜单外部
  if (showHistory.value) {
    const historyPanelEl = document.querySelector('.history-panel')
    const historyBtnEl = historyBtnRef.value
    // 如果点击不在历史面板内，也不在历史按钮上，则关闭历史面板
    if (
      historyPanelEl &&
      !historyPanelEl.contains(event.target as Node) &&
      historyBtnEl &&
      !historyBtnEl.contains(event.target as Node)
    ) {
      showHistory.value = false
    }
  }
}

// 添加键盘事件处理函数
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // 检查是否是 Cmd+Backspace (Mac) 或 Ctrl+Backspace (Windows)
  if ((event.metaKey || event.ctrlKey) && event.key === 'Backspace') {
    // 只有在加载状态时才处理中断请求
    if (isLoading.value) {
      event.preventDefault() // 阻止默认行为
      handleAbortRequest()
    }
  }
}

// 在组件挂载时添加事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

// 在组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})

// 创建异步组件映射
const loadingComponents = {
  candle: defineAsyncComponent(() => import('@renderer/components/ui/LoadingCandle.vue')),
  pencil: defineAsyncComponent(() => import('@renderer/components/ui/LoadingPencil.vue')),
  mouse: defineAsyncComponent(() => import('@renderer/components/ui/LoadingMouse.vue')),
  pacman: defineAsyncComponent(() => import('@renderer/components/ui/LoadingPacMan.vue')),
  taichi: defineAsyncComponent(() => import('@renderer/components/ui/LoadingTaiChi.vue')),
  windmill: defineAsyncComponent(() => import('@renderer/components/ui/LoadingWindmill.vue')),
  washing: defineAsyncComponent(() => import('@renderer/components/ui/LoadingWashing.vue')),
  typewriter: defineAsyncComponent(() => import('@renderer/components/ui/LoadingTypewriter.vue')),
  loadingFox: defineAsyncComponent(() => import('@renderer/components/ui/LoadingFox.vue'))
}

// 添加新的处理函数
const handleNoteSelectorClose = () => {
  showNoteSelector.value = false
  focusInput()
}

// 添加清空笔记的方法
const clearSelectedNotes = () => {
  selectedNotes.value = []
  focusInput() // 清空后聚焦到输入框
}

const handleAgentSetting = () => {
  router.push({ name: 'AgentView' })
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
      transform: translateY(-76px); /* 添加这行 */
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
      max-width: calc(100% - 1rem);
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
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    width: 100%;

    .left-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .right-buttons {
      display: flex;
      align-items: center;
    }

    :deep(.dropdown-trigger) {
      height: 32px;
      padding: 0 12px;
      font-size: 13px;

      &.icon-only {
        width: 32px;
        padding: 0;
      }
    }
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

    // 修改思考中动画的样式
    .thinking-animation {
      position: absolute;
      left: -65px;
      bottom: -23px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      pointer-events: none; // 确保动画不会影响输入框的交互

      :deep(svg) {
        width: 20px;
        height: 20px;
      }
    }

    textarea {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.5;
      padding: 8px 40px 8px 8px; // 恢复原来的内边距
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
    background: var(--color-primary);
    border-radius: 50%;
    color: #fff;
    width: 30px;
    height: 30px;
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
      &:hover {
        transform: scale(1.1);
        background: color-mix(in srgb, var(--color-primary) 85%, white);
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
    display: none;
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

.selected-notes {
  display: flex;
  gap: 8px;
  padding-top: 8px;
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
  background: var(--color-red);
  border-radius: 50%;
  color: #fff;
  width: 30px;
  height: 30px;
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
    background: color-mix(in srgb, var(--color-red) 85%, white);
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
