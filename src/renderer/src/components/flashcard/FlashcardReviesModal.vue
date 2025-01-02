<template>
  <FlashcardModal
    :model-value="modelValue"
    :close-on-outside-click="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="review-modal">
      <!-- 新增：标题区域 -->
      <div class="title-bar">
        <div class="title-content">
          <div class="title-icon">
            <StorageCardOne
              theme="outline"
              size="16"
              fill="var(--color-primary)"
              :strokeWidth="3"
            />
          </div>
          <h2>记忆卡片</h2>
        </div>
        <div class="toolbar-right">
          <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
            <div class="icon">
              <More theme="outline" size="16" fill="var(--color-icon-default)" :strokeWidth="3" />
            </div>
            <PopupMenu
              ref="moreMenuRef"
              :show="moreMenuState.isOpen"
              :position="moreMenuState.position"
              :menuItems="noteMenuItems"
              @close="closeMoreMenu"
              @itemClick="handleMenuItemClick"
            />
          </div>
          <button class="close-button" @click="handleClose">
            <div class="icon">
              <Close theme="outline" size="16" fill="var(--color-icon-default)" :strokeWidth="3" />
            </div>
          </button>
        </div>
      </div>

      <!-- 顶部进度条 -->
      <div class="review-header">
        <div class="progress-wrapper">
          <div class="progress-bar">
            <div
              class="progress-value"
              :style="{ width: `${((currentIndex + 1) / totalCards) * 100}%` }"
            ></div>
          </div>
          <span class="progress-text">{{ currentIndex + 1 }} / {{ totalCards }}</span>
        </div>
      </div>

      <!-- 中间内容区域（只有这部分会翻转） -->
      <div class="card-container">
        <div class="card" :class="{ 'is-flipped': isFlipped }">
          <!-- 正面：问题 -->
          <div class="card-front">
            <div class="content-box">
              <h2 class="card-title">{{ currentCard?.metadata?.title }}</h2>
            </div>
          </div>
          <!-- 背面：答案 -->
          <div class="card-back">
            <div class="content-box">
              <TipTapEditor
                :content="currentCard?.content"
                :editable="false"
                :enable-drag-handle="false"
                :note-id="currentCard?.id"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮区域（不翻转） -->
      <div class="button-area">
        <!-- 未翻转时显示"显示答案"按钮 -->
        <button v-if="!isFlipped" class="show-answer-btn" @click="flipCard">
          <Eyes theme="outline" size="16" :strokeWidth="3" />
          显示答案
        </button>
        <!-- 翻转后显示反馈按钮组 -->
        <div v-else class="feedback-buttons">
          <button
            v-for="feedback in feedbackOptions"
            :key="feedback.value"
            class="feedback-btn"
            :class="feedback.class"
            @click="handleFeedback(feedback.value)"
          >
            <component :is="feedback.icon" theme="outline" size="16" :strokeWidth="3" />
            {{ feedback.label }}
          </button>
        </div>
      </div>

      <!-- 学习完成状态 -->
      <div v-if="isCompleted" class="completion-state">
        <div class="completion-icon">
          <CheckOne theme="outline" size="48" :strokeWidth="3" />
        </div>
        <h2>今日学习完成！</h2>
        <p>你已经完成了所有待复习的卡片</p>
        <button class="close-btn" @click="handleClose">关闭</button>
      </div>
    </div>
  </FlashcardModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Close,
  CheckOne,
  CloseSmall,
  ThinkingProblem,
  Check,
  Eyes,
  More,
  StorageCardOne,
  Next
} from '@icon-park/vue-next'
import FlashcardModal from './FlashcardModal.vue'
import TipTapEditor from '../tiptap/TipTapEditor.vue'
import type { Note } from '@renderer/types/Note'
import type { ReviewFeedback } from '@renderer/types/flashcard'
import PopupMenu from '../common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'

const props = defineProps<{
  modelValue: boolean
  cards: Note[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  feedback: [noteId: string, feedback: ReviewFeedback]
}>()

// 状态
const currentIndex = ref(0)
const isFlipped = ref(false)
const isCompleted = ref(false)

// 计算属性
const totalCards = computed(() => props.cards.length)
const currentCard = computed(() => {
  const card = props.cards[currentIndex.value]
  console.log('当前卡片数据:', {
    card,
    title: card?.metadata?.title,
    content: card?.content,
    totalCards: props.cards.length,
    currentIndex: currentIndex.value
  })
  return card
})

// 反馈选项
const feedbackOptions = [
  {
    label: '稍后复习',
    value: 'skip' as ReviewFeedback,
    class: 'skip',
    icon: Next
  },
  {
    label: '需要重学',
    value: 'forgot' as ReviewFeedback,
    class: 'forgot',
    icon: CloseSmall
  },
  {
    label: '模糊印象',
    value: 'partially_recalled' as ReviewFeedback,
    class: 'partial',
    icon: ThinkingProblem
  },
  {
    label: '想起来了',
    value: 'recalled_effort' as ReviewFeedback,
    class: 'recalled',
    icon: Check
  },
  {
    label: '非常熟悉',
    value: 'easily_recalled' as ReviewFeedback,
    class: 'mastered',
    icon: CheckOne
  }
]

// 方法
const flipCard = () => {
  console.log('翻转卡片，当前状态:', {
    isFlipped: isFlipped.value,
    currentCard: currentCard.value,
    title: currentCard.value?.metadata?.title,
    content: currentCard.value?.content
  })
  if (!isFlipped.value) {
    isFlipped.value = true
  }
}

const handleFeedback = async (feedback: ReviewFeedback) => {
  console.log('提交反馈:', {
    feedback,
    noteId: currentCard.value?.id,
    currentIndex: currentIndex.value,
    totalCards: totalCards.value
  })
  emit('feedback', currentCard.value.id, feedback)

  // 移动到下一张卡片
  if (currentIndex.value < totalCards.value - 1) {
    currentIndex.value++
    isFlipped.value = false
  } else {
    isCompleted.value = true
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  // 重置状态
  currentIndex.value = 0
  isFlipped.value = false
  isCompleted.value = false
}

// 新增：更多菜单相关逻辑
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: currentCard.value?.id || '',
  menuItems: ['star', 'convertToFlashcard', 'copyQuote', 'exportNote']
})

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

