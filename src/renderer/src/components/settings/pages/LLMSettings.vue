<template>
  <div class="llm-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Robot theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">模型配置</div>
    </div>
    <div class="settings-content-divider"></div>
    <div class="llm-settings-content">
      <!-- 模型列表 -->
      <div class="llm-section">
        <div class="section-header">
          <div class="section-title">已配置的模型</div>
          <Button type="primary" :icon="Plus" @click="showAddModal = true"> 添加配置 </Button>
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
              <Button v-if="!config.isDefault" size="medium" @click="handleSetDefault(config.id)">
                设为默认
              </Button>
              <Button size="medium" @click="handleEdit(config)"> 编辑 </Button>
              <Button
                type="delete"
                size="medium"
                :disabled="config.isDefault"
                @click="handleDelete(config.id)"
              >
                删除
              </Button>
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
    </div>

    <!-- 自定义模态框 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="handleOverlayClick">
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

          <div class="form-group">
            <label>模型提供商</label>
            <div class="select-wrapper">
              <div class="select-trigger" @click="showProviderOptions = !showProviderOptions">
                <span class="selected-text">
                  {{
                    formData.provider
                      ? providerOptions[formData.provider as LLMProvider]
                      : '请选择模型提供商'
                  }}
                </span>
                <div class="select-arrow">
                  <Down v-if="!showProviderOptions" theme="outline" size="14" :strokeWidth="3" />
                  <Up v-else theme="outline" size="14" :strokeWidth="3" />
                </div>
              </div>
              <div v-show="showProviderOptions" class="select-options">
                <div
                  v-for="(name, key) in providerOptions"
                  :key="key"
                  class="select-option"
                  :class="{ 'is-active': formData.provider === key }"
                  @click="handleSelectProvider(key)"
                >
                  {{ name }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>API Key</label>
            <input
              v-model="formData.apiKey"
              type="password"
              placeholder="请输入 API Key"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              data-form-type="other"
            />
          </div>

          <div class="form-group">
            <label>API 地址</label>
            <input v-model="formData.baseUrl" type="text" placeholder="请输入 API 基础地址" />
          </div>

          <div class="form-group">
            <label>模型名称</label>
            <input v-model="formData.modelName" type="text" placeholder="请输入模型名称" />
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
            <Button
              size="medium"
              :loading="isLoading"
              :disabled="!isFormValid"
              @click="testConnection"
            >
              测试连接
            </Button>
          </div>
          <div class="footer-right">
            <Button size="medium" @click="closeModal">取消</Button>
            <Button
              type="primary"
              size="medium"
              :disabled="!isFormValid || !hasTestedConnection"
              @click="handleSubmit"
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
import { ref, onMounted, computed } from 'vue'
import { Robot, Plus, Config, Close, Down, Up } from '@icon-park/vue-next'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import {
  LLM_MODELS,
  DEFAULT_PARAMETERS,
  getSupportedModels,
  LLMProvider // 确保导入这个类型
} from '@services/rag/llm.config'
import type { ModelConfig } from '@shared/types'
import { message } from '@renderer/utils/message'
import Button from '@renderer/components/ui/Button.vue'

// 定义一个安全的访问函数，处理可能不存在的属性
const safeGet = <T, K extends string>(obj: T, key: K, defaultValue: any): any => {
  return (obj as any)?.[key] !== undefined ? (obj as any)[key] : defaultValue
}

// 从现有常量创建一个预设映射
const PROVIDER_PRESETS_MAP: Record<string, any> = {}

// 按提供商分组创建预设
Object.entries(LLM_MODELS).forEach(([modelKey, model]) => {
  const provider = model.provider as LLMProvider

  if (!PROVIDER_PRESETS_MAP[provider]) {
    PROVIDER_PRESETS_MAP[provider] = {
      defaultBaseURL: model.defaultBaseURL,
      defaultModel: safeGet(model, 'defaultModel', modelKey),
      modelOptions: getSupportedModels(provider),
      defaultParameters: DEFAULT_PARAMETERS[provider] || {},
      recommendedProxies: []
    }
  }

  // 处理推荐代理地址
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
  provider: LLMProvider | '' // 修改这里,使用联合类型允许空字符串
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
  provider: '', // 空字符串作为初始值
  modelName: '',
  apiKey: '',
  baseUrl: '',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000
  },
  systemPrompt: ''
})

