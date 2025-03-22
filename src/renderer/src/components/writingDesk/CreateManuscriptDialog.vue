<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="dialogVisible" class="dialog-overlay" @click="handleClose">
        <div class="dialog-container" @click.stop>
          <div class="dialog-content">
            <div class="dialog-title">新建文稿</div>
            <div class="dialog-body">
              <div class="form-item">
                <label class="label">文稿标题</label>
                <input
                  ref="titleInput"
                  v-model="title"
                  class="input"
                  type="text"
                  placeholder="请输入文稿标题"
                  @keyup.enter="handleCreate"
                />
              </div>
            </div>
            <div class="dialog-buttons">
              <button class="cancel-button" @click="handleClose">取消</button>
              <button
                class="confirm-button"
                :disabled="!title.trim() || creating"
                @click="handleCreate"
              >
                {{ creating ? '创建中...' : '创建' }}
              </button>
            </div>
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
  'update:visible': [value: boolean]
  create: [title: string]
}>()

const dialogVisible = ref(props.visible)
const title = ref('')
const creating = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
    if (newVal) {
      title.value = ''
      nextTick(() => {
        titleInput.value?.focus()
      })
    }
  }
)

watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal)
})

const handleClose = () => {
  dialogVisible.value = false
}

const handleCreate = async () => {
  if (!title.value.trim() || creating.value) return

  try {
    creating.value = true
    emit('create', title.value.trim())
    handleClose()
  } finally {
    creating.value = false
  }
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
  z-index: 9999;
}

.dialog-container {
  background: var(--color-bg-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  width: 400px;
  padding: 24px;
  transform-origin: center;
}

.dialog-content {
  display: flex;
  flex-direction: column;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 20px;
}

.dialog-body {
  margin-bottom: 24px;

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
      font-size: 14px;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .input {
      width: 100%;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 14px;
      color: var(--color-text-primary);
      background: var(--color-bg-primary);
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-shadow);
      }

      &::placeholder {
        color: var(--color-text-placeholder);
      }
    }
  }
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  button {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &.cancel-button {
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-bg-secondary);
        opacity: 0.8;
      }
    }

    &.confirm-button {
      background: var(--color-primary);
      color: var(--color-text-white);

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

// 动画
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;

  .dialog-container {
    transition: transform 0.2s ease;
  }
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;

  .dialog-container {
    transform: scale(0.95);
  }
}

.dialog-fade-enter-to,
.dialog-fade-leave-from {
  opacity: 1;

  .dialog-container {
    transform: scale(1);
  }
}
</style>
