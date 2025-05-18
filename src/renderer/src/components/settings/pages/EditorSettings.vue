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
              <HelpTips content="开启后，编辑器将检查拼写错误并显示下划线" />
            </div>
            <div class="value">
              <Switch
                :model-value="enableSpellcheck"
                @update:model-value="enableSpellcheck = $event"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>字体大小</span>
              <HelpTips content="设置编辑器的字体大小，影响笔记内容的显示" />
            </div>
            <div class="value">
              <NumberInput v-model="fontSize" :min="12" :max="24" />
              <span class="input-suffix">px</span>
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
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              字数限制
              <HelpTips content="设置编辑器的字数限制，超过此限制将显示警告提示。" />
            </div>
            <div class="value">
              <NumberInput v-model="characterLimit" :min="100" :max="10000" />
              <span class="input-suffix">字</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              限制输入
              <HelpTips
                content="开启后，超过字数限制将无法继续输入；关闭后，超过字数限制仍可继续输入，但会显示警告。"
              />
            </div>
            <div class="value">
              <Switch :model-value="enforceLimit" @update:model-value="enforceLimit = $event" />
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
            <div class="label">
              {{ enableMarioStyle ? '使用趣味按钮样式' : '使用默认按钮样式' }}
            </div>
            <div class="value">
              <Switch
                :model-value="enableMarioStyle"
                @update:model-value="handleMarioStyleChange"
              />
            </div>
          </div>
          <div class="form-item">
            <div class="label">{{ enableMarioSound ? '播放按钮音效' : '静音按钮' }}</div>
            <div class="value">
              <Switch
                :model-value="enableMarioSound"
                @update:model-value="handleMarioSoundChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Edit } from '@icon-park/vue-next'
import { useUIStore } from '@renderer/stores/UIStore'
import { debounce } from 'lodash-es'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import { useReviewStore } from '@renderer/stores/reviewStore'
import NumberInput from '@renderer/components/ui/NumberInput.vue'
import HelpTips from '@renderer/components/ui/HelpTips.vue'
const uiStore = useUIStore()
const reviewStore = useReviewStore()

// 加载状态
const isLoading = ref(true)

// 编辑器设置
const characterLimit = ref(500)
const showCharacterCount = ref(true)
const enforceLimit = ref(false)
const enableSpellcheck = ref(false)
const fontSize = ref(16)

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
    fontSize.value = uiStore.editorSettings.fontSize || 16

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
    fontSize: number
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
  [characterLimit, showCharacterCount, enforceLimit, enableSpellcheck, fontSize],
  async ([limit, showCount, enforce, spellcheck, size]) => {
    const settings = {
      characterLimit: limit,
      showCharacterCount: showCount,
      enforceLimit: enforce,
      enableSpellcheck: spellcheck,
      fontSize: size
    }
    debouncedUpdateSettings(settings)
  },
  { deep: true }
)

// 组件卸载时取消未执行的防抖函数
onUnmounted(() => {
  debouncedUpdateSettings.cancel()
})

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
  padding: 0 20px;

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
  padding: 0 20px;
  overflow-y: auto;

  .settings-item {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 24px;
    padding: 0 10px;
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
      user-select: none;
    }

    .settings-form {
      width: 100%;
      margin-top: 15px;

      .form-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

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
        }

        .value {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: flex-end;

          .input-suffix {
            font-size: 14px;
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
