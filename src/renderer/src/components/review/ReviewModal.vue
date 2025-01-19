<template>
  <FlashcardModal
    :model-value="modelValue"
    :close-on-outside-click="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="review-modal">
      <!-- 标题区域 -->
      <div class="title-bar">
        <div class="title-content" @click="handleTitleClick">
          <div class="title-icon">
            <Cup theme="outline" size="16" fill="var(--color-primary)" :strokeWidth="3" />
          </div>
          <h2>随机回顾</h2>
        </div>
        <div class="toolbar-right">
          <!-- <button class="refresh-button" @click="handleNext" :disabled="isLoading">
            <div class="icon" :class="{ 'is-loading': isLoading }">
              <Refresh
                theme="outline"
                size="16"
                fill="var(--color-icon-default)"
                :strokeWidth="3"
              />
            </div>
          </button> -->
          <button class="close-button" @click="handleClose">
            <div class="icon">
              <Close theme="outline" size="16" fill="var(--color-icon-default)" :strokeWidth="3" />
            </div>
          </button>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="content-container">
        <div class="note-header">
          <div class="note-address">{{ currentNote?.address || '无编码' }}</div>
        </div>
        <div class="note-content">
          <TipTapEditor
            :content="currentNote?.content"
            :editable="false"
            :enable-drag-handle="false"
            :note-id="currentNote?.id"
          />
        </div>
      </div>

      <!-- 底部按钮区域 -->
      <div class="button-area">
        <!-- 普通按钮 -->
        <button
          v-if="!uiStore.isMarioStyle"
          v-tooltip.top="{ content: '回车键或空格键', delay: { show: 1000 }, html: true }"
          class="next-btn"
          @click="handleNext"
        >
          <div class="icon">
            <CircleDoubleRight theme="outline" size="16" :strokeWidth="3" />
          </div>
          下一条
        </button>

        <!-- 马里奥按钮 -->
        <div v-else class="mario-button" @click="handleMarioClick">
          <div class="brick one"></div>
          <div class="brick three"></div>
          <div class="tooltip-mario-container">
            <div class="box"></div>
            <div ref="mushRef" class="mush"></div>
          </div>
          <div class="brick four"></div>
          <div class="brick two"></div>
        </div>
      </div>
    </div>
  </FlashcardModal>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Close, CircleDoubleRight, Cup } from '@icon-park/vue-next'
import FlashcardModal from '../flashcard/FlashcardModal.vue'
import TipTapEditor from '../tiptap/TipTapEditor.vue'
import { useReviewStore } from '@renderer/stores/reviewStore'
import { useUIStore } from '@renderer/stores/UIStore'
import { storeToRefs } from 'pinia'
import powerUpSound from '@renderer/assets/sounds/powerup.mp3'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const reviewStore = useReviewStore()
const { randomNote: currentNote } = storeToRefs(reviewStore)
const mushRef = ref<HTMLElement | null>(null)

const uiStore = useUIStore()

const audio = new Audio()
audio.src = powerUpSound
audio.volume = 0.2

const handleNext = async () => {
  await reviewStore.fetchRandomNote()
}

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleMarioClick = async () => {
  if (mushRef.value) {
    mushRef.value.style.opacity = '1'
    mushRef.value.classList.add('show')
    // 播放音效
    audio.currentTime = 0 // 重置音频播放位置
    audio.play()

    setTimeout(async () => {
      if (mushRef.value) {
        mushRef.value.style.opacity = '0'
        mushRef.value.classList.remove('show')
      }
      await handleNext()
    }, 500)
  }
}

// 添加标题点击处理函数
const handleTitleClick = () => {
  uiStore.toggleButtonStyle()
}

