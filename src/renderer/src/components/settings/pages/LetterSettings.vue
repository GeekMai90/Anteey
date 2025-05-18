<template>
  <div class="letter-settings">
    <div class="settings-content-header">
      <div class="icon">
        <Mail theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">每日来信</div>
    </div>
    <div class="settings-content-divider"></div>

    <!-- 使用 Description 组件 -->
    <Description
      :text="[
        '每日来信会根据您的笔记内容，自动生成一封个性化的信件。',
        '您可以在这里设置信件的收件人、寄件人、生成参数等内容。'
      ]"
    />

    <div v-if="letterStore.isConfigLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <div v-else-if="!letterStore.letterConfig" class="empty-config">
      <EmptyState text="无法加载配置，请重试" />
      <Button type="primary" size="medium" @click="letterStore.fetchLetterConfig">重新加载</Button>
    </div>
    <div v-else class="letter-settings-content">
      <!-- 基础设置 -->
      <div class="settings-item">
        <div class="title">收发人设置</div>
        <div class="description">设置信件的收件人和寄件人信息。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">收件人</div>
            <div class="value">
              <Input v-model="formData.recipient" placeholder="请输入收件人名称" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">寄件人</div>
            <div class="value">
              <Input v-model="formData.sender" placeholder="请输入寄件人名称" />
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>启用爱称</span>
              <HelpTips content='启用后，信件中将使用亲昵称呼，如"亲爱的小明"' placement="top" />
            </div>
            <div class="value nickname-switch">
              <Switch v-model="formData.useNickname" />
            </div>
          </div>
        </div>
      </div>

      <!-- 笔记获取设置 -->
      <div class="settings-item">
        <div class="title">笔记获取设置</div>
        <div class="description">控制每日来信和每周总结读取笔记的数量。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">
              <span>每日笔记数量</span>
              <HelpTips content="每天最多获取多少条笔记用于生成每日来信" placement="top" />
            </div>
            <div class="value right-aligned">
              <NumberInput v-model="formData.dailyNotesLimit" :min="1" :max="20" />
              <span class="input-suffix">张</span>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>每周笔记数量</span>
              <HelpTips content="一周最多获取多少条笔记用于生成每周总结" placement="top" />
            </div>
            <div class="value right-aligned">
              <NumberInput v-model="formData.weeklyNotesLimit" :min="1" :max="50" />
              <span class="input-suffix">张</span>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 生成设置 -->
      <div class="settings-item">
        <div class="title">AI 生成设置</div>
        <div class="description">控制 AI 生成信件时使用的模型和参数。</div>
        <div class="settings-form">
          <div class="form-item">
            <div class="label">
              <span>大模型选择</span>
              <HelpTips content="选择用于生成信件的 AI 模型" placement="top" />
            </div>
            <div class="value right-aligned">
              <Dropdown
                :items="modelDropdownItems"
                :showSelected="true"
                :showArrow="true"
                width="200px"
                align="end"
                :placeholder="'请选择模型'"
                :empty-text="'暂无可用模型'"
                @select="handleModelSelect"
              >
                {{ selectedModelName || '请选择模型' }}
              </Dropdown>
            </div>
          </div>
          <div class="form-item">
            <div class="label">
              <span>温度参数</span>
              <HelpTips
                content="控制生成内容的随机性：较低的值使输出更加确定，较高的值使输出更加多样化和创造性"
                placement="top"
              />
            </div>
            <div class="value">
              <Slider v-model="formData.temperature" :min="0" :max="1" :step="0.1" />
              <div class="value-display">{{ formData.temperature.toFixed(1) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 自定义提示词 -->
      <div class="settings-item">
        <div class="title">自定义提示词</div>
        <div class="description">
          设置自定义提示词，指导 AI 如何生成信件内容，留空则使用系统默认提示词。
        </div>
        <div class="description">
          可用变量：
          <span class="variable">
            {date}：日期， {notesContent}：笔记内容，
            {notesCountInfo}：笔记统计信息，{startDate}：开始日期，{endDate}：结束日期
          </span>
        </div>
        <div class="description">
          在提示词中使用变量，服务端会自动将变量替换为对应的值，生成对应的信件内容。
        </div>
        <div class="settings-form">
          <!-- 每日来信提示词 -->
          <div class="form-item vertical">
            <div class="label-full">
              <span>每日来信提示词</span>
              <HelpTips
                content="留空则使用系统默认提示词，自定义设置将覆盖默认提示词"
                placement="top"
              />
            </div>
            <div class="value-full">
              <Textarea
                v-model="formData.customPrompt"
                placeholder="请输入每日来信自定义提示词（可选）"
                :height="160"
              />
            </div>
          </div>

          <!-- 每周来信提示词 -->
          <div class="form-item vertical">
            <div class="label-full">
              <span>每周来信提示词</span>
              <HelpTips
                content="留空则使用系统默认提示词，自定义设置将覆盖默认提示词"
                placement="top"
              />
            </div>
            <div class="value-full">
              <Textarea
                v-model="formData.weeklyCustomPrompt"
                placeholder="请输入每周来信自定义提示词（可选）"
                :height="160"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="settings-action">
        <div class="action-buttons">
          <Button type="delete" size="medium" @click="resetConfig">恢复默认设置</Button>
          <Button type="primary" size="medium" :loading="isSaving" @click="saveSettings"
            >保存设置</Button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, toRaw } from 'vue'
import { Mail } from '@icon-park/vue-next'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'
import type { UpdateLetterConfigParams } from '@shared/types'
import { message } from '@renderer/utils/message'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Input from '@renderer/components/ui/Input.vue'
import Switch from '@renderer/components/ui/Switch.vue'
import NumberInput from '@renderer/components/ui/NumberInput.vue'
import Dropdown from '@renderer/components/ui/Dropdown.vue'
import Slider from '@renderer/components/ui/Slider.vue'
import Textarea from '@renderer/components/ui/Textarea.vue'
import Description from '@renderer/components/ui/Description.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'
import HelpTips from '@renderer/components/ui/HelpTips.vue'

// store
const letterStore = useDailyLetterStore()

// 模型列表
const modelList = ref<{ id: string; name: string }[]>([])
const selectedModelName = ref<string>('')

// 修改为 Dropdown 组件可用的格式
const modelDropdownItems = computed(() => {
  return modelList.value.map((model) => ({
    label: model.name,
    key: model.id,
    active: model.id === formData.modelId
  }))
})

// 表单数据
const formData = reactive({
  recipient: '',
  sender: '',
  useNickname: true,
  dailyNotesLimit: 6,
  weeklyNotesLimit: 12,
  modelId: '',
  temperature: 0.7,
  customPrompt: '',
  weeklyCustomPrompt: ''
})

// 新增状态
const isSaving = ref(false)
const originalData = ref<any>(null)

// 加载配置和模型列表
onMounted(async () => {
  try {
    // 获取配置
    await letterStore.fetchLetterConfig()

    // 获取模型列表
    const models = await window.modelConfigApi.getAllConfigs()
    modelList.value = models.map((model) => ({
      id: model.id,
      name: model.name
    }))

    // 如果配置加载成功，更新表单数据和原始数据
    if (letterStore.letterConfig) {
      Object.assign(formData, letterStore.letterConfig)

      // 使用深拷贝确保原始数据是完全独立的
      originalData.value = JSON.parse(JSON.stringify(letterStore.letterConfig))

      // 更新选中模型名称
      updateSelectedModelName()

      // 打印调试信息
      // console.log('初始表单数据:', formData)
      // console.log('初始原始数据:', originalData.value)
    }
  } catch (error) {
    console.error('初始化失败:', error)
    message.error('加载配置失败')
  }
})

// 监听配置变化
watch(
  () => letterStore.letterConfig,
  (newConfig) => {
    if (newConfig) {
      // 确保类型转换
      formData.dailyNotesLimit = Number(newConfig.dailyNotesLimit)
      formData.weeklyNotesLimit = Number(newConfig.weeklyNotesLimit)
      formData.temperature = Number(newConfig.temperature)
      formData.useNickname = Boolean(newConfig.useNickname)
      formData.recipient = String(newConfig.recipient)
      formData.sender = String(newConfig.sender)
      formData.modelId = String(newConfig.modelId)
      formData.customPrompt = String(newConfig.customPrompt || '')
      formData.weeklyCustomPrompt = String(newConfig.weeklyCustomPrompt || '')

      // 使用相同的类型转换更新原始数据
      originalData.value = {
        dailyNotesLimit: Number(newConfig.dailyNotesLimit),
        weeklyNotesLimit: Number(newConfig.weeklyNotesLimit),
        temperature: Number(newConfig.temperature),
        useNickname: Boolean(newConfig.useNickname),
        recipient: String(newConfig.recipient),
        sender: String(newConfig.sender),
        modelId: String(newConfig.modelId),
        customPrompt: String(newConfig.customPrompt || ''),
        weeklyCustomPrompt: String(newConfig.weeklyCustomPrompt || '')
      }
    }
  }
)

// 重置配置
const resetConfig = async () => {
  try {
    // 获取默认模型
    const defaultModel = await window.modelConfigApi.getDefaultConfig()
    if (!defaultModel) {
      message.error('未找到默认模型')
      return
    }

    // 重置配置
    const success = await letterStore.resetLetterConfig(defaultModel.id)
    if (success) {
      message.success('重置成功')
    } else {
      message.error('重置失败: ' + (letterStore.configError || '未知错误'))
    }
  } catch (error) {
    console.error('重置配置失败:', error)
    message.error('重置失败')
  }
}

// 添加模型选择处理函数
const handleModelSelect = (modelId: string) => {
  formData.modelId = modelId
  // 更新选中模型名称显示
  const selectedModel = modelList.value.find((model) => model.id === modelId)
  if (selectedModel) {
    selectedModelName.value = selectedModel.name
  }
}

// 添加更新选中模型名称的函数
const updateSelectedModelName = () => {
  const selectedModel = modelList.value.find((model) => model.id === formData.modelId)
  if (selectedModel) {
    selectedModelName.value = selectedModel.name
  } else {
    selectedModelName.value = ''
  }
}

// 新增：保存设置
const saveSettings = async () => {
  try {
    isSaving.value = true

    // 创建更新对象
    const updateParams: UpdateLetterConfigParams = {}

    // 只包含已修改的字段
    if (formData.recipient !== originalData.value.recipient) {
      updateParams.recipient = formData.recipient
    }

    if (formData.sender !== originalData.value.sender) {
      updateParams.sender = formData.sender
    }

    if (formData.useNickname !== originalData.value.useNickname) {
      updateParams.useNickname = formData.useNickname
    }

    if (formData.dailyNotesLimit !== originalData.value.dailyNotesLimit) {
      updateParams.dailyNotesLimit = formData.dailyNotesLimit
    }

    if (formData.weeklyNotesLimit !== originalData.value.weeklyNotesLimit) {
      updateParams.weeklyNotesLimit = formData.weeklyNotesLimit
    }

    if (formData.modelId !== originalData.value.modelId) {
      updateParams.modelId = formData.modelId
    }

    if (formData.temperature !== originalData.value.temperature) {
      updateParams.temperature = formData.temperature
    }

    if (formData.customPrompt !== originalData.value.customPrompt) {
      updateParams.customPrompt = formData.customPrompt
    }

    if (formData.weeklyCustomPrompt !== originalData.value.weeklyCustomPrompt) {
      updateParams.weeklyCustomPrompt = formData.weeklyCustomPrompt
    }

    // 更新配置
    const success = await letterStore.batchUpdateLetterConfig(updateParams)

    if (success) {
      // 使用深拷贝更新原始数据
      originalData.value = JSON.parse(JSON.stringify(toRaw(formData)))
    } else {
      message.error('保存失败: ' + (letterStore.configError || '未知错误'))
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    message.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 添加一个调试函数，可以通过控制台调用
const debugFormState = () => {
  console.log('当前表单数据:', toRaw(formData))
  console.log('原始表单数据:', originalData.value)

  // 详细比较每个字段
  if (originalData.value) {
    const orig = originalData.value
    const curr = toRaw(formData)
    console.log('详细字段比较:')
    console.log('- recipient:', orig.recipient === curr.recipient, orig.recipient, curr.recipient)
    console.log('- sender:', orig.sender === curr.sender, orig.sender, curr.sender)
    console.log(
      '- useNickname:',
      orig.useNickname === curr.useNickname,
      orig.useNickname,
      curr.useNickname
    )
    console.log(
      '- dailyNotesLimit:',
      orig.dailyNotesLimit === curr.dailyNotesLimit,
      orig.dailyNotesLimit,
      curr.dailyNotesLimit
    )
    console.log(
      '- weeklyNotesLimit:',
      orig.weeklyNotesLimit === curr.weeklyNotesLimit,
      orig.weeklyNotesLimit,
      curr.weeklyNotesLimit
    )
    console.log('- modelId:', orig.modelId === curr.modelId, orig.modelId, curr.modelId)
    console.log(
      '- temperature:',
      orig.temperature === curr.temperature,
      orig.temperature,
      curr.temperature
    )
    console.log(
      '- customPrompt:',
      orig.customPrompt === curr.customPrompt,
      orig.customPrompt,
      curr.customPrompt
    )
    console.log(
      '- weeklyCustomPrompt:',
      orig.weeklyCustomPrompt === curr.weeklyCustomPrompt,
      orig.weeklyCustomPrompt,
      curr.weeklyCustomPrompt
    )
  }
}

// 将调试函数暴露到全局
// 仅在开发环境使用
if (process.env.NODE_ENV === 'development') {
  ;(window as any).debugLetterForm = debugFormState
}
</script>

<style scoped lang="scss">
.letter-settings {
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

    :deep(svg) {
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

.letter-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-bottom: 58px;
  padding: 0 20px;
  overflow-y: auto;
}

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

      &.vertical {
        flex-direction: column;
        align-items: flex-start;
      }

      .label {
        width: 160px;
        font-size: 14px;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .label-full {
        width: 100%;
        font-size: 14px;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        gap: 8px;
      }

      .value {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;

        &.nickname-switch,
        &.right-aligned {
          justify-content: flex-end;
        }

        .input-suffix {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .switch-description {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .value-display {
          width: 40px;
          text-align: center;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
      }

      .value-full {
        width: 100%;
      }
    }
  }
}

.settings-action {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-top: 20px;
  margin-bottom: 40px;

  .action-buttons {
    display: flex;
    gap: 12px;
  }
}

.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-config {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.variable {
  color: var(--color-primary);
  font-family: monospace;
  font-size: 13px;
}
</style>
