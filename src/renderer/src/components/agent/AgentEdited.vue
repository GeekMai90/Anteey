<template>
  <Modal v-model="isVisible" :closeOnClickOutside="false">
    <div class="agent-edit-modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ editingAgent ? '编辑AI助手' : '新建AI助手' }}</h2>
        <IconButton :icon="Close" tooltip="关闭" @click="handleCancel" />
      </div>

      <div class="modal-content">
        <div class="form-item">
          <label>名称</label>
          <Input v-model="formState.name" placeholder="请输入助手名称" :help="errors.name" />
        </div>

        <div class="form-item">
          <label>描述</label>
          <Textarea v-model="formState.description" placeholder="请输入助手描述" :height="80" />
        </div>

        <!-- <div class="form-item">
          <label>打招呼语</label>
          <Textarea
            v-model="formState.greeting"
            placeholder="请输入打招呼语"
            :height="80"
            :help="errors.greeting"
          />
        </div> -->

        <div class="form-item">
          <label>系统提示词</label>
          <Textarea
            v-model="formState.systemPrompt"
            placeholder="请输入系统提示词"
            :height="120"
            :help="errors.systemPrompt"
          />
        </div>

        <div class="form-item switch-item">
          <label>AI模型</label>
          <Dropdown
            :items="modelOptions"
            :width="200"
            trigger="click"
            :showSelected="true"
            @select="handleModelSelect"
          >
            选择模型
          </Dropdown>
        </div>

        <div class="form-item">
          <label>温度值</label>
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
          <label>是否需要笔记作为上下文</label>
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
import Button from '@renderer/components/ui/Button.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import Slider from '@renderer/components/ui/Slider.vue'
import { Close } from '@icon-park/vue-next'
import IconButton from '@renderer/components/ui/IconButton.vue'

const props = defineProps<{
  visible: boolean
  editingAgent: Agent | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}>()

// 使用本地 visible 状态来避免直接修改 prop
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const agentStore = useAgentStore()
const modelConfigStore = useModelConfigStore()
const loading = ref(false)
const errors = ref<Record<string, string>>({})

// 表单状态
const formState = ref<CreateAgentParams>({
  name: '',
  description: undefined,
  greeting: undefined,
  systemPrompt: '',
  modelConfigId: '',
  temperature: 0.7,
  includeNoteContext: true
})

// 表单验证
const validateForm = (): boolean => {
  errors.value = {}

  if (!formState.value.name) {
    errors.value.name = '请输入助手名称'
  }
  if (!formState.value.systemPrompt) {
    errors.value.systemPrompt = '请输入系统提示词'
  }
  if (!formState.value.modelConfigId) {
    errors.value.modelConfigId = '请选择AI模型'
  }

  return Object.keys(errors.value).length === 0
}

// 监听编辑对象变化
watch(
  () => props.editingAgent,
  (agent) => {
    if (agent) {
      formState.value = {
        name: agent.name,
        description: agent.description ?? undefined,
        greeting: agent.greeting ?? undefined,
        systemPrompt: agent.systemPrompt,
        modelConfigId: agent.modelConfigId,
        temperature: agent.temperature,
        includeNoteContext: agent.includeNoteContext
      }
    } else {
      formState.value = {
        name: '',
        description: undefined,
        greeting: undefined,
        systemPrompt: '',
        modelConfigId: modelConfigStore.defaultConfig?.id || '',
        temperature: 0.7,
        includeNoteContext: true
      }
    }
  },
  { immediate: true }
)

// 添加初始化加载
onMounted(async () => {
  // 加载模型配置
  if (modelConfigStore.configs.length === 0) {
    await modelConfigStore.loadConfigs()
    await modelConfigStore.loadProviderPresets()
  }

  // 如果是新建且有默认配置，则使用默认配置
  if (!props.editingAgent && modelConfigStore.defaultConfig) {
    formState.value.modelConfigId = modelConfigStore.defaultConfig.id
  }
})

// 转换模型配置为下拉菜单选项
const modelOptions = computed(() => {
  return modelConfigStore.configs.map((config) => ({
    key: config.id,
    label: config.name,
    active: formState.value.modelConfigId === config.id,
    // 可以添加图标等其他信息
    icon: config.provider === 'openai' ? 'OpenaiLogo' : 'Robot'
  }))
})

// 处理模型选择
const handleModelSelect = (key: string) => {
  formState.value.modelConfigId = key
}

// 添加重置表单的方法
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

// 修改 handleCancel 方法
const handleCancel = () => {
  isVisible.value = false
  resetForm() // 添加重置表单
}

// 修改 handleSubmit 方法
const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    // 将响应式对象转换为普通对象,处理 undefined 转为 null
    const formData = {
      name: formState.value.name,
      description: formState.value.description ?? null,
      greeting: formState.value.greeting ?? null,
      systemPrompt: formState.value.systemPrompt,
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
    resetForm() // 添加重置表单
  } catch (error) {
    console.error('提交表单失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听 visible 变化
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible && !props.editingAgent) {
      // 当打开弹窗且不是编辑模式时，重置表单
      resetForm()
    }
  }
)
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
        display: block;
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
