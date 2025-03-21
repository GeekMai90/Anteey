<template>
  <div class="ai-assistant-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Robot theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">AI 助手设置</div>
    </div>
    <div class="settings-content-divider"></div>

    <div class="ai-settings-content">
      <!-- 提示词设置区域 -->
      <div class="ai-section">
        <div class="section-header">
          <div class="section-title">聊一聊模式提示词</div>
          <Button type="default" :icon="Setting" size="medium" @click="showPromptSettings">
            设置提示词
          </Button>
        </div>
        <div class="section-desc">
          设置与 AI 助手聊天时的系统提示词，这将影响 AI 助手的角色定位和行为方式。
        </div>
      </div>
    </div>

    <!-- 提示词配置模态框 -->
    <div v-if="showPromptModal" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>聊一聊模式提示词设置</h3>
          <button class="close-btn" @click="closePromptModal">
            <Close theme="outline" size="16" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>系统提示词</label>
            <textarea
              v-model="systemPrompt"
              rows="6"
              placeholder="请输入系统提示词，用于定义 AI 助手的角色和行为"
            ></textarea>
            <div class="form-help">
              <Button size="small" @click="resetToDefault">重置为默认提示词</Button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-left"></div>
          <div class="footer-right">
            <Button size="medium" @click="closePromptModal">取消</Button>
            <Button
              type="primary"
              size="medium"
              :disabled="!systemPrompt"
              @click="handlePromptSubmit"
            >
              确认
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Robot, Setting, Close } from '@icon-park/vue-next'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import type { SystemPromptConfig } from '@shared/types'
import { message } from '@renderer/utils/message'
import Button from '@renderer/components/ui/Button.vue'

const modelConfigStore = useModelConfigStore()
const showPromptModal = ref(false)
const promptFormData = ref<SystemPromptConfig | null>(null)

const systemPrompt = computed({
  get: () => promptFormData.value?.systemPrompt ?? '',
  set: (value: string) => {
    if (promptFormData.value) {
      promptFormData.value.systemPrompt = value
    }
  }
})

onMounted(() => {
  initPromptConfig()
})

// 初始化时加载提示词配置
const initPromptConfig = async () => {
  try {
    await modelConfigStore.loadSystemPrompt()
    if (modelConfigStore.systemPrompt) {
      promptFormData.value = modelConfigStore.systemPrompt
    } else {
      console.warn('未找到提示词配置')
    }
  } catch (error) {
    console.error('初始化提示词配置失败:', error)
    message.error('加载提示词配置失败')
  }
}

// 关闭提示词配置模态框
const closePromptModal = () => {
  showPromptModal.value = false
  promptFormData.value = modelConfigStore.systemPrompt
}

// 重置为默认提示词
const resetToDefault = async () => {
  try {
    await modelConfigStore.resetSystemPrompt()
    promptFormData.value = modelConfigStore.systemPrompt
    message.success('已重置为默认提示词')
  } catch (error) {
    console.error('重置提示词失败:', error)
    message.error('重置提示词失败')
  }
}

// 提交提示词配置
const handlePromptSubmit = async () => {
  try {
    if (!systemPrompt.value) {
      message.error('请输入系统提示词')
      return
    }
    await modelConfigStore.updateSystemPrompt(systemPrompt.value)
    message.success('提示词配置已更新')
    closePromptModal()
  } catch (error) {
    console.error('更新提示词配置失败:', error)
    message.error('更新提示词配置失败')
  }
}

// 打开提示词配置模态框
const showPromptSettings = async () => {
  try {
    await modelConfigStore.loadSystemPrompt()
    if (modelConfigStore.systemPrompt) {
      promptFormData.value = modelConfigStore.systemPrompt
      showPromptModal.value = true
    } else {
      message.error('加载提示词配置失败')
    }
  } catch (error) {
    console.error('加载提示词配置失败:', error)
    message.error('加载提示词配置失败')
  }
}
</script>

<style scoped lang="scss">
.ai-assistant-settings {
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

.settings-content-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.ai-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;
  padding-right: 10px;

  .ai-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 30px;

    .section-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      .section-title {
        font-size: 18px;
        line-height: 1;
        color: var(--color-text-primary);
        font-weight: 500;
        user-select: none;
      }
    }

    .section-desc {
      font-size: 14px;
      line-height: 1;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }
  }
}

// 模态框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: var(--color-bg-primary);
  border-radius: 8px;
  width: 580px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
      background: var(--color-background-secondary);
    }
  }
}

.modal-body {
  padding: 20px;

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      font-size: 14px;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--color-primary);
      }

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-left {
    display: flex;
    gap: 12px;
  }

  .footer-right {
    display: flex;
    gap: 12px;
  }
}

.form-help {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}
</style>
