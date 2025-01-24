<template>
  <div
    :id="`note-${note.id}`"
    class="note-card"
    :class="{ highlighted: isHighlighted }"
    @dblclick="useNoteStore().openNoteEditor(note.id)"
  >
    <div class="note-header">
      <span class="note-indicator" :class="cardTypeClass"></span>
      <h3 class="note-title">{{ note.address ? note.address : '无编码地址' }}</h3>

      <div class="note-buttons">
        <div class="note-button" @click.stop="expandNote">
          <div class="icon">
            <ExpandTextInput
              theme="outline"
              size="18"
              fill="var(--color-icon-default)"
              :strokeWidth="3"
            />
          </div>
        </div>
        <!-- 添加卡片盒设置按钮 -->
        <div ref="cardboxBtnRef" class="note-button" @click.stop="toggleCardboxMenu">
          <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
            <Install theme="outline" size="16" fill="var(--color-icon-default)" :strokeWidth="3" />
          </div>
          <CardboxDropdownMenu
            ref="cardboxMenuRef"
            :is-open="cardboxMenuState.isOpen"
            :note-id="note.id"
            :current-cardbox-id="note.cardBoxId"
            :button-ref="cardboxBtnRef"
            @close="closeCardboxMenu"
            @update="handleCardboxUpdate"
          />
        </div>
        <!-- 更多功能菜单按钮 -->
        <div ref="moreBtnRef" class="note-button" @click.stop="toggleMoreMenu">
          <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
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
      </div>
    </div>
    <div ref="noteContent" class="note-content">
      <TipTapRender
        v-if="localNote"
        :key="localNote.id"
        :content="localNote.content"
        :editable="false"
        :enable-drag-handle="isDragHandleEnabled"
      />
    </div>
    <div class="note-timestamp">
      <div
        v-if="note.isFlashcard"
        v-tooltip.top="{
          content: flashcardTooltip,
          delay: { show: 1000 },
          html: true
        }"
        class="flashcard-indicator"
      >
        <StorageCardOne theme="outline" size="14" :fill="flashcardColor" :strokeWidth="3" />
      </div>
      {{ formatDate(note.updatedAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Note } from '@shared/types'
import { formatDate } from '@renderer/utils/noteHelpers'
import { More, ExpandTextInput, StorageCardOne, Install } from '@icon-park/vue-next'
import { computed, onUnmounted, ref, toRef, watch } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useRouter } from 'vue-router'
import TipTapRender from '@renderer/components/tiptap/TipTapRender.vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { State } from 'ts-fsrs/dist'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'

const props = defineProps<{
  note: Note
  highlightedNoteId: string | null
}>()

// 本地控制高亮状态
const localHighlight = ref(false)
let highlightTimer: NodeJS.Timeout | null = null

// 监听 highlightedNoteId 变化
watch(
  () => props.highlightedNoteId,
  (newId) => {
    if (newId === props.note.id) {
      localHighlight.value = true

      // 清除之前的定时器（如果存在）
      if (highlightTimer) {
        clearTimeout(highlightTimer)
      }

      // 等待滚动动画完成（大约500ms）后再开始计时
      highlightTimer = setTimeout(() => {
        // 2秒后清除高亮
        setTimeout(() => {
          localHighlight.value = false
        }, 5000)
      }, 500) // 等待滚动完成
    }
  },
  { immediate: true }
)

// 组件卸载时清理定时器
onUnmounted(() => {
  if (highlightTimer) {
    clearTimeout(highlightTimer)
  }
})

// 修改计算属性
const isHighlighted = computed(() => localHighlight.value)

const localNote = toRef(props, 'note')

// const emit = defineEmits(['edit'])
const isDragHandleEnabled = ref(false)

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.note.id,
  menuItems: ['star', 'convertToFlashcard', 'sidebar', 'copyQuote', 'share', 'delete']
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

// 处理内容超高时底部出现模糊效果
const noteContent = ref<HTMLDivElement | null>(null)

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

// 添加卡片盒菜单相关逻辑
const cardboxBtnRef = ref<HTMLElement | null>(null)
const cardboxMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: cardboxMenuState,
  toggleMenu: toggleCardboxMenu,
  closeMenu: closeCardboxMenu
} = useMenu({
  buttonRef: cardboxBtnRef,
  menuRef: cardboxMenuRef,
  onClose: () => {
    console.log('卡片盒菜单已关闭')
  }
})

// 处理卡片盒更新
const handleCardboxUpdate = async (cardBoxId: string) => {
  if (props.note) {
    // 可以选择是否发出事件通知父组件更新
    emit('cardbox-update', { noteId: props.note.id, cardBoxId })
  }
}

// 添加 emit 定义
const emit = defineEmits(['cardbox-update'])
</script>

<style lang="scss" scoped>
.note-card {
  background-color: var(--color-note-card-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 0px 10px 0;
  // margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  width: 100%; // 使用 100% 宽度
  height: var(--card-height);
  overflow: hidden; // 防止内容溢出
  box-shadow: var(--shadow-card);
  user-select: none;
  // box-shadow:
  //   0 1px 2px rgba(0, 0, 0, 0.05),
  //   0 4px 8px rgba(0, 0, 0, 0.05),
  //   0 8px 16px rgba(0, 0, 0, 0.05);
  // transition: box-shadow 0.3s ease-in-out;
  // &:hover {
  //   box-shadow:
  //     0 2px 4px rgba(0, 0, 0, 0.05),
  //     0 6px 12px rgba(0, 0, 0, 0.05),
  //     0 12px 24px rgba(0, 0, 0, 0.05);
  // }
  .note-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    position: relative;
    padding: 0 15px 0 25px; // 调整左右内边距
    height: 30px;

    .note-indicator {
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 12px;
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
        // 稍微亮一点的粉红色
      }
    }
    .note-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .note-buttons {
      position: absolute;
      top: -5px;
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
      .note-button {
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
          color: var(--default-text-color);
          font-size: 13px;
          font-weight: 400;
          margin-left: 6px;
          white-space: nowrap;
          writing-mode: horizontal-tb;
          line-height: 1;
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

  .note-content {
    flex-grow: 1;
    color: var(--color-text-primary);
    text-align: left;
    margin-bottom: 10px;
    min-height: 60px;
    max-height: 300px;
    overflow: hidden;
    position: relative;
    font-size: 15px;
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
  color: var(--color-text-secondary);
  align-self: flex-end;
  margin-right: 15px;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;

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

:deep(.tiptap) {
  margin-left: 0;
  margin-right: 0;
  padding-left: 15px;
  padding-right: 15px;
}

.note-card {
  &.highlighted {
    box-shadow: 0 0 0 2px var(--color-primary);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(var(--color-primary-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0);
  }
}
</style>
