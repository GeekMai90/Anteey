<template>
  <div class="editor-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Edit theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">编辑器</div>
    </div>
    <div class="editor-settings-divider"></div>
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div v-else class="editor-settings-content">
      <!-- 基本设置 -->
      <div class="settings-item">
        <div class="title">基本设置</div>
        <div class="description">设置编辑器的基本参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">
              <span>启用拼写检查</span>
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />
                <div class="help-tooltip">开启后，编辑器将检查拼写错误并显示下划线</div>
              </div>
            </div>
            <div class="value">
              <Switch
                :model-value="enableSpellcheck"
                @update:model-value="enableSpellcheck = $event"
              />
              <div class="switch-description">
                {{ enableSpellcheck ? '启用拼写检查' : '禁用拼写检查' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-item">
        <div class="title">字数统计</div>
        <div class="description">设置字数统计功能的相关参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">显示字数统计</div>
            <div class="value">
              <Switch
                :model-value="showCharacterCount"
                @update:model-value="showCharacterCount = $event"
              />
              <div class="switch-description">
                {{ showCharacterCount ? '显示字数统计' : '隐藏字数统计' }}
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              字数限制
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />
                <div class="help-tooltip">设置编辑器的字数限制，超过此限制将显示警告提示。</div>
              </div>
            </div>
            <div class="value">
              <div class="number-input-wrapper">
                <button
                  class="number-button decrease"
                  @click="characterLimit = handleNumberChange(-100, 100, 10000, characterLimit)"
                >
                  <Minus theme="outline" size="14" :strokeWidth="3" />
                </button>
                <input
                  v-model="characterLimit"
                  type="number"
                  min="100"
                  max="10000"
                  @change="characterLimit = handleInputChange(100, 10000, characterLimit)"
                />
                <button
                  class="number-button increase"
                  @click="characterLimit = handleNumberChange(100, 100, 10000, characterLimit)"
                >
                  <Plus theme="outline" size="14" :strokeWidth="3" />
                </button>
              </div>
              <span class="input-suffix">字</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              限制输入
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />
                <div class="help-tooltip">
                  开启后，超过字数限制将无法继续输入；关闭后，超过字数限制仍可继续输入，但会显示警告。
                </div>
              </div>
            </div>
            <div class="value">
              <Switch :model-value="enforceLimit" @update:model-value="enforceLimit = $event" />
              <div class="switch-description">
                {{ enforceLimit ? '超过限制禁止输入' : '超过限制仍可输入' }}
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>启用拼写检查</span>
              <div class="help-icon-wrapper">
                <Help theme="outline" size="14" :strokeWidth="3" class="help-icon" />
                <div class="help-tooltip">开启后，编辑器将检查拼写错误并显示下划线</div>
              </div>
            </div>
            <div class="value">
              <Switch
                :model-value="enableSpellcheck"
                @update:model-value="enableSpellcheck = $event"
              />
              <div class="switch-description">
                {{ enableSpellcheck ? '启用拼写检查' : '禁用拼写检查' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 随机回顾设置 -->
      <div class="settings-item">
        <div class="title">随机回顾</div>
        <div class="description">设置随机回顾功能的相关参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">启用趣味按钮</div>
            <div class="value">
              <Switch
                :model-value="enableMarioStyle"
                @update:model-value="handleMarioStyleChange"
              />
              <div class="switch-description">
                {{ enableMarioStyle ? '使用趣味按钮样式' : '使用默认按钮样式' }}
              </div>
            </div>
          </div>
          <div class="form-item">
            <div class="label">启用按钮音效</div>
            <div class="value">
              <Switch
                :model-value="enableMarioSound"
                @update:model-value="handleMarioSoundChange"
              />
              <div class="switch-description">
                {{ enableMarioSound ? '播放按钮音效' : '静音按钮' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Edit, Help, Plus, Minus } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/UIStore'
import { debounce } from 'lodash-es'
import Switch from '@renderer/components/ui/Switch.vue'
import { useReviewStore } from '@renderer/stores/reviewStore'

const uiStore = useUIStore()
const reviewStore = useReviewStore()

// 加载状态
const isLoading = ref(true)

// 编辑器设置
const characterLimit = ref(500)
const showCharacterCount = ref(true)
const enforceLimit = ref(false)
const enableSpellcheck = ref(false)

// 随机回顾设置
const enableMarioStyle = ref(false)
const enableMarioSound = ref(false)

// 初始化设置
onMounted(async () => {
  try {
    isLoading.value = true

    // 从 UIStore 获取设置
    characterLimit.value = uiStore.editorSettings.characterLimit
    // 确保字数限制不小于100
    if (characterLimit.value < 100) {
      characterLimit.value = 500
    }
    showCharacterCount.value = uiStore.editorSettings.showCharacterCount
    enforceLimit.value = uiStore.editorSettings.enforceLimit || false
    enableSpellcheck.value = uiStore.editorSettings.enableSpellcheck || false

    // 从 ReviewStore 获取设置
    enableMarioStyle.value = reviewStore.enableMarioStyle
    enableMarioSound.value = reviewStore.enableMarioSound
  } catch (error) {
    console.error('加载设置失败:', error)
  } finally {
    isLoading.value = false
  }
})

// 使用防抖包装更新设置的函数
const debouncedUpdateSettings = debounce(
  async (settings: {
    characterLimit: number
    showCharacterCount: boolean
    enforceLimit: boolean
    enableSpellcheck: boolean
  }) => {
    try {
      // 保持其他设置不变
      const updatedSettings = {
        ...uiStore.editorSettings,
        ...settings
      }
      uiStore.updateEditorSettings(updatedSettings)
    } catch (error) {
      console.error('更新设置失败:', error)
    }
  },
  500
)

// 监听设置变化并保存
watch(
  [characterLimit, showCharacterCount, enforceLimit, enableSpellcheck],
  async ([limit, showCount, enforce, spellcheck]) => {
    const settings = {
      characterLimit: limit,
      showCharacterCount: showCount,
      enforceLimit: enforce,
      enableSpellcheck: spellcheck
    }
    debouncedUpdateSettings(settings)
  },
  { deep: true }
)

// 组件卸载时取消未执行的防抖函数
onUnmounted(() => {
  debouncedUpdateSettings.cancel()
})

// 处理数字变化
const handleNumberChange = (delta: number, min: number, max: number, value: number) => {
  const newValue = value + delta
  if (newValue >= min && newValue <= max) {
    return newValue
  }
  return value
}

// 处理输入变化
const handleInputChange = (min: number, max: number, value: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

// 处理随机回顾设置变化
const handleMarioStyleChange = (value: boolean) => {
  reviewStore.updateMarioStyleEnabled(value)
  enableMarioStyle.value = value
}

const handleMarioSoundChange = (value: boolean) => {
  reviewStore.updateMarioSoundEnabled(value)
  enableMarioSound.value = value
}
</script>

<style scoped lang="scss">
.editor-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.settings-content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;

  .icon {
    background: none;
    border: 1px solid var(--color-border);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 4px;
    border-radius: 6px;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .name {
    font-size: 20px;
    line-height: 1;
    font-weight: 500;
    user-select: none;
  }
}

.editor-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.editor-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 58px;
  overflow-y: auto;

  .settings-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 24px;

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 10px;
    }

    .description {
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }

    .settings-form {
      width: 100%;
      margin-top: 15px;

      .form-item {
        display: flex;
        align-items: center;
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          width: 160px;
          font-size: 14px;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;

          .help-icon-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            margin-left: 2px;
            justify-content: center;

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

            .help-icon {
              cursor: help;
              color: var(--color-text-secondary);
              opacity: 0.6;
              transition: opacity 0.2s ease;

              &:hover {
                opacity: 1;
                & + .help-tooltip {
                  opacity: 1;
                  visibility: visible;
                  transform: translateY(0);
                }
              }
            }

            .help-tooltip {
              position: absolute;
              left: 24px;
              top: -8px;
              width: 280px;
              padding: 12px 16px;
              background: var(--color-bg-primary);
              border: 1px solid var(--color-border);
              border-radius: 6px;
              font-size: 13px;
              color: var(--color-text-secondary);
              line-height: 1.6;
              opacity: 0;
              visibility: hidden;
              transform: translateY(-4px);
              transition: all 0.2s ease;
              z-index: 100;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              pointer-events: none;
              white-space: normal;
            }
          }
        }

        .value {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;

          .number-input-wrapper {
            display: flex;
            align-items: center;
            border: 1px solid var(--color-border);
            border-radius: 6px;
            background: var(--color-bg-secondary);
            transition: all 0.2s ease;

            &:hover {
              border-color: var(--color-primary);
            }

            &:focus-within {
              border-color: var(--color-primary);
            }

            input[type='number'] {
              width: 60px;
              height: 32px;
              border: none;
              text-align: center;
              padding: 0;
              color: var(--color-text-primary);
              font-size: 14px;
              background: transparent;
              outline: none;

              &::-webkit-inner-spin-button,
              &::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
            }

            .number-button {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              cursor: pointer;
              color: var(--color-text-secondary);
              transition: all 0.2s ease;

              &:hover {
                color: var(--color-primary);
                background: var(--color-fill-secondary);
              }

              &.decrease {
                border-right: 1px solid var(--color-border);
              }

              &.increase {
                border-left: 1px solid var(--color-border);
              }
            }
          }

          .input-suffix {
            font-size: 14px;
            color: var(--color-text-secondary);
          }

          .switch-description {
            font-size: 12px;
            color: var(--color-text-secondary);
          }
        }
      }
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
