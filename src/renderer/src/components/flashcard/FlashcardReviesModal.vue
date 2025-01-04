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
        <div class="timer-display" :style="timerStyles">
          <span class="time-value">{{ Math.floor(elapsedTime / 1000) }}</span>
        </div>
      </div>

      <!-- 顶部进度条 -->
      <div v-if="!isCompleted" class="review-header">
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
      <div v-if="!isCompleted" class="card-container">
        <div class="card" :class="{ 'is-flipped': isFlipped }">
          <!-- 正面：问题 -->
          <div class="card-front" :class="{ hide: isFlipped }">
            <div class="content-box">
              <div class="note-address">{{ currentCard?.address || '无编码' }}</div>
              <h2 class="card-title">{{ currentCard?.metadata?.title }}</h2>
            </div>
          </div>
          <!-- 背面：答案 -->
          <div class="card-back" :class="{ show: isFlipped }">
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
      <div v-if="!isCompleted" class="button-area">
        <!-- 未翻转时显示"显示答案"按钮 -->
        <button
          v-if="!isFlipped"
          v-tooltip.top="{ content: '空格键', delay: { show: 1000 }, html: true }"
          class="show-answer-btn"
          @click="flipCard"
        >
          <Eyes theme="outline" size="16" :strokeWidth="3" />
          显示答案
        </button>
        <!-- 翻转后显示反馈按钮组 -->
        <div v-else class="feedback-buttons">
          <button
            v-for="feedback in feedbackOptions"
            :key="feedback.value"
            v-tooltip.top="{
              content: feedback.shortcut,
              delay: { show: 1000 },
              html: true
            }"
            class="feedback-btn"
            :class="feedback.class"
            @click="handleFeedback(feedback.value)"
          >
            <div class="btn-content">
              <div class="btn-main">
                <div class="icon">
                  <component :is="feedback.icon" theme="outline" size="16" :strokeWidth="3" />
                </div>
                <span class="label">{{ feedback.label }}</span>
              </div>
              <div v-if="showNextReviewTime" class="next-review-time">
                {{ formatInterval(getExpectedDueTime(feedback.value)) }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- 学习完成状态 -->
      <div v-if="isCompleted" class="completion-state">
        <div class="completion-content">
          <div class="completion-icon">
            <CheckOne theme="outline" size="64" :strokeWidth="3" fill="var(--color-primary)" />
          </div>
          <div class="completion-text">
            <h2>今日学习完成！</h2>
            <p>你已经完成了所有待复习的卡片</p>
          </div>
          <button class="close-btn" @click="handleClose">
            <span>完成</span>
          </button>
        </div>
      </div>
    </div>
  </FlashcardModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Close,
  CheckOne,
  ThinkingProblem,
  Eyes,
  More,
  GrinningFaceWithSquintingEyes,
  StorageCardOne,
  CloseOne,
  CircleDoubleRight
} from '@icon-park/vue-next'
import FlashcardModal from './FlashcardModal.vue'
import TipTapEditor from '../tiptap/TipTapEditor.vue'
import type { Note } from '@shared/types'
import type { ReviewFeedback } from '@shared/types'
import PopupMenu from '../common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import confetti from 'canvas-confetti'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { fsrs, Rating, type Grade } from 'ts-fsrs'
import { useFlashcardStore } from '@renderer/stores/flashcardStore'

const props = defineProps<{
  modelValue: boolean
  cards: Note[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  feedback: [noteId: string, feedback: ReviewFeedback, reviewTime: number, isSimplified: boolean]
  complete: []
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

const flashcardStore = useFlashcardStore()

// 获取设置中的简化按钮状态
const isSimplifiedMode = computed(() => flashcardStore.settings?.simplifyButtons ?? false)

// 修改反馈选项，根据简化模式显示不同的选项
const feedbackOptions = computed(() => {
  if (isSimplifiedMode.value) {
    // 简化模式：只显示两个按钮
    return [
      {
        label: '完全不会',
        value: 'forgot' as ReviewFeedback,
        class: 'forgot',
        icon: CloseOne,
        shortcut: 'J'
      },
      {
        label: '有点印象',
        value: 'recalled_effort' as ReviewFeedback,
        class: 'recalled',
        icon: CheckOne,
        shortcut: 'L'
      }
    ]
  }

  // 完整模式：显示所有按钮
  return [
    {
      label: '稍后复习',
      value: 'skip' as ReviewFeedback,
      class: 'skip',
      icon: CircleDoubleRight,
      shortcut: 'H'
    },
    {
      label: '完全不会',
      value: 'forgot' as ReviewFeedback,
      class: 'forgot',
      icon: CloseOne,
      shortcut: 'J'
    },
    {
      label: '有点困难',
      value: 'partially_recalled' as ReviewFeedback,
      class: 'partial',
      icon: ThinkingProblem,
      shortcut: 'K'
    },
    {
      label: '记住了',
      value: 'recalled_effort' as ReviewFeedback,
      class: 'recalled',
      icon: CheckOne,
      shortcut: 'L'
    },
    {
      label: '很容易',
      value: 'easily_recalled' as ReviewFeedback,
      class: 'mastered',
      icon: GrinningFaceWithSquintingEyes,
      shortcut: ';'
    }
  ]
})

// 方法
const flipCard = () => {
  if (!currentCard.value) return

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

// 添加计时相关的状态
const startTime = ref<number>(0) // 开始时间戳
const elapsedTime = ref<number>(0) // 已用时间
const timerInterval = ref<number>() // 计时器间隔

// 格式化时间显示
// const formatTime = (ms: number) => {
//   const seconds = Math.floor(ms / 1000)
//   return `${seconds}秒`
// }

// 开始计时
const startTimer = () => {
  startTime.value = Date.now()
  timerInterval.value = window.setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value
  }, 1000)
}

// 停止计时
const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
}

