<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click="handleOverlayClick">
        <div class="dialog-container" @click.stop>
          <div class="dialog-content">
            <div class="dialog-title">{{ title }}</div>
            <div class="dialog-body">
              <div class="input-row">
                <!-- 图标选择器 -->
                <div v-if="showIconPicker" class="icon-input">
                  <div class="selected-icon" @click="isPickerVisible = !isPickerVisible">
                    <template v-if="selectedIcon">
                      <component
                        :is="getIconComponent(selectedIcon)"
                        v-if="selectedIcon"
                        theme="outline"
                        size="20"
                        :fill="'var(--color-text-secondary)'"
                        :stroke-width="3"
                      />
                    </template>
                    <span v-else class="placeholder">#</span>
                  </div>

                  <!-- 图标选择器弹出层 -->
                  <div v-if="isPickerVisible" ref="iconPickerRef" class="icon-picker-popup">
                    <IconPicker
                      v-model="selectedIcon"
                      @update:modelValue="isPickerVisible = false"
                    />
                  </div>
                </div>

                <!-- 输入框 -->
                <input
                  ref="inputRef"
                  v-model="inputValue"
                  :placeholder="placeholder"
                  @keyup.enter="handleConfirm"
                  @keyup.esc="handleCancel"
                />
              </div>
            </div>
            <div class="dialog-buttons">
              <button class="cancel-button" @click="handleCancel">{{ cancelText }}</button>
              <button class="confirm-button" :disabled="!inputValue.trim()" @click="handleConfirm">
                {{ confirmText }}
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
import IconPicker from './IconPicker.vue'
import * as IconPark from '@icon-park/vue-next'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  visible: boolean
  title: string
  placeholder?: string
  initialValue?: string
  initialIcon?: string
  showIconPicker?: boolean
  cancelText?: string
  confirmText?: string
}>()

interface DialogResult {
  name: string
  icon?: string
}

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', value: DialogResult): void // 修改这里的类型
  (e: 'cancel'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref(props.initialValue || '')

// 监听visible变化，当显示时自动聚焦并选中文本
watch(
  () => props.visible,
  async (newValue) => {
    if (newValue) {
      inputValue.value = props.initialValue || ''
      await nextTick()
      inputRef.value?.focus()
      inputRef.value?.select()
    }
  }
)

const handleOverlayClick = () => {
  emit('update:visible', false)
  emit('cancel')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:visible', false)
}

const selectedIcon = ref(props.initialIcon || '')
const iconPickerRef = ref<HTMLElement | null>(null)
const isPickerVisible = ref(false)

// 点击图标选择器外部时关闭
onClickOutside(iconPickerRef, () => {
  isPickerVisible.value = false
})

const getIconComponent = (iconName: string) => {
  // 确保组件存在
  const IconComponent = IconPark[iconName as keyof typeof IconPark]
  return IconComponent || null
}

const handleConfirm = () => {
  if (inputValue.value.trim()) {
    emit('confirm', {
      name: inputValue.value.trim(),
      icon: selectedIcon.value
    })
    emit('update:visible', false)
  }
}
</script>

<style scoped lang="scss">
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
  width: 320px;
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
  margin-bottom: 16px;
  text-align: center;
}

.dialog-body {
  margin-bottom: 24px;

  .input-row {
    display: flex;
    align-items: stretch; // 改为 stretch 让子元素高度一致
    gap: 8px;

    .icon-input {
      position: relative;

      .selected-icon {
        width: 36px;
        height: 36px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: var(--color-bg-secondary);
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

        &:hover {
          background: var(--color-hover-bg);
        }

        .placeholder {
          font-size: 16px;
          color: var(--color-text-tertiary);
        }
      }

      .icon-picker-popup {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg-primary);
      }
    }

    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 14px;
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
      transition: all 0.2s ease;
      height: 36px; // 使用 min-height 而不是 height

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-light);
      }

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }
  }
}

.dialog-buttons {
  display: flex;
  gap: 12px;

  button {
    flex: 1;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &.cancel-button {
      background: var(--color-button-bg);
      color: var(--color-text-secondary);

      &:hover {
        background: var(--color-hover-bg);
      }
    }

    &.confirm-button {
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
.icon-input {
  position: relative;
  margin-bottom: 12px;

  .selected-icon {
    width: 36px;
    height: 36px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background: var(--color-hover-bg);
    }

    .placeholder {
      font-size: 12px;
      color: var(--color-text-tertiary);
    }
  }

  .icon-picker-popup {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 8px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-primary);
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
</style>
