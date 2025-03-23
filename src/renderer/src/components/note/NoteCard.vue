<!-- src/components/NoteCard.vue -->
<template>
  <div class="note-card">
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address }}</h3>

      <div class="note-buttons">
        <div
          v-tooltip.bottom="tooltipConfig.expandNote"
          class="note-button"
          @click.stop="expandNote"
        >
          <div class="icon">
            <ExpandTextInput
              theme="outline"
              size="16"
              fill="var(--color-icon-default)"
              :strokeWidth="3"
            />
          </div>
        </div>
        <!-- 更多功能菜单按钮 -->
        <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
          <div v-tooltip.bottom="tooltipConfig.more" class="icon">
            <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <!-- 更多功能菜单按钮 -->
          <PopupMenu
            ref="moreMenuRef"
            :show="moreMenuState.isOpen"
            :button-ref="moreBtnRef"
            :menuItems="noteMenuItems"
            @close="closeMoreMenu"
            @itemClick="handleMenuItemClick"
          />
        </div>
        <!-- 添加AI按钮 -->
        <div ref="aiBtnRef" class="ai-btn" @click.stop="toggleAIMenu">
          <div v-tooltip.bottom="tooltipConfig.ai" class="icon">
            <Robot theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
          </div>
          <!-- AI功能菜单 -->
          <PopupMenu
            ref="aiMenuRef"
            :show="aiMenuState.isOpen"
            :button-ref="aiBtnRef"
            :menuItems="agentMenuItems"
            @close="closeAIMenu"
            @itemClick="handleAgentMenuItemClick"
          />
        </div>
      </div>
    </div>
    <div ref="noteContent" class="note-content" @dblclick="useNoteStore().openNoteEditor(note.id)">
      <JsonContentRenderer
        :key="note.id"
        :content="note.content"
        :editable="false"
        :enable-drag-handle="false"
      />
    </div>
    <div class="note-timestamp">
      <div class="note-tags">
        <div
          v-for="tag in noteTags"
          :key="tag.id"
          class="tag-item"
          @click.stop="handleTagClick(tag.id)"
        >
          <span class="tag-symbol">#</span>
          <span class="tag-name">{{ tag.name }}</span>
        </div>
      </div>
      <div class="timestamp-section">
        <div
          v-if="note.isFlashcard"
          v-tooltip.top="getFlashcardTooltipConfig(flashcardTooltip)"
          class="flashcard-indicator"
        >
          <StorageCardOne theme="outline" size="14" :fill="flashcardColor" :strokeWidth="3" />
        </div>
        {{ formatDate(note.createdAt) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import { More, ExpandTextInput, StorageCardOne, Robot } from '@icon-park/vue-next'
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useTagStore } from '@renderer/stores/tagStore'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { State } from 'ts-fsrs'
import JsonContentRenderer from '@renderer/components/note/JsonContentRenderer.vue'
import type { Tag } from '@shared/types'
import { useAgentStore } from '@renderer/stores/agentStore'

// 定义静态的 tooltip 配置
const tooltipConfig = {
  expandNote: { content: '展开编辑', delay: { show: 1000 }, html: true },
  more: { content: '更多', delay: { show: 1000 } },
  ai: { content: 'AI助手', delay: { show: 1000 } }
}

// 定义静态的闪卡 tooltip 配置函数
const getFlashcardTooltipConfig = (tooltip: string) => ({
  content: tooltip,
  delay: { show: 1000 },
  html: true
})

const props = defineProps<{
  note: Note
}>()

// 更多按钮弹出菜单

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.note.id,
  menuItems: ['star', 'convertToFlashcard', 'sidebar', 'copyQuote', 'share', 'exportNote', 'delete']
})
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef,
  onClose: () => {
    resetDeleteState()
  }
})
// 更多菜单点击事件
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

// 展开笔记
const router = useRouter()
const expandNote = () => {
  router.push({ name: 'NoteExpandEditor', params: { id: props.note.id } })
}

const cardTypeClass = computed(() => {
  switch (props.note.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    case 'Draftcard':
      return 'draftcard'
    default:
      return ''
  }
})

// 计算闪卡状态颜色
const flashcardColor = computed(() => {
  const state = props.note.flashcard?.fsrs?.state as State | undefined
  if (!state) return 'var(--color-text-secondary)'

  switch (state as State) {
    case State.New:
      return 'var(--color-fsrs-new)'
    case State.Learning:
      return 'var(--color-fsrs-learning)'
    case State.Review:
      return 'var(--color-fsrs-review)'
    case State.Relearning:
      return 'var(--color-fsrs-relearning)'
    default:
      return 'var(--color-text-secondary)'
  }
})

// 计算闪卡图标提示文本
const flashcardTooltip = computed(() => {
  const state = props.note.flashcard?.fsrs?.state as State | undefined
  if (!state) return '新卡片' // 刚创建的闪卡，还未开始学习

  switch (state as State) {
    case State.New: // 新创建，未学习
      return '新卡片'
    case State.Learning: // 首次学习中
      return '学习中'
    case State.Review: // 复习阶段
      return '复习中'
    case State.Relearning: // 遗忘后重新学习
      return '重新学习'
    default:
      return '记忆卡'
  }
})

// 添加标签相关代码
const tagStore = useTagStore()
const noteTags = ref<Tag[]>([])

const fetchNoteTags = async () => {
  noteTags.value = await tagStore.getNoteTags(props.note.id)
}