const handleFeedback = async (feedback: ReviewFeedback) => {
  if (!currentCard.value) return

  // 停止当前计时
  stopTimer()
  const reviewTime = Date.now() - startTime.value

  // 发送反馈时带上用时
  emit('feedback', currentCard.value.id, feedback, reviewTime, isSimplifiedMode.value)

  // 移动到下一张卡片
  if (currentIndex.value < totalCards.value - 1) {
    currentIndex.value++
    isFlipped.value = false
    // 重新开始计时
    startTimer()
  } else {
    isCompleted.value = true
    // 触发烟花效果
    const myCanvas = document.createElement('canvas')
    myCanvas.style.position = 'fixed'
    myCanvas.style.top = '0'
    myCanvas.style.left = '0'
    myCanvas.style.width = '100%'
    myCanvas.style.height = '100%'
    myCanvas.style.pointerEvents = 'none'
    myCanvas.style.zIndex = '9999'
    document.body.appendChild(myCanvas)

    const myConfetti = confetti.create(myCanvas, {
      resize: true,
      useWorker: true
    })

    myConfetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FF69B4', '#4169E1', '#7B68EE', '#32CD32', '#FFD700', '#FF6347'],
      ticks: 300,
      disableForReducedMotion: true
    }).then(() => {
      // 动画完成后移除 canvas
      document.body.removeChild(myCanvas)
    })
  }
}

const handleClose = () => {
  // 停止计时
  stopTimer()
  // 重置计时状态
  elapsedTime.value = 0

  emit('update:modelValue', false)
  // 如果是学习完成状态，触发完成事件
  emit('complete')

  // 重置状态
  currentIndex.value = 0
  isFlipped.value = false
  isCompleted.value = false
}

// 监听 modelValue 的变化，当模态框打开时开始计时
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && props.cards.length > 0) {
      // 模态框打开，开始计时
      startTimer()
    } else {
      // 模态框关闭，停止计时并重置
      stopTimer()
      elapsedTime.value = 0
    }
  }
)

// 新增：更多菜单相关逻辑
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: currentCard.value?.id || '',
  menuItems: ['star', 'convertToFlashcard']
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

// 添加键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  // 如果正在输入，不处理快捷键
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  // 空格键显示答案
  if (e.code === 'Space' && !isFlipped.value) {
    e.preventDefault() // 防止空格键滚动页面
    flipCard()
    return
  }

  // 处理反馈快捷键
  if (isFlipped.value) {
    const key = e.key.toUpperCase()
    const feedbackOption = feedbackOptions.value.find(
      (option) => option.shortcut.toUpperCase() === key
    )
    if (feedbackOption) {
      e.preventDefault()
      handleFeedback(feedbackOption.value)
    }
  }
}

// 在组件挂载时添加键盘事件监听
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// 在组件卸载时移除键盘事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const f = fsrs()

// 计算预期复习时间
const getExpectedDueTime = (feedback: ReviewFeedback) => {
  if (!currentCard.value?.flashcard?.fsrs) return null

  const scheduling = f.repeat(currentCard.value.flashcard.fsrs, new Date())
  const rating = feedbackToRating(feedback)
  return scheduling[rating].card.due
}

// 格式化时间间隔
const formatInterval = (date: Date | null) => {
  if (!date) return ''
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
}

// 反馈到评分的映射
const feedbackToRating = (feedback: ReviewFeedback): Grade => {
  switch (feedback) {
    case 'forgot':
      return Rating.Again
    case 'partially_recalled':
      return Rating.Hard
    case 'recalled_effort':
      return Rating.Good
    case 'easily_recalled':
      return Rating.Easy
    case 'skip':
    default:
      return Rating.Good
  }
}

