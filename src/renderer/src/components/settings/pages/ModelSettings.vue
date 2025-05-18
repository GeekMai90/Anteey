<template>
  <div class="llm-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Robot theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">大模型配置</div>
    </div>
    <div class="settings-content-divider"></div>
    <div class="llm-settings-content">
      <!-- 模型列表 -->
      <div class="llm-section">
        <div class="section-header">
          <div class="section-title">已配置的模型</div>
          <Button type="primary" :icon="Plus" @click="showAddModal = true"> 添加配置 </Button>
        </div>

        <div class="section-content">
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
                  :disabled="!!config.isDefault"
                  @click="handleDelete(config.id)"
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
          <EmptyState v-else text="暂无配置的模型" />
        </div>
      </div>
    </div>

    <!-- 添加确认对话框 -->
    <ConfirmDialog
      v-model:visible="showConfirmDialog"
      title="确认关闭"
      message="确定要关闭吗？未保存的更改将会丢失。"
      type="danger"
      cancelText="取消"
      confirmText="确定"
      @confirm="handleConfirmClose"
      @cancel="handleCancelClose"
    />

    <!-- 修改模态框部分 -->
    <Modal v-model="showAddModal" :closeOnClickOutside="false">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ editingConfig ? '编辑模型配置' : '添加模型配置' }}</h3>
          <IconButton :icon="Close" tooltip="关闭" @click="closeModal" />
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>
              配置名称
              <HelpTips content="配置名称不要过长，否则会影响模型列表的显示效果。" />
            </label>
            <Input v-model="formData.name" placeholder="请输入配置名称" />
          </div>

          <div class="form-group">
            <label>模型提供商</label>
            <Dropdown
              :items="providerItems"
              :value="formData.provider"
              width="100%"
              showArrow
              @select="handleProviderSelect"
            >
              {{ formData.provider ? providerOptions[formData.provider] : '请选择模型提供商' }}
            </Dropdown>
          </div>

          <div class="form-group">
            <label>
              API Key
              <HelpTips content="API Key 是模型提供商提供的用于访问模型的密钥。" />
            </label>
            <Input v-model="formData.apiKey" type="password" placeholder="请输入 API Key" />
          </div>

          <div class="form-group">
            <label>
              API 地址
              <HelpTips
                content="API 地址是模型提供商提供的用于访问模型的基础地址，例如https://api.openai.com/v1"
              />
            </label>
            <Input v-model="formData.baseUrl" placeholder="请输入 API 基础地址" />
          </div>

          <div class="form-group">
            <label>
              模型名称
              <HelpTips
                content="模型名称是模型提供商提供的用于访问模型的模型名称，请准确填写，例如gpt-3.5-turbo"
              />
            </label>
            <Input v-model="formData.modelName" placeholder="请输入模型名称" />
          </div>

          <div class="form-group">
            <label>Temperature（温度）</label>
            <Input
              :modelValue="String(formData.parameters.temperature)"
              type="number"
              step="0.1"
              min="0"
              :max="formData.provider === 'openai' ? 2 : 1"
              placeholder="设置温度 (0-1)"
              :help="'控制输出的随机性，值越大输出越随机，范围 0-1'"
              @update:modelValue="(val) => (formData.parameters.temperature = val ?? '0.7')"
            />
          </div>

          <div class="form-group">
            <label>Max Tokens（最大生成长度）</label>
            <Input
              :modelValue="String(formData.parameters.maxTokens)"
              type="number"
              step="100"
              min="100"
              placeholder="设置最大 token 数"
              :help="'控制生成文本的最大长度'"
              @update:modelValue="(val) => (formData.parameters.maxTokens = val ?? '2000')"
            />
          </div>

          <div class="form-group">
            <label>系统提示词</label>
            <Textarea
              v-model="formData.systemPrompt"
              placeholder="请输入系统提示词（可选）"
              :help="'设置模型的系统提示词，用于控制模型的行为'"
              :height="120"
            />
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            <Button
              size="medium"
              :loading="!!isLoading"
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
              :tooltip="{
                content: '请先测试连接，确保配置正确，否则无法正常使用。',
                placement: 'top'
              }"
              @click="handleSubmit"
            >
              确认
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Robot, Plus, Close } from '@icon-park/vue-next'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import {
  LLM_MODELS,
  DEFAULT_PARAMETERS,
  getSupportedModels,
  LLMProvider // 确保导入这个类型
} from '@services/rag/llm.config'
import type { ModelConfig } from '@shared/types'
import { message } from '@renderer/utils/message'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Input from '@renderer/components/ui/Input.vue'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import Textarea from '@renderer/components/ui/Textarea.vue'
import IconButton from '@renderer/components/ui/IconButton.vue'
import Modal from '@renderer/components/common/Modal.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'
import HelpTips from '@renderer/components/ui/HelpTips.vue'

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

