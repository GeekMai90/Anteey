<template>
  <div class="mind-echo-card" :class="{ expanded: isExpanded }">
    <!-- 卡片头部：始终显示 -->
    <div class="card-header" @click="toggleExpand">
      <div class="header-content">
        <div class="title">{{ echo.title }}</div>
        <div class="summary">{{ echo.summary }}</div>
      </div>

      <div class="meta">
        <span class="timestamp">{{ formatDate(echo.createdAt) }}</span>
        <div class="actions">
          <button v-tooltip.left="'删除'" class="action-btn delete" @click.stop="handleDeleteClick">
            <Delete theme="outline" size="14" :stroke-width="3" />
          </button>
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

        <div v-if="echo.conversationId" class="conversation-link">
          <button class="link-btn" @click="openConversation">
            <div class="icon">
              <Robot theme="outline" size="14" :stroke-width="3" />
            </div>
            <span class="text">查看原对话</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { Delete, Down, Robot } from '@icon-park/vue-next'
import { Motion } from 'motion-v'
import type { MindEcho } from '@shared/types/mind-echo'
import { formatDate } from '@renderer/utils/noteHelpers'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useUIStore } from '@renderer/stores/UIStore'
import { useMindEchoStore } from '@renderer/stores/mindEchoStore'
import { debounce } from 'lodash-es'

const props = defineProps<{
  echo: MindEcho
}>()

const emit = defineEmits<{
  delete: [id: string]
}>()

const uiStore = useUIStore()
const mindEchoStore = useMindEchoStore()

// 状态
const isExpanded = ref(false)
const localContent = ref(props.echo.content)

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

// 删除操作
const handleDeleteClick = () => {
  if (confirm('确定要删除这条思维共鸣吗？')) {
    emit('delete', props.echo.id)
  }
}

// 打开原对话
const openConversation = () => {
  if (props.echo.conversationId) {
    uiStore.openRightSidebarWithTab('ai')
    // TODO: 实现打开特定对话的逻辑
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

const handleExpandAfterEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = 'auto'
}

const handleExpandLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  element.offsetHeight // 触发重绘
  element.style.height = '0px'
}
</script>

<style scoped lang="scss">
.mind-echo-card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;

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
      }
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: 16px;

      .timestamp {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }

      .actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          background: none;
          border-radius: 4px;
          color: var(--color-text-tertiary);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: var(--color-hover-button);
            color: var(--color-text-secondary);
          }

          &.delete:hover {
            color: var(--color-danger);
            background: var(--color-danger-bg);
          }
        }
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

    .conversation-link {
      padding: 8px 16px;
      border-top: 1px solid var(--color-border);

      .link-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: none;
        background: none;
        border-radius: 6px;
        color: var(--color-text-tertiary);
        cursor: pointer;
        transition: all 0.2s ease;

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text {
          font-size: 13px;
        }

        &:hover {
          background: var(--color-hover-button);
          color: var(--color-text-secondary);
        }
      }
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
</style>
