<template>
  <div class="llm-settings">
    <div class="llm-settings-wrapper">
      <div class="settings-content-header">
        <div class="icon">
          <Robot theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
        </div>
        <div class="name">模型配置</div>
      </div>
      <div class="settings-divider"></div>

      <div class="llm-settings-content">
        <!-- 模型列表 -->
        <div class="llm-section">
          <div class="section-header">
            <div class="section-title">已配置的模型</div>
            <button class="add-btn" @click="showAddModal = true">
              <div class="add-btn-icon">
                <Plus theme="outline" size="16" />
              </div>
              <div class="add-btn-text">添加配置</div>
            </button>
          </div>

          <div v-if="llmConfigStore.configs.length > 0" class="model-list">
            <div v-for="config in llmConfigStore.configs" :key="config.id" class="model-item">
              <div class="model-info">
                <div class="model-name">
                  {{ LLM_MODELS[config.model].name }}
                  <span v-if="config.isDefault" class="default-badge">默认</span>
                </div>
                <div class="model-key">{{ maskApiKey(config.apiKey) }}</div>
              </div>
              <div class="model-actions">
                <button
                  v-if="!config.isDefault"
                  class="action-btn"
                  @click="handleSetDefault(config.id)"
                >
                  设为默认
                </button>
                <button class="action-btn" @click="handleEdit(config)">编辑</button>
                <button
                  class="action-btn delete"
                  :disabled="config.isDefault"
                  @click="handleDelete(config.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <Config theme="outline" size="48" fill="var(--color-text-secondary)" />
            </div>
            <div class="empty-text">暂无配置的模型</div>
            <button class="add-btn" @click="showAddModal = true">添加配置</button>
          </div>
        </div>

        <!-- 添加提示词设置区域 -->
        <div class="llm-section">
          <div class="section-header">
            <div class="section-title">聊一聊模式提示词</div>
            <button class="setting-btn" @click="showPromptSettings">
              <div class="setting-btn-icon">
                <Setting theme="outline" size="16" />
              </div>
              <div class="setting-btn-text">设置提示词</div>
            </button>
          </div>
          <div class="section-desc">
            设置与 AI 助手聊天时的系统提示词，这将影响 AI 助手的角色定位和行为方式。
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义模态框 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ editingConfig ? '编辑模型配置' : '添加模型配置' }}</h3>
          <button class="close-btn" @click="closeModal">
            <Close theme="outline" size="16" />
          </button>
        </div>

        <div class="modal-body">
          <div v-if="!editingConfig" class="form-group">
            <label>选择模型</label>
            <select v-model="formData.model">
              <option v-for="(model, key) in LLM_MODELS" :key="key" :value="key">
                {{ model.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="formData.apiKey" type="password" placeholder="请输入 API Key" />
          </div>

          <!-- DeepSeek 特有配置 -->
          <template v-if="formData.model.startsWith('deepseek')">
            <div class="form-group">
              <label>Temperature</label>
              <input
                v-model.number="formData.deepseekConfig.temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                placeholder="设置温度 (0-1)"
              />
            </div>
            <div class="form-group">
              <label>Max Tokens</label>
              <input
                v-model.number="formData.deepseekConfig.maxTokens"
                type="number"
                min="1"
                max="4096"
                placeholder="设置最大 token 数"
              />
            </div>
          </template>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModal">取消</button>
          <button
            class="confirm-btn"
            :disabled="!formData.model || !formData.apiKey"
            @click="handleSubmit"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 提示词配置模态框 -->
    <div v-if="showPromptModal" class="modal-overlay" @click.self="closePromptModal">
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
              <button class="reset-btn" @click="resetToDefault">重置为默认提示词</button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="closePromptModal">取消</button>
          <button class="confirm-btn" :disabled="!systemPrompt" @click="handlePromptSubmit">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Robot, Plus, Config, Close, Setting } from '@icon-park/vue-next'
import { useLLMConfigStore } from '@renderer/stores/llmConfigStore'
import { LLM_MODELS } from '@services/rag/llm.config'
import type { LLMConfig, DeepSeekConfig, SystemPromptConfig } from '@shared/types'
import { message } from '@renderer/utils/message'

// 定义表单数据的类型
interface FormData {
  model: string
  apiKey: string
  deepseekConfig: DeepSeekConfig
}

const llmConfigStore = useLLMConfigStore()
const showAddModal = ref(false)
const editingConfig = ref<LLMConfig | null>(null)

// 使用类型注解
const formData = ref<FormData>({
  model: '',
  apiKey: '',
  deepseekConfig: {
    temperature: 0.7,
    maxTokens: 2000
  }
})

// 提示词配置相关
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

// 初始化加载配置
llmConfigStore.loadConfigs()

// 初始化时加载提示词配置
const initPromptConfig = async () => {
  try {
    await llmConfigStore.loadSystemPrompt()
    if (llmConfigStore.systemPrompt) {
      promptFormData.value = llmConfigStore.systemPrompt
      // console.log('加载的提示词配置:', llmConfigStore.systemPrompt)
    } else {
      console.warn('未找到提示词配置')
    }
  } catch (error) {
    console.error('初始化提示词配置失败:', error)
    message.error('加载提示词配置失败')
  }
}

// 遮掩 API Key
const maskApiKey = (key: string) => {
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

// 打开编辑模态框
const handleEdit = (config: LLMConfig) => {
  editingConfig.value = config
  formData.value = {
    model: config.model,
    apiKey: config.apiKey,
    deepseekConfig: {
      temperature: config.deepseekConfig?.temperature ?? 0.7,
      maxTokens: config.deepseekConfig?.maxTokens ?? 2000
    }
  }
  showAddModal.value = true
}

// 关闭模态框
const closeModal = () => {
  showAddModal.value = false
  editingConfig.value = null
  formData.value = {
    model: '',
    apiKey: '',
    deepseekConfig: {
      temperature: 0.7,
      maxTokens: 2000
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    // 确保数值类型正确
    const deepseekConfigToSend = formData.value.model.startsWith('deepseek')
      ? {
          temperature: Number(formData.value.deepseekConfig.temperature),
          maxTokens: Number(formData.value.deepseekConfig.maxTokens)
        }
      : undefined

    if (editingConfig.value) {
      await llmConfigStore.updateConfig(
        editingConfig.value.id,
        formData.value.apiKey,
        deepseekConfigToSend
      )
      message.success('配置已更新')
    } else {
      await llmConfigStore.addConfig(
        formData.value.model,
        formData.value.apiKey,
        deepseekConfigToSend
      )
      message.success('配置已添加')
    }
    closeModal()
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  }
}

// 设置默认配置
const handleSetDefault = async (id: string) => {
  try {
    await llmConfigStore.setDefaultConfig(id)
    message.success('已设置为默认配置')
  } catch (error) {
    message.error('设置失败')
  }
}

// 删除配置
const handleDelete = async (id: string) => {
  try {
    await llmConfigStore.deleteConfig(id)
    message.success('配置已删除')
  } catch (error) {
    message.error('删除失败')
  }
}

// 关闭提示词配置模态框
const closePromptModal = () => {
  showPromptModal.value = false
  promptFormData.value = llmConfigStore.systemPrompt
}

// 重置为默认提示词
const resetToDefault = async () => {
  try {
    await llmConfigStore.resetSystemPrompt()
    promptFormData.value = llmConfigStore.systemPrompt
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
    await llmConfigStore.updateSystemPrompt(systemPrompt.value)
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
    await llmConfigStore.loadSystemPrompt()
    if (llmConfigStore.systemPrompt) {
      promptFormData.value = llmConfigStore.systemPrompt
      showPromptModal.value = true
    } else {
      message.error('加载提示词配置失败')
    }
  } catch (error) {
    console.error('加载提示词配置失败:', error)
    message.error('加载提示词配置失败')
  }
}

// 在组件挂载时初始化
onMounted(() => {
  initPromptConfig()
})
</script>

<style scoped lang="scss">
.llm-settings {
  width: 100%;
  height: 100%;

  .llm-settings-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
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

  .settings-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 4px 0 0px;
  }

  .llm-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      margin-bottom: 16px;

      .section-title {
        font-size: 18px;
        font-weight: 500;
        color: var(--color-text-primary);
      }
    }
  }

  .model-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .model-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-background-secondary);

    .model-info {
      .model-name {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;

        .default-badge {
          font-size: 12px;
          padding: 2px 6px;
          background: var(--color-primary);
          color: white;
          border-radius: 4px;
        }
      }

      .model-key {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
    }

    .model-actions {
      display: flex;
      gap: 8px;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 0;
    color: var(--color-text-secondary);

    .empty-icon {
      margin-bottom: 16px;
    }

    .empty-text {
      margin-bottom: 24px;
    }
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;

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

    &:hover {
      opacity: 0.9;
    }
  }

  .action-btn {
    padding: 4px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background-primary);
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: 14px;

    &:hover {
      background: var(--color-background-secondary);
    }

    &.delete {
      color: var(--color-danger);
      border-color: var(--color-danger);

      &:hover {
        background: var(--color-danger-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

// 模态框样式
.modal-content {
  padding: 20px;
  min-width: 400px;

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 8px;
      color: var(--color-text-primary);
    }

    select,
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--color-border);

  button {
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;

    &.cancel-btn {
      border: 1px solid var(--color-border);
      background: var(--color-background-primary);
      color: var(--color-text-primary);
    }

    &.confirm-btn {
      background: var(--color-primary);
      color: white;
      border: none;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
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

    select,
    input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background-primary);
      color: var(--color-text-primary);

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
  justify-content: flex-end;
  gap: 12px;

  button {
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;

    &.cancel-btn {
      border: 1px solid var(--color-border);
      background: var(--color-background-primary);
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-background-secondary);
      }
    }

    &.confirm-btn {
      background: var(--color-primary);
      color: white;
      border: none;

      &:hover {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

// 添加提示词配置相关样式
.form-group {
  textarea {
    width: 100%;
    min-height: 120px;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-background-primary);
    color: var(--color-text-primary);
    resize: vertical;

    &:focus {
      border-color: var(--color-primary);
      outline: none;
    }
  }

  .form-help {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;

    .reset-btn {
      font-size: 12px;
      color: var(--color-primary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 8px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.section-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.setting-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;

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

  &:hover {
    background: var(--color-hover-bg);
  }
}
</style>
