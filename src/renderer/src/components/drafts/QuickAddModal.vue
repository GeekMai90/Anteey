<template>
  <div v-if="isVisible" class="quick-add-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>快速添加</h2>
        <button class="close-btn">
          <div class="icon">
            <Close theme="outline" size="16" :strokeWidth="3" @click="close" />
          </div>
        </button>
      </div>

      <div class="input-area">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="input-textarea"
          placeholder="在这里输入内容，每行将作为一个段落..."
          @keydown.ctrl.enter="handleSave"
          @keydown.meta.enter="handleSave"
          @input="autoResize"
        />
      </div>

      <div class="modal-footer">
        <div class="hint">提示：按下 {{ isMac ? '⌘' : 'Ctrl' }}+Enter 快速保存</div>
        <button class="save-btn" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { Close } from '@icon-park/vue-next'
import { useDraftsStore } from '@renderer/stores/draftsStore'

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits(['close'])
const draftsStore = useDraftsStore()
const content = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 检测是否是 Mac 系统
const isMac = computed(() => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0
})

// 自动调整高度
const autoResize = () => {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto' // 重置高度
    textarea.style.height = `${textarea.scrollHeight}px` // 设置新高度
  }
}

// 保存内容
const handleSave = async () => {
  const lines = content.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  if (lines.length > 0) {
    try {
      // 确保草稿纸存在
      if (!draftsStore.currentDraft) {
        await draftsStore.createDraft()
      }

      // 逐行追加内容
      for (let i = 0; i < lines.length; i++) {
        await draftsStore.appendDraft({
          content: lines[i],
          hasMoreLines: i < lines.length - 1
        })
      }
      console.log('Content saved to draft:', lines)

      // 关闭窗口
      close()
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }
}

// 关闭模态框
const close = () => {
  content.value = ''
  emit('close')
}

// 监听可见性变化
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue) {
      setTimeout(() => {
        const textarea = textareaRef.value
        if (textarea) {
          textarea.focus()
          textarea.style.height = 'auto' // 重置高度
        }
      }, 0)
    }
  }
)

// 监听内容变化
watch(content, () => {
  nextTick(() => {
    autoResize()
  })
})
</script>

<style lang="scss" scoped>
.quick-add-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 100px;
  z-index: 9999;

  .modal-content {
    background-color: var(--color-bg-primary);
    border-radius: 10px;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);

      h2 {
        margin: 0;
        font-size: 18px;
        color: var(--color-text);
      }

      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: var(--color-text);

        &:hover {
          background-color: var(--color-hover-button);
        }

        .icon {
          background: none;
          border: none;
          cursor: pointer;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
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
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .input-area {
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;

      .input-textarea {
        width: 100%;
        min-height: 42px; // 设置为单行高度
        max-height: 300px; // 设置最大高度
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        font-size: 14px;
        background-color: var(--color-bg-secondary);
        color: var(--color-text);
        resize: none; // 禁用手动调整大小
        line-height: 1.6;
        overflow-y: hidden; // 隐藏滚动条
        transition: height 0.1s ease;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
        }

        &::placeholder {
          color: var(--color-text-placeholder);
        }
      }
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;

      .hint {
        color: var(--color-text-secondary);
        font-size: 12px;
      }

      .save-btn {
        padding: 8px 16px;
        background-color: var(--color-primary);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;

        &:hover {
          background-color: var(--color-primary-dark);
        }
      }
    }
  }
}
</style>