// 修改键盘事件处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  // 回车键或空格键触发下一条
  if (e.code === 'Enter' || e.code === 'Space') {
    e.preventDefault()
    if (uiStore.isMarioStyle) {
      handleMarioClick()
    } else {
      handleNext()
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await reviewStore.fetchRandomNote()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
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

  .title-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px;
    position: relative;

    .title-content {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;

      &:hover {
        opacity: 0.8;
      }

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

      .refresh-button,
      .close-button {
        display: flex;
        align-items: center;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 6px;
        padding: 4px;

        &:hover {
          background-color: var(--color-hover-button);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

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
            width: 16px;
            height: 16px;
          }

          &.is-loading {
            animation: spin 1s linear infinite;
          }
        }
      }
    }
  }

  .content-container {
    flex: 1;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .note-header {
      padding: 16px 24px 0 24px;
      position: relative;

      .note-address {
        font-size: 12px;
        color: var(--color-text-secondary);
        opacity: 0.8;
        margin-bottom: 8px;
      }
    }

    .note-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;

      :deep(.tiptap-editor) {
        height: 100%;
      }
    }
  }

  .button-area {
    min-height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;

    .mario-button {
      position: relative;
      width: 200px;
      height: 34px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: translateY(-16px);
    }

    .next-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 12px 24px;
      width: 100%;
      border: none;
      border-radius: 6px;
      background: var(--color-primary);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;

      &:focus {
        outline: none;
      }

      &:hover {
        opacity: 0.8;
      }

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
          width: 16px;
          height: 16px;
        }
      }
    }
  }
}