const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  closeMoreMenu()
}
</script>

<style lang="scss" scoped>
.review-modal {
  width: 75vw;
  height: 75vh;
  max-width: 1000px;
  max-height: 700px;
  min-width: 800px;
  min-height: 600px;
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  // 新增：标题区域样式
  .title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
    margin-bottom: 12px;
    position: relative;

    .title-content {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;

      .title-icon {
        width: 24px;
        height: 24px;
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
          width: 20px;
          height: 20px;
        }
      }

      h2 {
        font-size: 20px;
        font-weight: 600;
        color: var(--color-primary);
        margin: 0;
        white-space: nowrap;
      }
    }

    .toolbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 1;
    }

    .more-btn {
      display: flex;
      align-items: center;
      border: none;
      background: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 6px;
      padding: 4px;

      .icon {
        width: 24px;
        height: 24px;
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
          width: 20px;
          height: 20px;
        }
      }

      &:hover {
        background-color: var(--color-hover-button);
      }
    }

    .close-button {
      display: flex;
      align-items: center;
      border: none;
      background: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 6px;
      padding: 4px;

      .icon {
        width: 24px;
        height: 24px;
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
          width: 20px;
          height: 20px;
        }
      }

      &:hover {
        background-color: var(--color-hover-button);
      }
    }
  }
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;

    .progress-bar {
      flex: 1;
      height: 4px;
      background: var(--color-bg-tertiary);
      border-radius: 2px;
      overflow: hidden;

      .progress-value {
        height: 100%;
        background: var(--color-primary);
        transition: width 0.3s ease;
      }
    }

    .progress-text {
      font-size: 14px;
      color: var(--color-text-secondary);
    }
  }

  .close-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-hover-button);
    }
  }
}

.card-container {
  flex: 1;
  perspective: 1000px;

  .card {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.6s;

    &.is-flipped {
      transform: rotateY(180deg);
    }

    .card-front,
    .card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
    }

    .card-back {
      transform: rotateY(180deg);
    }

    .content-box {
      width: 100%;
      height: 100%;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-y: auto;
    }
  }
}

.button-area {
  min-height: 48px; // 确保按钮区域高度固定

  .show-answer-btn {
    width: 100%;
    padding: 12px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    .i-icon {
      width: 24px;
      height: 24px;
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
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);
    }
  }

  .feedback-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;

    .feedback-btn {
      min-width: 120px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 20px 0 14px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      .i-icon {
        width: 24px;
        height: 24px;
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
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(-1px);
      }

      &.skip {
        background: rgba(var(--color-text-secondary-rgb), 0.1);
        color: var(--color-text-secondary);
        &:hover {
          background: rgba(var(--color-text-secondary-rgb), 0.15);
          box-shadow: 0 2px 8px rgba(var(--color-text-secondary-rgb), 0.1);
        }
      }

      &.forgot {
        background: rgba(var(--color-danger-rgb), 0.1);
        color: var(--color-danger);
        &:hover {
          background: rgba(var(--color-danger-rgb), 0.15);
          box-shadow: 0 2px 8px rgba(var(--color-danger-rgb), 0.2);
        }
      }

      &.partial {
        background: rgba(var(--color-yellow-rgb), 0.1);
        color: var(--color-yellow);
        &:hover {
          background: rgba(var(--color-yellow-rgb), 0.15);
          box-shadow: 0 2px 8px rgba(var(--color-yellow-rgb), 0.2);
        }
      }

      &.recalled {
        background: rgba(var(--color-blue-rgb), 0.1);
        color: var(--color-blue);
        &:hover {
          background: rgba(var(--color-blue-rgb), 0.15);
          box-shadow: 0 2px 8px rgba(var(--color-blue-rgb), 0.2);
        }
      }

      &.mastered {
        background: rgba(var(--color-primary-rgb), 0.1);
        color: var(--color-primary);
        &:hover {
          background: rgba(var(--color-primary-rgb), 0.15);
          box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.2);
        }
      }
    }
  }
}

.card-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
  margin: 0;
  width: 90%;
}

.completion-state {
  text-align: center;
  padding: 40px 0;

  .completion-icon {
    color: var(--color-green);
    margin-bottom: 16px;
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  p {
    font-size: 16px;
    color: var(--color-text-secondary);
    margin-bottom: 24px;
  }

  .close-btn {
    padding: 8px 24px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(var(--color-primary-rgb), 0.3);
    }
  }
}
</style>
