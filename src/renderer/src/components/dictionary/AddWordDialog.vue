<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click="handleClose">
        <div class="dialog-container" @click.stop>
          <div class="dialog-header">
            <h3>添加新词</h3>
          </div>
          <div class="dialog-body">
            <div class="form-item">
              <input
                ref="inputRef"
                v-model="word"
                type="text"
                placeholder="请输入词条"
                @keyup.enter="handleSubmit"
              />
              <p v-if="error" class="error-message">{{ error }}</p>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="cancel-button" @click="handleClose">取消</button>
            <button class="submit-button" :disabled="!word.trim()" @click="handleSubmit">
              确认添加
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', word: string): void
}>()

const word = ref('')
const error = ref('')
const inputRef = ref<HTMLInputElement>()

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      word.value = ''
      error.value = ''
      await nextTick()
      inputRef.value?.focus()
    }
  }
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = () => {
  const trimmedWord = word.value.trim()
  if (!trimmedWord) {
    error.value = '请输入词条'
    return
  }

  emit('submit', trimmedWord)
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  width: 400px;
  overflow: hidden;

  .dialog-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .dialog-body {
    padding: 24px;

    .form-item {
      input {
        width: 100%;
        padding: 10px 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        font-size: 14px;
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
        }
      }

      .error-message {
        margin: 8px 0 0;
        font-size: 12px;
        color: var(--color-danger);
      }
    }
  }

  .dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;

    button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;

      &.cancel-button {
        border: 1px solid var(--color-border);
        background: var(--color-bg-primary);
        color: var(--color-text-primary);

        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      }

      &.submit-button {
        border: none;
        background: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          opacity: 0.9;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
}
</style>
