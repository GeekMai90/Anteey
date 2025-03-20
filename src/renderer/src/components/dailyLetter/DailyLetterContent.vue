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
            <p>
              在知识的海洋中，每一个想法都像是一颗珍珠，需要时间来沉淀和打磨。让我们一起在卡片笔记的世界里，发现更多智慧的火花。今天想和你分享一些思考，关于如何更好地构建自己的知识体系。通过细致的观察和持续的积累，我们能够在知识的海洋中找到属于自己的那份珍贵发现。
            </p>

            <p>
              卢曼的卡片盒笔记法告诉我们，知识不是简单的累积，而是需要不断地连接和重组。当我们将每一个想法都认真记录下来，并试图找出它们之间的联系时，我们就在构建一个属于自己的知识网络。这个网络越密集，我们的思维就越丰富，创造力就越强大。
            </p>

            <p>
              让我们一起探索这种深度思考的方式。在写下每一张卡片的时候，不妨多问问自己：这个想法和我已有的认知有什么联系？它能带给我什么新的启发？通过这样的对话，我们不仅在积累知识，更是在培养一种思考的习惯。
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

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'after-show'])

// 获取当前日期
const currentDate = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

// 更新值
const updateValue = (value: boolean) => {
  emit('update:modelValue', value)
}

// 模态窗完全展示后的回调
const handleAfterEnter = () => {
  emit('after-show')
}

// 关闭信件
const handleClose = () => {
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
.daily-letter-content {
  width: 600px;
  max-height: 1000px;
  background: var(--color-bg-primary);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;

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
    padding: 40px 48px;
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
        margin-bottom: 24px;
        color: var(--color-text-primary);
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding-right: 16px;
        margin-bottom: 0;

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

        p {
          margin: 0;
          margin-bottom: 24px;
          text-align: justify;
          color: var(--color-text-primary);

          &:last-child {
            margin-bottom: 0;
          }
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

// 添加进入动画
.modal-enter-active {
  .daily-letter-content {
    animation: letter-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

@keyframes letter-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
