<template>
  <Modal v-model="isVisible" :closeOnClickOutside="false">
    <div class="agent-edit-modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ editingAgent ? '编辑 AI 助手' : '新建 AI 助手' }}</h2>
        <IconButton :icon="Close" tooltip="关闭" @click="handleCancel" />
      </div>

      <div class="modal-content">
        <div class="form-item">
          <label>名称</label>
          <Input v-model="formState.name" placeholder="请输入助手名称" :help="errors.name" />
        </div>

        <div class="form-item">
          <label
            >描述
            <HelpTips content="描述信息不会影响 AI 的回答，仅作为助手信息展示" />
          </label>
          <Input v-model="formState.description" placeholder="请输入助手描述" />
        </div>

        <div class="form-item">
          <label>系统提示词</label>
          <Textarea
            v-model="formState.systemPrompt"
            placeholder="请输入系统提示词"
            :height="200"
            :help="errors.systemPrompt"
          />
        </div>

        <div class="form-item switch-item">
          <label>
            AI 模型
            <HelpTips content="需要先在设置中心模型配置中配置 AI 模型" />
          </label>
          <Dropdown
            :items="modelOptions"
            :width="200"
            trigger="click"
            :showSelected="true"
            showArrow
            @select="handleModelSelect"
          >
            选择模型
          </Dropdown>
        </div>

        <div class="form-item">
          <label>
            温度值
            <HelpTips
              content="温度值越高，AI 的回答越随机，越有创造性，但同时也会导致回答不那么准确"
            />
          </label>
          <Slider
            v-model="formState.temperature"
            :min="0"
            :max="1"
            :step="0.1"
            :precision="1"
            :showLabels="true"
          />
        </div>

        <div class="form-item switch-item">
          <label>
            笔记菜单专属
            <HelpTips content="开启后，该 Agent 只会出现在卡片笔记的菜单中" />
          </label>
          <Switch v-model="formState.includeNoteContext" />
        </div>
      </div>

      <div class="modal-footer">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSubmit">确定</Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useAgentStore } from '@renderer/stores/agentStore'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import type { Agent, CreateAgentParams, UpdateAgentParams } from '@shared/types'
import Modal from '@renderer/components/common/Modal.vue'
import Input from '@renderer/components/ui/Input.vue'
import Textarea from '@renderer/components/ui/Textarea.vue'
import Switch from '@renderer/components/ui/Switch.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import Slider from '@renderer/components/ui/Slider.vue'
import { Close } from '@icon-park/vue-next'
import IconButton from '@renderer/components/ui/buttons/IconButton.vue'
import HelpTips from '@renderer/components/ui/HelpTips.vue'
import { message } from '@renderer/utils/message'

// 1. 先定义所有响应式状态
const formState = ref<CreateAgentParams>({
  name: '',
  description: undefined,
  greeting: undefined,
  systemPrompt: '',
  modelConfigId: '',
  temperature: 0.7,
  includeNoteContext: true
})

const props = defineProps<{
  visible: boolean
  editingAgent: Agent | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}>()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const agentStore = useAgentStore()
const modelConfigStore = useModelConfigStore()
const loading = ref(false)
const errors = ref<Record<string, string>>({})

// 2. 定义重置表单的函数
const resetForm = () => {
  formState.value = {
    name: '',
    description: undefined,
    greeting: undefined,
    systemPrompt: '',
    modelConfigId: modelConfigStore.defaultConfig?.id || '',
    temperature: 0.7,
    includeNoteContext: true
  }
  errors.value = {}
}