// 修改接口名称，避免与全局FormData冲突
interface ModelFormData {
  name: string
  provider: LLMProvider | '' // 修改这里,使用联合类型允许空字符串
  modelName: string
  apiKey: string
  baseUrl: string
  parameters: {
    temperature: string // 改为字符串类型
    maxTokens: string // 改为字符串类型
  }
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
    temperature: '0.7',
    maxTokens: '2000'
  },
  systemPrompt: ''
})

// 添加加载状态指示器
const isLoading = ref(false)

// 添加连接测试状态
const hasTestedConnection = ref(false)

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

// 添加确认对话框的状态
const showConfirmDialog = ref(false)

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
  if (!provider) return

  const preset = presets.value[provider]
  if (preset) {
    // 只保留参数预设，不设置 baseUrl 和 modelName
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
      temperature: config.parameters?.temperature?.toString() || '0.7',
      maxTokens: config.parameters?.maxTokens?.toString() || '2000'
    },
    systemPrompt: config.systemPrompt || ''
  }
  showAddModal.value = true
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
  // 只有点击右上角关闭按钮时，才需要确认
  if (isFormDirty.value) {
    showConfirmDialog.value = true
  } else {
    resetModalState()
  }
}

// 添加确认关闭的处理方法
const handleConfirmClose = () => {
  showConfirmDialog.value = false
  resetModalState()
}

// 添加取消关闭的处理方法
const handleCancelClose = () => {
  showConfirmDialog.value = false
}

// 添加重置模态框状态的方法
const resetModalState = () => {
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
      temperature: '0.7',
      maxTokens: '2000'
    },
    systemPrompt: ''
  }
}

// 修改提交表单方法
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
    // 直接重置状态，不需要确认
    resetModalState()
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

// 添加 handleProviderSelect 方法
const handleProviderSelect = (key: string) => {
  formData.value.provider = key as LLMProvider
  handleProviderChange()
}

// 转换提供商选项为 Dropdown 组件需要的格式
const providerItems = computed(() => {
  return Object.entries(providerOptions).map(([key, label]) => ({
    key,
    label
  }))
})
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
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  flex: 1;

  .llm-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin-top: 4px;
    margin-bottom: 30px;
    padding: 0 10px;
    flex: 1;

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

    .section-content {
      width: 100%;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      flex: 1;
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
  justify-content: center;
  padding: 48px 0;
  color: var(--color-text-secondary);
  margin: auto 0;
  position: relative;
  z-index: 1;

  .empty-icon {
    margin-bottom: 16px;
  }

  .empty-text {
    margin-bottom: 24px;
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

// 更新模态框相关样式
.modal-container {
  width: 580px;
  background: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;

  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .modal-body {
    padding: 24px;
    max-height: calc(90vh - 180px);
    overflow-y: auto;

    .form-group {
      margin-bottom: 24px;

      label {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 8px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .modal-footer {
    padding: 16px 24px;
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
}

// 移除旧的 modal-overlay 相关样式
.modal-overlay {
  display: none; // 或直接删除这个样式块
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