.brick {
  height: 2px;
  width: 2px;
  box-shadow:
    2px 2px 0px #ff9999,
    4px 2px 0px #ff9999,
    6px 2px 0px #ff9999,
    8px 2px 0px #ff9999,
    10px 2px 0px #ff9999,
    12px 2px 0px #ff9999,
    14px 2px 0px #ff9999,
    16px 2px 0px #ff9999,
    18px 2px 0px #ff9999,
    20px 2px 0px #ff9999,
    22px 2px 0px #ff9999,
    24px 2px 0px #ff9999,
    26px 2px 0px #ff9999,
    28px 2px 0px #ff9999,
    30px 2px 0px #ff9999,
    32px 2px 0px #ff9999,
    2px 4px 0px #cc3300,
    4px 4px 0px #cc3300,
    6px 4px 0px #cc3300,
    8px 4px 0px #cc3300,
    10px 4px 0px #cc3300,
    12px 4px 0px #cc3300,
    14px 4px 0px #cc3300,
    16px 4px 0px #000,
    18px 4px 0px #cc3300,
    20px 4px 0px #cc3300,
    22px 4px 0px #cc3300,
    24px 4px 0px #cc3300,
    26px 4px 0px #cc3300,
    28px 4px 0px #cc3300,
    30px 4px 0px #cc3300,
    32px 4px 0px #000,
    2px 6px 0px #cc3300,
    4px 6px 0px #cc3300,
    6px 6px 0px #cc3300,
    8px 6px 0px #cc3300,
    10px 6px 0px #cc3300,
    12px 6px 0px #cc3300,
    14px 6px 0px #cc3300,
    16px 6px 0px #000,
    18px 6px 0px #cc3300,
    20px 6px 0px #cc3300,
    22px 6px 0px #cc3300,
    24px 6px 0px #cc3300,
    26px 6px 0px #cc3300,
    28px 6px 0px #cc3300,
    30px 6px 0px #cc3300,
    32px 6px 0px #000,
    2px 8px 0px #000,
    4px 8px 0px #000,
    6px 8px 0px #000,
    8px 8px 0px #000,
    10px 8px 0px #000,
    12px 8px 0px #000,
    14px 8px 0px #000,
    16px 8px 0px #000,
    18px 8px 0px #000,
    20px 8px 0px #000,
    22px 8px 0px #000,
    24px 8px 0px #000,
    26px 8px 0px #000,
    28px 8px 0px #000,
    30px 8px 0px #000,
    32px 8px 0px #000,
    2px 10px 0px #cc3300,
    4px 10px 0px #cc3300,
    6px 10px 0px #cc3300,
    8px 10px 0px #000,
    10px 10px 0px #cc3300,
    12px 10px 0px #cc3300,
    14px 10px 0px #cc3300,
    16px 10px 0px #cc3300,
    18px 10px 0px #cc3300,
    20px 10px 0px #cc3300,
    22px 10px 0px #cc3300,
    24px 10px 0px #000,
    26px 10px 0px #cc3300,
    28px 10px 0px #cc3300,
    30px 10px 0px #cc3300,
    32px 10px 0px #cc3300,
    2px 12px 0px #cc3300,
    4px 12px 0px #cc3300,
    6px 12px 0px #cc3300,
    8px 12px 0px #000,
    10px 12px 0px #cc3300,
    12px 12px 0px #cc3300,
    14px 12px 0px #cc3300,
    16px 12px 0px #cc3300,
    18px 12px 0px #cc3300,
    20px 12px 0px #cc3300,
    22px 12px 0px #cc3300,
    24px 12px 0px #000,
    26px 12px 0px #cc3300,
    28px 12px 0px #cc3300,
    30px 12px 0px #cc3300,
    32px 12px 0px #cc3300,
    2px 14px 0px #cc3300,
    4px 14px 0px #cc3300,
    6px 14px 0px #cc3300,
    8px 14px 0px #000,
    10px 14px 0px #cc3300,
    12px 14px 0px #cc3300,
    14px 14px 0px #cc3300,
    16px 14px 0px #cc3300,
    18px 14px 0px #cc3300,
    20px 14px 0px #cc3300,
    22px 14px 0px #cc3300,
    24px 14px 0px #000,
    26px 14px 0px #cc3300,
    28px 14px 0px #cc3300,
    30px 14px 0px #cc3300,
    32px 14px 0px #cc3300,
    2px 16px 0px #000,
    4px 16px 0px #000,
    6px 16px 0px #000,
    8px 16px 0px #000,
    10px 16px 0px #000,
    12px 16px 0px #000,
    14px 16px 0px #000,
    16px 16px 0px #000,
    18px 16px 0px #000,
    20px 16px 0px #000,
    22px 16px 0px #000,
    24px 16px 0px #000,
    26px 16px 0px #000,
    28px 16px 0px #000,
    30px 16px 0px #000,
    32px 16px 0px #000,
    2px 18px 0px #cc3300,
    4px 18px 0px #cc3300,
    6px 18px 0px #cc3300,
    8px 18px 0px #cc3300,
    10px 18px 0px #cc3300,
    12px 18px 0px #cc3300,
    14px 18px 0px #cc3300,
    16px 18px 0px #000,
    18px 18px 0px #cc3300,
    20px 18px 0px #cc3300,
    22px 18px 0px #cc3300,
    24px 18px 0px #cc3300,
    26px 18px 0px #cc3300,
    28px 18px 0px #cc3300,
    30px 18px 0px #cc3300,
    32px 18px 0px #000,
    2px 20px 0px #cc3300,
    4px 20px 0px #cc3300,
    6px 20px 0px #cc3300,
    8px 20px 0px #cc3300,
    10px 20px 0px #cc3300,
    12px 20px 0px #cc3300,
    14px 20px 0px #cc3300,
    16px 20px 0px #000,
    18px 20px 0px #cc3300,
    20px 20px 0px #cc3300,
    22px 20px 0px #cc3300,
    24px 20px 0px #cc3300,
    26px 20px 0px #cc3300,
    28px 20px 0px #cc3300,
    30px 20px 0px #cc3300,
    32px 20px 0px #000,
    2px 22px 0px #cc3300,
    4px 22px 0px #cc3300,
    6px 22px 0px #cc3300,
    8px 22px 0px #cc3300,
    10px 22px 0px #cc3300,
    12px 22px 0px #cc3300,
    14px 22px 0px #cc3300,
    16px 22px 0px #000,
    18px 22px 0px #cc3300,
    20px 22px 0px #cc3300,
    22px 22px 0px #cc3300,
    24px 22px 0px #cc3300,
    26px 22px 0px #cc3300,
    28px 22px 0px #cc3300,
    30px 22px 0px #cc3300,
    32px 22px 0px #000,
    2px 24px 0px #000,
    4px 24px 0px #000,
    6px 24px 0px #000,
    8px 24px 0px #000,
    10px 24px 0px #000,
    12px 24px 0px #000,
    14px 24px 0px #000,
    16px 24px 0px #000,
    18px 24px 0px #000,
    20px 24px 0px #000,
    22px 24px 0px #000,
    24px 24px 0px #000,
    26px 24px 0px #000,
    28px 24px 0px #000,
    30px 24px 0px #000,
    32px 24px 0px #000,
    2px 26px 0px #cc3300,
    4px 26px 0px #cc3300,
    6px 26px 0px #cc3300,
    8px 26px 0px #000,
    10px 26px 0px #cc3300,
    12px 26px 0px #cc3300,
    14px 26px 0px #cc3300,
    16px 26px 0px #cc3300,
    18px 26px 0px #cc3300,
    20px 26px 0px #cc3300,
    22px 26px 0px #cc3300,
    24px 26px 0px #000,
    26px 26px 0px #cc3300,
    28px 26px 0px #cc3300,
    30px 26px 0px #cc3300,
    32px 26px 0px #cc3300,
    2px 28px 0px #cc3300,
    4px 28px 0px #cc3300,
    6px 28px 0px #000,
    8px 28px 0px #cc3300,
    10px 28px 0px #cc3300,
    12px 28px 0px #cc3300,
    14px 28px 0px #cc3300,
    16px 28px 0px #cc3300,
    18px 28px 0px #000,
    20px 28px 0px #000,
    22px 28px 0px #cc3300,
    24px 28px 0px #cc3300,
    26px 28px 0px #cc3300,
    28px 28px 0px #000,
    30px 28px 0px #cc3300,
    32px 28px 0px #000,
    2px 30px 0px #cc3300,
    4px 30px 0px #cc3300,
    6px 30px 0px #cc3300,
    8px 30px 0px #cc3300,
    10px 30px 0px #cc3300,
    12px 30px 0px #cc3300,
    14px 30px 0px #cc3300,
    16px 30px 0px #cc3300,
    18px 30px 0px #cc3300,
    20px 30px 0px #cc3300,
    22px 30px 0px #cc3300,
    24px 30px 0px #cc3300,
    26px 30px 0px #cc3300,
    28px 30px 0px #cc3300,
    30px 30px 0px #cc3300,
    32px 30px 0px #000,
    2px 32px 0px #000,
    4px 32px 0px #000,
    6px 32px 0px #000,
    8px 32px 0px #000,
    10px 32px 0px #000,
    12px 32px 0px #000,
    14px 32px 0px #000,
    16px 32px 0px #000,
    18px 32px 0px #000,
    20px 32px 0px #000,
    22px 32px 0px #000,
    24px 32px 0px #000,
    26px 32px 0px #000,
    28px 32px 0px #000,
    30px 32px 0px #000,
    32px 32px 0px #000;
  transform: translateX(30px);
}