// 3. 修改 watch 函数
watch(
  () => props.editingAgent,
  async (agent) => {
    try {
      if (agent) {
        const fullAgent = await agentStore.getAgentById(agent.id)
        if (!fullAgent) {
          throw new Error('获取助手数据失败')
        }

        formState.value = {
          name: fullAgent.name,
          description: fullAgent.description ?? undefined,
          greeting: fullAgent.greeting ?? undefined,
          systemPrompt: fullAgent.systemPrompt,
          modelConfigId: fullAgent.modelConfigId,
          temperature: fullAgent.temperature ?? 0.7,
          includeNoteContext: fullAgent.includeNoteContext ?? true
        }
      } else {
        // 直接设置初始值，而不是调用 resetForm
        formState.value = {
          name: '',
          description: undefined,
          greeting: undefined,
          systemPrompt: '',
          modelConfigId: modelConfigStore.defaultConfig?.id || '',
          temperature: 0.7,
          includeNoteContext: true
        }
        errors.value = {}
      }
    } catch (error: unknown) {
      console.error('加载Agent数据失败:', error)
      message.error('加载数据失败，请重试')
      isVisible.value = false
    }
  },
  { immediate: true }
)

// 4. 修改 visible 的 watch
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible && !props.editingAgent) {
      resetForm()
    }
  }
)

// 其他方法保持不变
const handleCancel = () => {
  isVisible.value = false
  resetForm()
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    const formData = {
      name: formState.value.name.trim(),
      description: formState.value.description?.trim() ?? null,
      greeting: formState.value.greeting?.trim() ?? null,
      systemPrompt: formState.value.systemPrompt.trim(),
      modelConfigId: formState.value.modelConfigId,
      temperature: formState.value.temperature,
      includeNoteContext: formState.value.includeNoteContext
    }

    if (props.editingAgent) {
      const updateData: UpdateAgentParams = {
        id: props.editingAgent.id,
        ...formData
      }
      await agentStore.updateAgent(props.editingAgent.id, updateData)
    } else {
      await agentStore.createAgent(formData)
    }
    emit('success')
    isVisible.value = false
    resetForm()
  } catch (error: unknown) {
    console.error('提交表单失败:', error)
    message.error(error instanceof Error ? error.message : '操作失败，请重试')
  } finally {
    loading.value = false
  }
}

// 表单验证
const validateForm = (): boolean => {
  errors.value = {}

  if (!formState.value.name?.trim()) {
    errors.value.name = '请输入助手名称'
  }
  if (!formState.value.systemPrompt?.trim()) {
    errors.value.systemPrompt = '请输入系统提示词'
  }
  if (!formState.value.modelConfigId) {
    errors.value.modelConfigId = '请选择AI模型'
  }

  return Object.keys(errors.value).length === 0
}

// 修改 modelOptions 计算属性，添加空值保护
const modelOptions = computed(() => {
  if (!modelConfigStore.configs.length) return []

  return modelConfigStore.configs.map((config) => ({
    key: config.id,
    label: config.name,
    active: formState.value?.modelConfigId === config.id,
    icon: config.provider === 'openai' ? 'OpenaiLogo' : 'Robot'
  }))
})

// 修改初始化加载逻辑
onMounted(async () => {
  try {
    // 加载模型配置
    if (modelConfigStore.configs.length === 0) {
      await modelConfigStore.loadConfigs()
      await modelConfigStore.loadProviderPresets()
    }

    // 如果是新建且有默认配置，则使用默认配置
    if (!props.editingAgent && modelConfigStore.defaultConfig) {
      formState.value.modelConfigId = modelConfigStore.defaultConfig.id
    }
  } catch (error) {
    console.error('初始化加载失败:', error)
    message.error('初始化失败，请重试')
  }
})

// 处理模型选择
const handleModelSelect = (key: string) => {
  formState.value.modelConfigId = key
}
</script>

<style lang="scss" scoped>
.agent-edit-modal {
  width: 600px;
  background: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;

  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .modal-content {
    padding: 24px;
    max-height: calc(90vh - 180px);
    overflow-y: auto;

    .form-item {
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

      &.switch-item {
        display: flex;
        align-items: center;
        justify-content: space-between;

        label {
          margin-bottom: 0;
        }
      }

      &.model-select-item {
        .model-select-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;

          .selected-model {
            flex: 1;
            font-size: 14px;
            color: var(--color-text-primary);
            padding: 6px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .error-text {
      margin-top: 4px;
      color: var(--color-red);
      font-size: 12px;
    }
  }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>