// 添加一个计算属性来获取是否显示下次复习时间的设置
const showNextReviewTime = computed(() => flashcardStore.settings?.showNextReview ?? true)

// 在组件挂载时开始计时
onMounted(() => {
  if (props.cards && props.cards.length > 0) {
    startTimer()
    console.log('初始化卡片数据:', props.cards)
  } else {
    console.warn('没有可用的卡片数据')
    handleClose()
  }
})

// 在组件卸载时清理计时器
onUnmounted(() => {
  stopTimer()
})

// 添加一个计算属性来判断是否超时
const isOverTime = computed(() => {
  const maxTime = (flashcardStore.settings?.maxAnswerTime ?? 20) * 1000 // 转换为毫秒
  return elapsedTime.value > maxTime
})

// 添加一个计算属性来设置 CSS 变量
const timerStyles = computed(() => ({
  '--timer-gradient': isOverTime.value
    ? 'linear-gradient(135deg, rgba(var(--color-danger-rgb), 0.05), rgba(var(--color-danger-rgb), 0.1))'
    : 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05), rgba(var(--color-primary-rgb), 0.1))',
  '--timer-border-color': isOverTime.value
    ? 'rgba(var(--color-danger-rgb), 0.1)'
    : 'rgba(var(--color-primary-rgb), 0.1)',
  '--timer-text-color': isOverTime.value ? 'var(--color-danger)' : 'var(--color-primary)',
  '--timer-animation': isOverTime.value ? 'timerPulseDanger' : 'timerPulse'
}))
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
    // margin-bottom: 12px;
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

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .progress-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    padding: 0 4px;

    .progress-bar {
      flex: 1;
      height: 4px;
      background: var(--color-bg-tertiary);
      border-radius: 2px;
      overflow: hidden;

      .progress-value {
        height: 100%;
        background: var(--color-primary);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    .progress-text {
      font-size: 13px;
      color: var(--color-text-secondary);
      min-width: 45px;
      text-align: right;
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
  position: relative;

  .card {
    position: relative;
    width: 100%;
    height: 100%;

    .card-front,
    .card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      transition: opacity 0.3s ease;
    }

    .card-front {
      opacity: 1;
      &.hide {
        opacity: 0;
      }
    }

    .card-back {
      opacity: 0;
      &.show {
        opacity: 1;
      }
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
      position: relative;
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
      height: 64px; // 增加按钮高度
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);

      .btn-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;

        .btn-main {
          display: flex;
          align-items: center;
          gap: 2px;

          .icon {
            background: none;
            border: none;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
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
        }

        .next-review-time {
          font-size: 12px;
          opacity: 0.8;
          transition: all 0.3s ease;
          height: 16px; // 固定高度以保持按钮大小一致
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
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 40px;

  .completion-content {
    text-align: center;
    animation: fadeInUp 0.6s ease;
  }

  .completion-icon {
    color: var(--color-primary);
    margin-bottom: 24px;
    animation: scaleIn 0.6s ease 0.2s both;

    :deep(svg) {
      filter: drop-shadow(0 4px 12px rgba(var(--color-primary-rgb), 0.2));
    }
  }

  .completion-text {
    animation: fadeIn 0.6s ease 0.4s both;
  }

  h2 {
    font-size: 28px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 12px;
  }

  p {
    font-size: 16px;
    color: var(--color-text-secondary);
    margin-bottom: 32px;
  }

  .close-btn {
    padding: 12px 32px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    animation: fadeIn 0.6s ease 0.6s both;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
    }

    &:active {
      transform: translateY(-1px);
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.note-address {
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.timer-display {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--timer-gradient);
  border: 1px solid var(--timer-border-color);
  font-size: 14px;
  color: var(--timer-text-color);
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &::before {
    content: '用时';
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    font-size: 13px;
    color: var(--timer-text-color);
    opacity: 0.8;
  }

  .time-value {
    font-family: 'JetBrains Mono', monospace;
    color: var(--timer-text-color);
    min-width: 40px;
    text-align: center;
    position: relative;

    &::after {
      content: '秒';
      font-family:
        system-ui,
        -apple-system,
        sans-serif;
      font-size: 13px;
      margin-left: 2px;
      opacity: 0.8;
    }
  }

  &:hover {
    transform: translateY(-50%) translateX(2px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.1);
  }

  animation: var(--timer-animation) 2s infinite;
}

@keyframes timerPulse {
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 2px 12px rgba(var(--color-primary-rgb), 0.15);
  }
  100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

// 添加超时状态的脉动动画
@keyframes timerPulseDanger {
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  50% {
    box-shadow: 0 2px 12px rgba(var(--color-danger-rgb), 0.2);
  }
  100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}
</style>
