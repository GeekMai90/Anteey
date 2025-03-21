<template>
  <div class="llm-settings">
    <div class="llm-settings-wrapper">
      <div class="settings-content-header">
        <div class="icon">
          <Robot theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
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

          <div v-if="modelConfigStore.configs.length > 0" class="model-list">
            <div v-for="config in modelConfigStore.configs" :key="config.id" class="model-item">
              <div class="model-info">
                <div class="model-name">
                  {{ config.name }}
                  <span v-if="config.isDefault" class="default-badge">默认</span>
                </div>
                <div class="model-provider">{{ getProviderName(config.provider) }}</div>
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
          <div class="form-group">
            <label>配置名称</label>
            <input v-model="formData.name" type="text" placeholder="请输入配置名称" />
          </div>

          <div v-if="!editingConfig" class="form-group">
            <label>模型提供商</label>
            <select v-model="formData.provider" @change="handleProviderChange">
              <option v-for="(name, key) in providerOptions" :key="key" :value="key">
                {{ name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>API Key</label>
            <input v-model="formData.apiKey" type="password" placeholder="请输入 API Key" />
          </div>

          <div class="form-group">
            <label>API 地址</label>
            <input v-model="formData.baseUrl" type="text" placeholder="请输入 API 基础地址" />
            <div
              v-if="formData.provider && presets[formData.provider]?.recommendedProxies"
              class="endpoint-help"
            >
              <span class="help-text">推荐地址:</span>
              <div class="proxy-list">
                <span
                  v-for="(proxy, index) in presets[formData.provider].recommendedProxies"
                  :key="index"
                  class="proxy-item"
                  @click="formData.baseUrl = proxy"
                >
                  {{ proxy }}
                </span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>模型名称</label>
            <input v-model="formData.modelName" type="text" placeholder="请输入模型名称" />
            <div
              v-if="formData.provider && presets[formData.provider]?.modelOptions"
              class="endpoint-help"
            >
              <span class="help-text">可选模型:</span>
              <div class="proxy-list">
                <span
                  v-for="(model, index) in presets[formData.provider].modelOptions"
                  :key="index"
                  class="proxy-item"
                  @click="formData.modelName = model"
                >
                  {{ model }}
                </span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Temperature（温度）</label>
            <input
              v-model.number="formData.parameters.temperature"
              type="number"
              min="0"
              max="1"
              step="0.1"
              placeholder="设置温度 (0-1)"
            />
          </div>

          <div class="form-group">
            <label>Max Tokens（最大生成长度）</label>
            <input
              v-model.number="formData.parameters.maxTokens"
              type="number"
              min="1"
              max="4096"
              placeholder="设置最大 token 数"
            />
          </div>

          <div class="form-group">
            <label>系统提示词</label>
            <textarea
              v-model="formData.systemPrompt"
              rows="4"
              placeholder="请输入系统提示词（可选）"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            <button class="test-btn" :disabled="!isFormValid || isLoading" @click="testConnection">
              <div v-if="isLoading" class="loading-spinner"></div>
              <div v-else class="test-btn-icon">
                <Check theme="outline" size="16" />
              </div>
              <div class="test-btn-text">{{ isLoading ? '测试中...' : '测试连接' }}</div>
            </button>
          </div>
          <div class="footer-right">
            <button class="cancel-btn" @click="closeModal">取消</button>
            <button class="confirm-btn" :disabled="!isFormValid" @click="handleSubmit">确认</button>
          </div>
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
import { Robot, Plus, Config, Close, Setting, Check } from '@icon-park/vue-next'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import {
  LLM_MODELS,
  DEFAULT_PARAMETERS,
  getSupportedModels,
  LLMProvider // 确保导入这个类型
} from '@services/rag/llm.config'
import type { ModelConfig, SystemPromptConfig } from '@shared/types'
import { message } from '@renderer/utils/message'

// 定义一个安全的访问函数，处理可能不存在的属性
const safeGet = <T, K extends string>(obj: T, key: K, defaultValue: any): any => {
  return (obj as any)?.[key] !== undefined ? (obj as any)[key] : defaultValue
}

// 从现有常量创建一个预设映射
const PROVIDER_PRESETS_MAP: Record<string, any> = {}

// 按提供商分组创建预设
Object.entries(LLM_MODELS).forEach(([modelKey, model]) => {
  // 使用类型断言加强类型安全
  const provider = model.provider as LLMProvider // 修改为正确的类型

  if (!PROVIDER_PRESETS_MAP[provider]) {
    PROVIDER_PRESETS_MAP[provider] = {
      defaultBaseURL: model.defaultBaseURL + model.pathSuffix,
      // 安全地获取 defaultModel 属性
      defaultModel: safeGet(model, 'defaultModel', modelKey),
      modelOptions: getSupportedModels(provider), // 现在provider已经是LLMProvider类型
      defaultParameters: DEFAULT_PARAMETERS[provider] || {},
      recommendedProxies: []
    }
  }

  // 安全地处理可能不存在的 recommendedProxies 属性
  const recommendedProxies = safeGet(model, 'recommendedProxies', [])
  if (Array.isArray(recommendedProxies) && recommendedProxies.length > 0) {
    const urls = recommendedProxies.map((p: any) => p.url)

    // 确保不重复添加
    urls.forEach((url: string) => {
      if (!PROVIDER_PRESETS_MAP[provider].recommendedProxies.includes(url)) {
        PROVIDER_PRESETS_MAP[provider].recommendedProxies.push(url)
      }
    })
  }
})

// 使用创建的映射
const presets = ref(PROVIDER_PRESETS_MAP)

// 定义ModelParameters类型（如果@shared/types中没有导出）
interface ModelParametersType {
  temperature: number
  maxTokens: number
  // 添加其他可能的参数
}

// 修改接口名称，避免与全局FormData冲突
interface ModelFormData {
  name: string
  provider: string
  modelName: string
  apiKey: string
  baseUrl: string
  parameters: ModelParametersType
  systemPrompt: string
}

const modelConfigStore = useModelConfigStore()
const showAddModal = ref(false)
const editingConfig = ref<ModelConfig | null>(null)

// 提供商名称映射
const providerNameMap: Record<LLMProvider, string> = {
  zhipu: '智谱 GLM',
  moonshot: 'Moonshot',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
  custom: '自定义'
}

// 使用类型确保所有提供商都有对应的显示名称
const providerOptions: Record<LLMProvider, string> = providerNameMap

// 使用新的类型名称
const formData = ref<ModelFormData>({
  name: '',
  provider: '',
  modelName: '',
  apiKey: '',
  baseUrl: '',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000
  },
  systemPrompt: ''
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

// 表单是否有效
const isFormValid = computed(() => {
  return (
    formData.value.name &&
    formData.value.provider &&
    formData.value.modelName &&
    formData.value.apiKey &&
    formData.value.baseUrl
  )
})

// 添加加载状态指示器
const isLoading = ref(false)

// 初始化加载配置
onMounted(() => {
  modelConfigStore.loadConfigs()
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

// 遮掩 API Key
const maskApiKey = (key: string) => {
  if (!key) return '***'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

// 获取提供商名称
const getProviderName = (provider: string) => {
  return providerOptions[provider as keyof typeof providerOptions] || provider
}

// 处理提供商变更
const handleProviderChange = () => {
  const provider = formData.value.provider
  const preset = presets.value[provider]

  if (preset) {
    formData.value.baseUrl = preset.defaultBaseURL || ''
    formData.value.modelName = preset.defaultModel || ''

    if (preset.defaultParameters) {
      formData.value.parameters = {
        ...formData.value.parameters,
        ...preset.defaultParameters
      }
    }
  }
}

// 打开编辑模态框
const handleEdit = (config: ModelConfig) => {
  editingConfig.value = config
  formData.value = {
    name: config.name,
    provider: config.provider,
    modelName: config.modelName,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    parameters: {
      temperature: config.parameters?.temperature ?? 0.7,
      maxTokens: config.parameters?.maxTokens ?? 2000
    },
    systemPrompt: config.systemPrompt || ''
  }
  showAddModal.value = true
}

// 关闭模态框
const closeModal = () => {
  showAddModal.value = false
  editingConfig.value = null
  formData.value = {
    name: '',
    provider: '',
    modelName: '',
    apiKey: '',
    baseUrl: '',
    parameters: {
      temperature: 0.7,
      maxTokens: 2000
    },
    systemPrompt: ''
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    const parametersToSend = {
      temperature: Number(formData.value.parameters.temperature),
      maxTokens: Number(formData.value.parameters.maxTokens)
    }

    const configData = {
      name: formData.value.name,
      provider: formData.value.provider as LLMProvider,
      modelName: formData.value.modelName,
      apiKey: formData.value.apiKey,
      baseUrl: formData.value.baseUrl,
      parameters: parametersToSend,
      systemPrompt: formData.value.systemPrompt || undefined,
      isDefault: false
    }

    if (editingConfig.value) {
      await modelConfigStore.updateConfig(editingConfig.value.id, configData)
      message.success('配置已更新')
    } else {
      await modelConfigStore.addConfig(configData)
      message.success('配置已添加')
    }
    closeModal()
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// 设置默认配置
const handleSetDefault = async (id: string) => {
  try {
    await modelConfigStore.setDefaultConfig(id)
    message.success('已设置为默认配置')
  } catch (error) {
    message.error('设置失败')
  }
}

// 删除配置
const handleDelete = async (id: string) => {
  try {
    await modelConfigStore.deleteConfig(id)
    message.success('配置已删除')
  } catch (error) {
    message.error('删除失败')
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

// 修改测试连接方法，使用 store 中的 testConnection
const testConnection = async () => {
  if (!isFormValid.value) {
    message.error('请填写完整的配置信息')
    return
  }

  isLoading.value = true
  try {
    const result = await modelConfigStore.testConnection(
      formData.value.provider as LLMProvider,
      formData.value.baseUrl,
      formData.value.apiKey,
      formData.value.modelName
    )

    if (result.valid) {
      message.success('连接测试成功！')
    } else {
      message.error(`连接测试失败：${result.message || '未收到有效响应'}`)
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    message.error(`连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isLoading.value = false
  }
}
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

      .model-provider {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin-top: 4px;
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

  .test-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: var(--color-success-bg);
    color: var(--color-success);
    border: 1px solid var(--color-success);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background: var(--color-success-light);
    }
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-top-color: var(--color-success);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
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

    select,
    input,
    textarea {
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

    .endpoint-help {
      margin-top: 8px;
      font-size: 12px;

      .help-text {
        color: var(--color-text-secondary);
        margin-bottom: 4px;
        display: block;
      }

      .proxy-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .proxy-item {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: var(--color-primary-light);
          }
        }
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
