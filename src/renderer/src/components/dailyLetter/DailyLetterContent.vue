<template>
  <Modal
    :model-value="modelValue"
    @update:model-value="updateValue"
    @after-enter="handleAfterEnter"
  >
    <div class="daily-letter-content">
      <!-- 标题区 -->
      <div class="title-section">
        <div class="header-bg"></div>
        <h2 class="title">每日来信</h2>
        <div class="icon-wrapper">
          <MailOpen class="mail-icon" theme="filled" />
        </div>
      </div>

      <!-- 信息区 -->
      <div class="info-section">
        <div class="info-item">
          <span class="label">💌 来信时间：</span>
          <span class="value">{{ currentDate }}</span>
        </div>
        <div class="info-item">
          <span class="label">✍🏻 写信人：</span>
          <span class="value">安安</span>
        </div>
      </div>

      <!-- 信件内容 -->
      <div class="letter-body">
        <div class="letter-text">
          <div class="salutation">亲爱的：</div>

          <div class="main-content">
            <p v-for="(paragraph, index) in letterParagraphs" :key="index">
              {{ paragraph }}
            </p>
          </div>

          <div class="signature">
            <div class="signature-text">爱你的，安安 🥰</div>
          </div>
        </div>
      </div>

      <!-- 信件底部 -->
      <div class="letter-footer">
        <div class="actions">
          <SpreadButton type="default" @click="handleClose">收下</SpreadButton>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@renderer/components/common/Modal.vue'
import SpreadButton from '@renderer/components/ui/SpreadButton.vue'
import { MailOpen } from '@icon-park/vue-next'
import { computed } from 'vue'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'after-show'])
const dailyLetterStore = useDailyLetterStore()

// 获取当前日期
const currentDate = computed(() => {
  if (!dailyLetterStore.currentLetter) return ''
  const date = new Date(dailyLetterStore.currentLetter.createTime)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

// 信件内容处理成段落
const letterParagraphs = computed(() => {
  const content = dailyLetterStore.currentLetter?.content || ''
  // 将内容按照换行符分割成段落，并过滤掉空段落
  return content
    .split('\\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
})

// 更新值
const updateValue = (value: boolean) => {
  emit('update:modelValue', value)
  if (!value) {
    dailyLetterStore.closeLetterModal()
  }
}

// 模态窗完全展示后的回调
const handleAfterEnter = () => {
  // 标记信件为已读
  if (dailyLetterStore.currentLetter) {
    dailyLetterStore.updateLetterReadStatus(dailyLetterStore.currentLetter.id, true)
  }
  emit('after-show')
}

// 关闭信件
const handleClose = () => {
  emit('update:modelValue', false)
  dailyLetterStore.closeLetterModal()
}
</script>

<style lang="scss" scoped>
.daily-letter-content {
  width: 600px;
  max-height: 900px;
  background: var(--color-bg-primary);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-origin: center center;
  animation: letter-enter 0.6s cubic-bezier(0.33, 1, 0.68, 1);

  .title-section {
    flex-shrink: 0;
    position: relative;
    padding: 24px 32px;
    background: var(--color-primary);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
      z-index: 0;
    }

    .title {
      position: relative;
      z-index: 1;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 1px;
      margin: 0;
    }

    .icon-wrapper {
      position: relative;
      z-index: 1;
      .mail-icon {
        color: white;
        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 28px;
          height: 28px;
        }
      }
    }
  }

  .info-section {
    flex-shrink: 0;
    padding: 20px 32px;
    background: var(--color-bg-primary);
    border-bottom: 2px dashed var(--color-border);

    .info-item {
      margin-bottom: 8px;
      font-size: 15px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: var(--color-text-secondary);
        margin-right: 8px;
        font-weight: normal;
      }

      .value {
        font-weight: 500;
        color: var(--color-text-primary);
      }
    }
  }

  .letter-body {
    flex: 1;
    min-height: 0;
    padding: 20px 48px 40px 48px;
    background: var(--color-bg-primary);
    display: flex;

    .letter-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      font-size: 16px;
      line-height: 2;
      color: var(--color-text-primary);

      .salutation {
        flex-shrink: 0;
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 10px;
        color: var(--color-text-primary);
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding-right: 16px;
        margin-bottom: 0;

        p {
          margin: 0;
          margin-bottom: 24px;
          text-align: justify;
          color: var(--color-text-primary);
          white-space: pre-line;

          &:last-child {
            margin-bottom: 0;
          }
        }

        /* 自定义滚动条样式 */
        &::-webkit-scrollbar {
          width: 6px;
        }

        &::-webkit-scrollbar-track {
          background: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background-color: var(--color-border);
          border-radius: 3px;
        }
      }

      .signature {
        flex-shrink: 0;
        text-align: right;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);

        .signature-text {
          font-size: 16px;
          color: var(--color-text-secondary);
        }
      }
    }
  }

  .letter-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    padding: 20px;
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);

    .actions {
      display: flex;
      gap: 16px;
    }
  }
}

@keyframes letter-enter {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  60% {
    opacity: 1;
    transform: scale(1.02) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

// 退出动画
.modal-leave-active {
  animation: letter-leave 0.4s cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes letter-leave {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
}
</style>