// 标签点击处理
const handleTagClick = (tagId: string) => {
  router.push({
    name: 'cardbox',
    query: {
      tags: tagId,
      box: 'all'
    }
  })
}

// AI菜单相关
const agentStore = useAgentStore()
const aiBtnRef = ref<HTMLElement | null>(null)
const aiMenuRef = ref<HTMLElement | null>(null)

const {
  menuState: aiMenuState,
  toggleMenu: toggleAIMenu,
  closeMenu: closeAIMenu
} = useMenu({
  buttonRef: aiBtnRef,
  menuRef: aiMenuRef
})

// 获取Agent菜单项
const agentMenuItems = computed(() => {
  return agentStore.generateAgentMenuItems(props.note.id)
})

// 处理Agent菜单项点击
const handleAgentMenuItemClick = (item: MenuItem) => {
  item.action()
  closeAIMenu()
}

onMounted(async () => {
  // 只获取标签，不再获取 agents
  await fetchNoteTags()
})
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--color-bg-note-card);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-border-light);
  transition: all 0.3s ease;
  padding: 15px 0px 6px 0;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  cursor: pointer;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary);
  }
  // box-shadow: var(--shadow-card);
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    position: relative;
    // margin-left: 2rem;
    // padding-left: 2rem;
    padding: 0 15px 0 24px; // 调整左右内边距
    height: 30px;

    .note-indicator {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 13px;
      border-radius: 2px;
      margin-right: 10px;

      &.maincard {
        background-color: var(--color-primary);
      }

      &.bibcard {
        background-color: var(--color-yellow);
      }

      &.indexcard {
        background-color: var(--color-blue);
      }

      &.hoplinkcard {
        background-color: var(--color-pink);
      }

      &.draftcard {
        background-color: var(--color-draft);
      }
    }
    @media (prefers-color-scheme: dark) {
      .note-indicator {
        &.maincard {
          background-color: var(--color-primary);
        }

        // 稍微亮一点的绿色
        &.bibcard {
          background-color: var(--color-yellow);
        }

        // 稍微亮一点的橙色
        &.indexcard {
          background-color: var(--color-blue);
        }

        // 稍微亮一点的蓝色
        &.hoplinkcard {
          background-color: var(--color-pink);
        }
        // 稍微亮一点的灰色
        &.draftcard {
          background-color: var(--color-draft);
        }
      }
    }
    .note-title {
      margin: 0;
      font-size: 1.3rem;
      font-weight: bold;
      color: var(--color-text-primary);
    }
    .note-buttons {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      // gap: 3px;
      opacity: 0; // 使用 opacity 代替 visibility
      transition: opacity 0.2s ease; // 添加过渡效果
      margin-right: 10px;
      .note-options-menu {
        :deep(.note-options-menu) {
          transform: translateX(-68%); // 居中对齐
        }
      }
      .note-button,
      .more-btn,
      .ai-btn {
        position: relative;
        display: flex;
        align-items: center;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
        padding: 4px 4px;
        margin: 2px;

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

        .name {
          flex-grow: 0;
          text-align: left;
          color: var(---color-text-primary);
          font-size: 13px;
          font-weight: 400;
          margin-left: 6px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
        }

        &:hover {
          background-color: var(--color-hover-button);
        }

        &:active {
          background-color: rgba(0, 0, 0, 0.1);
        }

        &.delete {
          color: #ff4d4f;
        }
      }
    }
  }
  // 新增：确保菜单始终可见
  .note-options-menu {
    opacity: 1 !important;
    visibility: visible !important;
  }
  :deep(.note-options-menu) {
    transform: translateX(-66%);
  }

  .note-content {
    flex-grow: 1;
    color: var(--color-text-primary);
    text-align: left;
    margin-bottom: 10px;
    padding: 0 25px;
    // min-height: 60px;
    // max-height: 300px;
    height: 230px;
    overflow: hidden;
    position: relative;
    font-size: 15px;
  }

  :deep(.tiptap) {
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }
}

.note-card:hover .note-buttons {
  opacity: 1;
}

.fade-out {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1));
  /* 模糊效果 */
  pointer-events: none;
  /* 确保不影响交互 */
}

.note-timestamp {
  font-size: 0.8em;
  color: var(--color-text-tertiary);
  padding: 8px 15px; // 增加上下内边距
  // margin-top: 10px; // 增加与内容区域的间距
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 32px; // 设置最小高度

  .note-tags {
    display: flex;
    gap: 6px;
    flex: 0 1 auto; // 改为自动收缩
    align-items: center;
    margin-right: 12px;
    max-width: 500px; // 设置最大宽度
    overflow: hidden; // 超出隐藏
    white-space: nowrap; // 不换行

    .tag-item {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 22px;
      padding: 0 8px;
      background: var(--color-primary-light);
      border: 1px solid transparent;
      border-radius: 11px;
      font-size: 12px;
      transition: all 0.2s ease;
      cursor: pointer;
      flex-shrink: 0; // 防止标签被压缩

      &:hover {
        border-color: var(--color-primary);
      }

      .tag-symbol {
        color: var(--color-primary);
        font-size: 12px;
      }

      .tag-name {
        color: var(--color-primary);
        font-weight: 400;
      }
    }
  }

  .timestamp-section {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0; // 防止时间戳被压缩
  }

  .flashcard-indicator {
    display: flex;
    align-items: center;
    color: var(--color-primary);

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
}
</style>