// 添加加载状态指示器
const isLoading = ref(false)

// 添加连接测试状态
const hasTestedConnection = ref(false)

// 添加下拉框状态控制
const showProviderOptions = ref(false)

// 添加表单验证的计算属性
const isFormValid = computed(() => {
  return (
    formData.value.name &&
    formData.value.provider &&
    formData.value.modelName &&
    formData.value.apiKey &&
    formData.value.baseUrl
  )
})

// 初始化加载配置
onMounted(() => {
  modelConfigStore.loadConfigs()
})

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
  if (!provider) return // 添加空值检查

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

// 修改处理点击遮罩层的方法
const handleOverlayClick = () => {
  // 如果正在加载或已经填写了表单，显示确认对话框
  if (isLoading.value || isFormDirty.value) {
    if (confirm('确定要关闭吗？未保存的更改将会丢失。')) {
      closeModal()
    }
  } else {
    closeModal()
  }
}

// 添加表单是否被修改的计算属性
const isFormDirty = computed(() => {
  return (
    formData.value.name !== '' ||
    formData.value.apiKey !== '' ||
    formData.value.baseUrl !== '' ||
    formData.value.modelName !== ''
  )
})

// 修改关闭模态框方法
const closeModal = () => {
  showAddModal.value = false
  editingConfig.value = null
  hasTestedConnection.value = false
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

// 修改测试连接方法
const testConnection = async () => {
  if (!isFormValid.value) {
    message.error('请填写完整的配置信息')
    return
  }

  isLoading.value = true
  hasTestedConnection.value = false

  try {
    const testConfig = {
      provider: formData.value.provider as LLMProvider,
      baseUrl: formData.value.baseUrl,
      apiKey: formData.value.apiKey,
      modelName: formData.value.modelName,
      parameters: {
        temperature: Number(formData.value.parameters.temperature),
        maxTokens: Number(formData.value.parameters.maxTokens)
      }
    }

    const result = await modelConfigStore.testConnection(testConfig)

    if (result.valid) {
      message.success('连接测试成功！')
      hasTestedConnection.value = true
    } else {
      message.error(`连接测试失败：${result.message || '未知错误'}`)
      hasTestedConnection.value = false
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    message.error(`连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`)
    hasTestedConnection.value = false
  } finally {
    isLoading.value = false
  }
}

// 处理提供商选择
const handleSelectProvider = (provider: LLMProvider) => {
  formData.value.provider = provider
  showProviderOptions.value = false
  handleProviderChange()
}
</script>

<style scoped lang="scss">
.llm-settings {
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

.llm-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;
  padding-right: 10px;

  .llm-section {
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

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.model-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-secondary);

  .model-info {
    flex: 1;
    min-width: 0;

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
    flex-shrink: 0;
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

    input,
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

      &[type='number']::-webkit-inner-spin-button,
      &[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }

    // 下拉框样式优化
    .select-wrapper {
      position: relative;
      width: 100%;

      .select-trigger {
        width: 100%;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 36px;
        background: var(--color-background-primary);

        &:hover {
          border-color: var(--color-primary);
          background: var(--color-hover-bg);
        }

        .selected-text {
          font-weight: 400;
        }

        .select-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 100%;
        }
      }

      .select-options {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        width: 100%;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 4px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: var(--shadow-card);

        .select-option {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          font-size: 14px;
          color: var(--color-text-primary);

          &:hover {
            background: var(--color-hover-bg);
          }

          &.is-active {
            color: var(--color-primary);
            background: var(--color-primary-bg);
          }
        }
      }
    }
  }
}

.form-help {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

// 修改测试按钮样式
.test-btn {
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-background-secondary);
  }
}

// 添加新的按钮样式
.three-sync-item-button {
  min-width: 80px;
  height: 32px;
  padding: 0 16px;
  background-color: var(--color-primary);
  color: var(--color-text-white);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  border: none;

  &:hover {
    opacity: 0.9;
  }

  &.test {
    background-color: var(--color-success);
  }

  &.is-loading {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-background-secondary);
  }
}
</style>