.brick.one {
  transform: translateX(-26px);
}

.brick.two {
  transform: translateX(25px);
}

.brick.three {
  transform: translateX(-60px);
}

.brick.four {
  transform: translateX(59px);
}

.mush {
  height: 2px;
  width: 2px;
  box-shadow:
    14px 2px 0px #fc9838,
    16px 2px 0px #fc9838,
    18px 2px 0px #fc9838,
    20px 2px 0px #fc9838,
    12px 4px 0px #fc9838,
    14px 4px 0px #fc9838,
    16px 4px 0px #fc9838,
    18px 4px 0px #fc9838,
    20px 4px 0px #d82800,
    22px 4px 0px #d82800,
    10px 6px 0px #fc9838,
    12px 6px 0px #fc9838,
    14px 6px 0px #fc9838,
    16px 6px 0px #fc9838,
    18px 6px 0px #d82800,
    20px 6px 0px #d82800,
    22px 6px 0px #d82800,
    24px 6px 0px #d82800,
    8px 8px 0px #fc9838,
    10px 8px 0px #fc9838,
    12px 8px 0px #fc9838,
    14px 8px 0px #fc9838,
    16px 8px 0px #fc9838,
    18px 8px 0px #d82800,
    20px 8px 0px #d82800,
    22px 8px 0px #d82800,
    24px 8px 0px #d82800,
    26px 8px 0px #d82800,
    6px 10px 0px #fc9838,
    8px 10px 0px #fc9838,
    10px 10px 0px #fc9838,
    12px 10px 0px #fc9838,
    14px 10px 0px #fc9838,
    16px 10px 0px #fc9838,
    18px 10px 0px #fc9838,
    20px 10px 0px #d82800,
    22px 10px 0px #d82800,
    24px 10px 0px #d82800,
    26px 10px 0px #fc9838,
    28px 10px 0px #fc9838,
    4px 12px 0px #fc9838,
    6px 12px 0px #fc9838,
    8px 12px 0px #d82800,
    10px 12px 0px #d82800,
    12px 12px 0px #d82800,
    14px 12px 0px #fc9838,
    16px 12px 0px #fc9838,
    18px 12px 0px #fc9838,
    20px 12px 0px #fc9838,
    22px 12px 0px #fc9838,
    24px 12px 0px #fc9838,
    26px 12px 0px #fc9838,
    28px 12px 0px #fc9838,
    30px 12px 0px #fc9838,
    4px 14px 0px #fc9838,
    6px 14px 0px #d82800,
    8px 14px 0px #d82800,
    10px 14px 0px #d82800,
    12px 14px 0px #d82800,
    14px 14px 0px #d82800,
    16px 14px 0px #fc9838,
    18px 14px 0px #fc9838,
    20px 14px 0px #fc9838,
    22px 14px 0px #fc9838,
    24px 14px 0px #fc9838,
    26px 14px 0px #fc9838,
    28px 14px 0px #fc9838,
    30px 14px 0px #fc9838,
    2px 16px 0px #fc9838,
    4px 16px 0px #fc9838,
    6px 16px 0px #d82800,
    8px 16px 0px #d82800,
    10px 16px 0px #d82800,
    12px 16px 0px #d82800,
    14px 16px 0px #d82800,
    16px 16px 0px #fc9838,
    18px 16px 0px #fc9838,
    20px 16px 0px #fc9838,
    22px 16px 0px #fc9838,
    24px 16px 0px #fc9838,
    26px 16px 0px #d82800,
    28px 16px 0px #d82800,
    30px 16px 0px #fc9838,
    32px 16px 0px #fc9838,
    2px 18px 0px #fc9838,
    4px 18px 0px #fc9838,
    6px 18px 0px #d82800,
    8px 18px 0px #d82800,
    10px 18px 0px #d82800,
    12px 18px 0px #d82800,
    14px 18px 0px #d82800,
    16px 18px 0px #fc9838,
    18px 18px 0px #fc9838,
    20px 18px 0px #fc9838,
    22px 18px 0px #fc9838,
    24px 18px 0px #fc9838,
    26px 18px 0px #d82800,
    28px 18px 0px #d82800,
    30px 18px 0px #d82800,
    32px 18px 0px #fc9838,
    2px 20px 0px #fc9838,
    4px 20px 0px #fc9838,
    6px 20px 0px #fc9838,
    8px 20px 0px #d82800,
    10px 20px 0px #d82800,
    12px 20px 0px #d82800,
    14px 20px 0px #fc9838,
    16px 20px 0px #fc9838,
    18px 20px 0px #fc9838,
    20px 20px 0px #fc9838,
    22px 20px 0px #fc9838,
    24px 20px 0px #fc9838,
    26px 20px 0px #fc9838,
    28px 20px 0px #d82800,
    30px 20px 0px #d82800,
    32px 20px 0px #fc9838,
    2px 22px 0px #fc9838,
    4px 22px 0px #fc9838,
    6px 22px 0px #fc9838,
    8px 22px 0px #fc9838,
    10px 22px 0px #fc9838,
    12px 22px 0px #fc9838,
    14px 22px 0px #fc9838,
    16px 22px 0px #fc9838,
    18px 22px 0px #fc9838,
    20px 22px 0px #fc9838,
    22px 22px 0px #fc9838,
    24px 22px 0px #fc9838,
    26px 22px 0px #fc9838,
    28px 22px 0px #fc9838,
    30px 22px 0px #fc9838,
    32px 22px 0px #fc9838,
    4px 24px 0px #fc9838,
    6px 24px 0px #d82800,
    8px 24px 0px #d82800,
    10px 24px 0px #d82800,
    12px 24px 0px #fff,
    14px 24px 0px #fff,
    16px 24px 0px #fff,
    18px 24px 0px #fff,
    20px 24px 0px #fff,
    22px 24px 0px #fff,
    24px 24px 0px #d82800,
    26px 24px 0px #d82800,
    28px 24px 0px #d82800,
    30px 24px 0px #fc9838,
    10px 26px 0px #fff,
    12px 26px 0px #fff,
    14px 26px 0px #fff,
    16px 26px 0px #fff,
    18px 26px 0px #fff,
    20px 26px 0px #fff,
    22px 26px 0px #fff,
    24px 26px 0px #fff,
    10px 28px 0px #fff,
    12px 28px 0px #fff,
    14px 28px 0px #fff,
    16px 28px 0px #fff,
    18px 28px 0px #fff,
    20px 28px 0px #fff,
    22px 28px 0px #fc9838,
    24px 28px 0px #fff,
    10px 30px 0px #fff,
    12px 30px 0px #fff,
    14px 30px 0px #fff,
    16px 30px 0px #fff,
    18px 30px 0px #fff,
    20px 30px 0px #fff,
    22px 30px 0px #fc9838,
    24px 30px 0px #fff,
    12px 32px 0px #fff,
    14px 32px 0px #fff,
    16px 32px 0px #fff,
    18px 32px 0px #fff,
    20px 32px 0px #fc9838,
    22px 32px 0px #fff;
  transform: translate(-0px, -0px);
  z-index: -1;
  opacity: 0;
}

