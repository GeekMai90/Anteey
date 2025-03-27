<template>
  <div class="mind-echo-card" :class="cardClasses">
    <!-- 卡片头部：始终显示 -->
    <div class="card-header" @click="toggleExpand">
      <div class="header-content">
        <div class="title">{{ echo.title }}</div>
        <div class="summary">{{ echo.summary }}</div>
        <div class="timestamp">{{ formatDate(echo.createdAt) }}</div>
      </div>

      <div class="meta">
        <div class="actions">
          <!-- 查看原对话按钮 -->
          <IconButton
            v-if="echo.conversationId"
            :icon="Robot"
            tooltip="查看原对话"
            size="small"
            @click.stop="openConversation"
          />
          <!-- 删除按钮 -->
          <IconButton :icon="Delete" tooltip="删除" size="small" @click.stop="handleDeleteClick" />
        </div>
      </div>

      <Motion
        as="div"
        class="expand-icon"
        :initial="{ rotate: 0 }"
        :animate="{ rotate: isExpanded ? 180 : 0 }"
        :transition="{ duration: 0.3, ease: 'easeInOut' }"
      >
        <Down theme="outline" size="14" :stroke-width="3" />
      </Motion>
    </div>

    <!-- 卡片内容：展开时显示 -->
    <transition
      name="slide"
      @enter="handleExpandEnter"
      @after-enter="handleExpandAfterEnter"
      @leave="handleExpandLeave"
    >
      <div v-if="isExpanded" class="card-content">
        <div class="editor-container">
          <TipTapEditor
            v-model:content="localContent"
            :editable="true"
            :enable-drag-handle="true"
            :note-id="props.echo.noteId"
            @update:content="handleContentUpdate"
          />
        </div>
      </div>
    </transition>

    <!-- 添加 ConfirmDialog -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除确认"
      message="确定要删除这条思维共鸣吗？删除后将无法恢复。"
      type="danger"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed, onMounted } from 'vue'
import { Delete, Down, Robot } from '@icon-park/vue-next'
import { Motion } from 'motion-v'
import type { MindEcho } from '@shared/types/mind-echo'
import { formatDate } from '@renderer/utils/noteHelpers'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useUIStore } from '@renderer/stores/UIStore'
import { useMindEchoStore } from '@renderer/stores/mindEchoStore'
import { debounce } from 'lodash-es'
// 导入 ConfirmDialog 组件
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import IconButton from '@renderer/components/ui/IconButton.vue'
import { useAIChatStore } from '@renderer/stores/aiChatStore'

const props = defineProps<{
  echo: MindEcho
  isNew?: boolean // 新增 prop，用于标识是否是新创建的共鸣
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const uiStore = useUIStore()
const mindEchoStore = useMindEchoStore()
const aiChatStore = useAIChatStore()
// 状态
const isExpanded = ref(false)
const localContent = ref(props.echo.content)

// 添加删除确认对话框的状态
const showDeleteConfirm = ref(false)

// 添加一个新的 ref 来控制动画状态
const showAnimation = ref(false)

// 修改计算属性
const cardClasses = computed(() => {
  const classes = {
    expanded: isExpanded.value,
    'is-new': props.isNew && showAnimation.value
  }
  console.log('MindEchoCard: 计算类名', {
    isNew: props.isNew,
    showAnimation: showAnimation.value,
    classes
  })
  return classes
})

// 监听 props 变化
watch(
  () => props.echo.content,
  (newContent) => {
    localContent.value = newContent
  }
)

// 使用防抖保存内容
const saveContent = debounce(
  async (echoId: string, content: any) => {
    try {
      await mindEchoStore.updateMindEcho({
        id: echoId,
        content
      })
    } catch (error) {
      console.error('保存思维共鸣失败:', error)
      // 可以添加错误提示
    }
  },
  2000,
  { trailing: true }
)

// 内容更新时自动保存
const handleContentUpdate = async (newContent: any) => {
  try {
    // 确保内容是可序列化的
    const safeContent = JSON.parse(JSON.stringify(newContent))

    // 更新本地状态
    localContent.value = safeContent

    // 触发防抖保存
    saveContent(props.echo.id, safeContent)
  } catch (error) {
    console.error('Content serialization error:', error)
  }
}

// 展开/折叠切换
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 修改删除点击处理函数
const handleDeleteClick = () => {
  showDeleteConfirm.value = true
}

// 添加删除确认处理函数
const handleDeleteConfirm = () => {
  emit('delete', props.echo.id)
}

// 打开原对话
const openConversation = async () => {
  if (props.echo.conversationId) {
    console.log('MindEchoCard: 打开原对话', props.echo.conversationId)
    // 使用新的方法打开 AI 助手面板
    uiStore.openAIAssistant()
    console.log('选择历史会话:', props.echo.conversationId)
    // 先清空当前会话,避免显示旧的消息
    aiChatStore.createNewConversation()
    // 获取并加载历史会话
    await aiChatStore.fetchConversationDetail(props.echo.conversationId)

    // 等待面板打开后，延迟执行定位
    // TODO: 后续我们会实现定位到特定对话的功能
  }
}

// 组件卸载前确保所有待保存的内容都已保存
onBeforeUnmount(() => {
  saveContent.flush()
})

// 展开/折叠动画处理
const handleExpandEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = 'auto'
  const height = element.scrollHeight
  element.style.height = '0px'
  element.offsetHeight // 触发重绘
  element.style.height = `${height}px`
}