.box {
  position: absolute;
  background-color: rgba(46, 37, 37, 0);
  z-index: 3;
  width: 34px;
  height: 34px;
}

.box:hover + .mush,
.mush.show {
  animation: mush 0.5s linear forwards;
  opacity: 1;
}

@keyframes mush {
  0% {
    transform: scale(0.8) translate(-0px, -0px);
  }
  50% {
    transform: scale(1.1) translate(-0px, -80px);
  }
  100% {
    transform: scale(1.1) translate(-0px, -35px);
  }
}

.tooltip-mario-container {
  height: 2px;
  width: 2px;
  box-shadow:
    4px 2px 0px #ce3100,
    6px 2px 0px #ce3100,
    8px 2px 0px #ce3100,
    10px 2px 0px #ce3100,
    12px 2px 0px #ce3100,
    14px 2px 0px #ce3100,
    16px 2px 0px #ce3100,
    18px 2px 0px #ce3100,
    20px 2px 0px #ce3100,
    22px 2px 0px #ce3100,
    24px 2px 0px #ce3100,
    26px 2px 0px #ce3100,
    28px 2px 0px #ce3100,
    2px 4px 0px #ce3100,
    4px 4px 0px #ff9c31,
    6px 4px 0px #ff9c31,
    8px 4px 0px #ff9c31,
    10px 4px 0px #ff9c31,
    12px 4px 0px #ff9c31,
    14px 4px 0px #ff9c31,
    16px 4px 0px #ff9c31,
    18px 4px 0px #ff9c31,
    20px 4px 0px #ff9c31,
    22px 4px 0px #ff9c31,
    24px 4px 0px #ff9c31,
    26px 4px 0px #ff9c31,
    28px 4px 0px #ff9c31,
    30px 4px 0px #ff9c31,
    32px 4px 0px #000,
    2px 6px 0px #ce3100,
    4px 6px 0px #ff9c31,
    6px 6px 0px #000,
    8px 6px 0px #ff9c31,
    10px 6px 0px #ff9c31,
    12px 6px 0px #ff9c31,
    14px 6px 0px #ff9c31,
    16px 6px 0px #ff9c31,
    18px 6px 0px #ff9c31,
    20px 6px 0px #ff9c31,
    22px 6px 0px #ff9c31,
    24px 6px 0px #ff9c31,
    26px 6px 0px #ff9c31,
    28px 6px 0px #000,
    30px 6px 0px #ff9c31,
    32px 6px 0px #000,
    2px 8px 0px #ce3100,
    4px 8px 0px #ff9c31,
    6px 8px 0px #ff9c31,
    8px 8px 0px #ff9c31,
    10px 8px 0px #ff9c31,
    12px 8px 0px #ce3100,
    14px 8px 0px #ce3100,
    16px 8px 0px #ce3100,
    18px 8px 0px #ce3100,
    20px 8px 0px #ce3100,
    22px 8px 0px #ff9c31,
    24px 8px 0px #ff9c31,
    26px 8px 0px #ff9c31,
    28px 8px 0px #ff9c31,
    30px 8px 0px #ff9c31,
    32px 8px 0px #000,
    2px 10px 0px #ce3100,
    4px 10px 0px #ff9c31,
    6px 10px 0px #ff9c31,
    8px 10px 0px #ff9c31,
    10px 10px 0px #ce3100,
    12px 10px 0px #ce3100,
    14px 10px 0px #000,
    16px 10px 0px #000,
    18px 10px 0px #000,
    20px 10px 0px #ce3100,
    22px 10px 0px #ce3100,
    24px 10px 0px #ff9c31,
    26px 10px 0px #ff9c31,
    28px 10px 0px #ff9c31,
    30px 10px 0px #ff9c31,
    32px 10px 0px #000,
    2px 12px 0px #ce3100,
    4px 12px 0px #ff9c31,
    6px 12px 0px #ff9c31,
    8px 12px 0px #ff9c31,
    10px 12px 0px #ce3100,
    12px 12px 0px #ce3100,
    14px 12px 0px #000,
    16px 12px 0px #ff9c31,
    18px 12px 0px #ff9c31,
    20px 12px 0px #ce3100,
    22px 12px 0px #ce3100,
    24px 12px 0px #000,
    26px 12px 0px #ff9c31,
    28px 12px 0px #ff9c31,
    30px 12px 0px #ff9c31,
    32px 12px 0px #000,
    2px 14px 0px #ce3100,
    4px 14px 0px #ff9c31,
    6px 14px 0px #ff9c31,
    8px 14px 0px #ff9c31,
    10px 14px 0px #ce3100,
    12px 14px 0px #ce3100,
    14px 14px 0px #000,
    16px 14px 0px #ff9c31,
    18px 14px 0px #ff9c31,
    20px 14px 0px #ce3100,
    22px 14px 0px #ce3100,
    24px 14px 0px #000,
    26px 14px 0px #ff9c31,
    28px 14px 0px #ff9c31,
    30px 14px 0px #ff9c31,
    32px 14px 0px #000,
    2px 16px 0px #ce3100,
    4px 16px 0px #ff9c31,
    6px 16px 0px #ff9c31,
    8px 16px 0px #ff9c31,
    10px 16px 0px #ff9c31,
    12px 16px 0px #000,
    14px 16px 0px #000,
    16px 16px 0px #ff9c31,
    18px 16px 0px #ce3100,
    20px 16px 0px #ce3100,
    22px 16px 0px #ce3100,
    24px 16px 0px #000,
    26px 16px 0px #ff9c31,
    28px 16px 0px #ff9c31,
    30px 16px 0px #ff9c31,
    32px 16px 0px #000,
    2px 18px 0px #ce3100,
    4px 18px 0px #ff9c31,
    6px 18px 0px #ff9c31,
    8px 18px 0px #ff9c31,
    10px 18px 0px #ff9c31,
    12px 18px 0px #ff9c31,
    14px 18px 0px #ff9c31,
    16px 18px 0px #ce3100,
    18px 18px 0px #ce3100,
    20px 18px 0px #000,
    22px 18px 0px #000,
    24px 18px 0px #000,
    26px 18px 0px #ff9c31,
    28px 18px 0px #ff9c31,
    30px 18px 0px #ff9c31,
    32px 18px 0px #000,
    2px 20px 0px #ce3100,
    4px 20px 0px #ff9c31,
    6px 20px 0px #ff9c31,
    8px 20px 0px #ff9c31,
    10px 20px 0px #ff9c31,
    12px 20px 0px #ff9c31,
    14px 20px 0px #ff9c31,
    16px 20px 0px #ce3100,
    18px 20px 0px #ce3100,
    20px 20px 0px #000,
    22px 20px 0px #ff9c31,
    24px 20px 0px #ff9c31,
    26px 20px 0px #ff9c31,
    28px 20px 0px #ff9c31,
    30px 20px 0px #ff9c31,
    32px 20px 0px #000,
    2px 22px 0px #ce3100,
    4px 22px 0px #ff9c31,
    6px 22px 0px #ff9c31,
    8px 22px 0px #ff9c31,
    10px 22px 0px #ff9c31,
    12px 22px 0px #ff9c31,
    14px 22px 0px #ff9c31,
    16px 22px 0px #ff9c31,
    18px 22px 0px #000,
    20px 22px 0px #000,
    22px 22px 0px #ff9c31,
    24px 22px 0px #ff9c31,
    26px 22px 0px #ff9c31,
    28px 22px 0px #ff9c31,
    30px 22px 0px #ff9c31,
    32px 22px 0px #000,
    2px 24px 0px #ce3100,
    4px 24px 0px #ff9c31,
    6px 24px 0px #ff9c31,
    8px 24px 0px #ff9c31,
    10px 24px 0px #ff9c31,
    12px 24px 0px #ff9c31,
    14px 24px 0px #ff9c31,
    16px 24px 0px #ce3100,
    18px 24px 0px #ce3100,
    20px 24px 0px #ff9c31,
    22px 24px 0px #ff9c31,
    24px 24px 0px #ff9c31,
    26px 24px 0px #ff9c31,
    28px 24px 0px #ff9c31,
    30px 24px 0px #ff9c31,
    32px 24px 0px #000,
    2px 26px 0px #ce3100,
    4px 26px 0px #ff9c31,
    6px 26px 0px #ff9c31,
    8px 26px 0px #ff9c31,
    10px 26px 0px #ff9c31,
    12px 26px 0px #ff9c31,
    14px 26px 0px #ff9c31,
    16px 26px 0px #ce3100,
    18px 26px 0px #ce3100,
    20px 26px 0px #000,
    22px 26px 0px #ff9c31,
    24px 26px 0px #ff9c31,
    26px 26px 0px #ff9c31,
    28px 26px 0px #ff9c31,
    30px 26px 0px #ff9c31,
    32px 26px 0px #000,
    2px 28px 0px #ce3100,
    4px 28px 0px #ff9c31,
    6px 28px 0px #000,
    8px 28px 0px #ff9c31,
    10px 28px 0px #ff9c31,
    12px 28px 0px #ff9c31,
    14px 28px 0px #ff9c31,
    16px 28px 0px #ff9c31,
    18px 28px 0px #000,
    20px 28px 0px #000,
    22px 28px 0px #ff9c31,
    24px 28px 0px #ff9c31,
    26px 28px 0px #ff9c31,
    28px 28px 0px #000,
    30px 28px 0px #ff9c31,
    32px 28px 0px #000,
    2px 30px 0px #ce3100,
    4px 30px 0px #ff9c31,
    6px 30px 0px #ff9c31,
    8px 30px 0px #ff9c31,
    10px 30px 0px #ff9c31,
    12px 30px 0px #ff9c31,
    14px 30px 0px #ff9c31,
    16px 30px 0px #ff9c31,
    18px 30px 0px #ff9c31,
    20px 30px 0px #ff9c31,
    22px 30px 0px #ff9c31,
    24px 30px 0px #ff9c31,
    26px 30px 0px #ff9c31,
    28px 30px 0px #ff9c31,
    30px 30px 0px #ff9c31,
    32px 30px 0px #000,
    2px 32px 0px #000,
    4px 32px 0px #000,
    6px 32px 0px #000,
    8px 32px 0px #000,
    10px 32px 0px #000,
    12px 32px 0px #000,
    14px 32px 0px #000,
    16px 32px 0px #000,
    18px 32px 0px #000,
    20px 32px 0px #000,
    22px 32px 0px #000,
    24px 32px 0px #000,
    26px 32px 0px #000,
    28px 32px 0px #000,
    30px 32px 0px #000,
    32px 32px 0px #000;
  position: absolute;
  z-index: 3;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