// 修改展开后的处理函数
const handleExpandAfterEnter = (el: Element) => {
  console.log('MindEchoCard: 展开动画完成')
  const element = el as HTMLElement
  element.style.height = 'auto'

  // 在展开动画完成后，延迟一小段时间再触发光效动画
  if (props.isNew) {
    console.log('MindEchoCard: 是新卡片，准备触发动画')
    setTimeout(() => {
      console.log('MindEchoCard: 开始触发动画')
      showAnimation.value = true
    }, 100)
  }
}

const handleExpandLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  element.offsetHeight // 触发重绘
  element.style.height = '0px'
}

// 修改 watch
watch(
  () => props.isNew,
  (newValue) => {
    console.log('MindEchoCard: isNew prop 变化', newValue)
    if (newValue) {
      console.log('MindEchoCard: 检测到新卡片')
      // 重置动画状态
      showAnimation.value = false
      // 延迟设置动画状态
      setTimeout(() => {
        console.log('MindEchoCard: 准备开始动画')
        showAnimation.value = true
      }, 100)
    } else {
      // 当 isNew 变为 false 时，确保动画状态被重置
      showAnimation.value = false
    }
  },
  { immediate: true } // 添加 immediate: true 确保首次挂载时也执行
)

// 移除 onMounted 中的动画触发逻辑，因为已经在 watch 中处理了
onMounted(() => {
  console.log('MindEchoCard: 组件挂载', { isNew: props.isNew })
})
</script>

<style scoped lang="scss">
.mind-echo-card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative; // 添加相对定位

  // 添加光效动画
  &.is-new {
    animation: cardScale 2s ease-in-out forwards; // 添加 forwards 保持最终状态

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(var(--color-primary-rgb), 0.2),
        // 使用 RGB 值并降低透明度
        transparent
      );
      animation: lightSlide 2.5s ease-in-out forwards; // 添加 forwards
      pointer-events: none; // 确保光效不影响交互
    }
  }

  &:hover {
    background: var(--color-hover-bg);
  }

  &.expanded {
    background: var(--color-bg-primary);
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;

    .header-content {
      flex: 1;
      min-width: 0; // 防止文本溢出

      .title {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .summary {
        font-size: 13px;
        color: var(--color-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-bottom: 4px;
      }

      .timestamp {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }

    .meta {
      display: flex;
      align-items: center;
      margin-left: 16px;

      .actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
    }

    .expand-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-tertiary);
      transition: transform 0.3s ease;
    }

    &:hover {
      .actions {
        opacity: 1;
      }
    }
  }

  .card-content {
    overflow: hidden;

    .editor-container {
      padding: 20px 16px;
      border-top: 1px solid var(--color-border);
    }
  }
}

// 展开/折叠动画
.slide-enter-active,
.slide-leave-active {
  transition: height 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  height: 0;
}

// 修改光效滑动动画
@keyframes lightSlide {
  0% {
    left: -100%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
}

// 修改缩放动画
@keyframes cardScale {
  0% {
    transform: scale(1);
  }
  20% {
    transform: scale(1.02);
  }
  80% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}
</style>
