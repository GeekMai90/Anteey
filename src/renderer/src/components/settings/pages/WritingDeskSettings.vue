<template>
  <div class="writing-desk-settings">
    <div class="settings-content-header">
      <div class="icon">
        <NotebookAndPen
          theme="outline"
          size="20"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
      <div class="name">写作台设置</div>
    </div>
    <div class="settings-content-divider"></div>

    <!-- 添加说明描述区域 -->
    <div class="settings-description">
      <div class="description-icon">
        <Tips theme="outline" size="16" :strokeWidth="3" />
      </div>
      <div class="description-text">
        每种功能仅支持设置一个自定义提示词模板。设置后将优先使用自定义提示词，未设置时使用系统默认提示词。
      </div>
    </div>

    <div class="writing-desk-settings-content">
      <!-- 模板部分，按功能类型分区展示 -->
      <div v-for="type in templateTypes" :key="type.value" class="template-section">
        <div class="section-header">
          <div class="section-title">{{ type.label }}提示词模板</div>
        </div>

        <!-- 当前模板显示区域 -->
        <div v-if="getTemplateByType(type.value)" class="template-item">
          <div class="template-info">
            <div class="template-description">
              {{ getTemplateByType(type.value)?.description }}
            </div>
            <div class="template-content">{{ getTemplateByType(type.value)?.content }}</div>
          </div>
          <div class="template-actions">
            <Button type="primary" size="medium" @click="handleEdit(type.value)">编辑</Button>
            <Button type="delete" size="medium" @click="handleDelete(type.value)">删除</Button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <component
              :is="getIconForType(type.value)"
              theme="outline"
              size="48"
              fill="var(--color-text-secondary)"
            />
          </div>
          <div class="empty-text">暂无{{ type.label }}自定义提示词</div>
          <Button type="primary" @click="handleCreate(type.value)">创建模板</Button>
        </div>
      </div>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="handleOverlayClick">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑提示词模板' : '创建提示词模板' }}</h3>
          <button class="close-btn" @click="closeModal">
            <Close theme="outline" size="16" />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>模板类型</label>
            <div class="type-display">{{ getTemplateTypeName(currentType) }}</div>
          </div>

          <div class="form-group">
            <label>模板描述</label>
            <Input v-model="formData.description" placeholder="请输入模板描述" />
          </div>

          <div class="form-group">
            <label>提示词内容</label>
            <Textarea
              v-model="formData.content"
              placeholder="请输入提示词内容"
              :help="'设置 AI 的具体指令内容'"
              :height="200"
            />
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-right">
            <Button size="medium" @click="closeModal">取消</Button>
            <Button type="primary" size="medium" :disabled="!isFormValid" @click="handleSubmit">
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
import { Write, Close, MessageEmoji, Tips, NotebookAndPen } from '@icon-park/vue-next'
import { useWritingPromptTemplateStore } from '@renderer/stores/writingPromptTemplateStore'
import type { PromptTemplateType } from '@shared/types'
import { message } from '@renderer/utils/message'
import Button from '@renderer/components/ui/Button.vue'
import Input from '@renderer/components/ui/Input.vue'
import Textarea from '@renderer/components/ui/Textarea.vue'

const promptTemplateStore = useWritingPromptTemplateStore()
const showModal = ref(false)
const currentType = ref<PromptTemplateType>('firstDraft')
const isEditing = ref(false)

// 修改模板类型配置，移除 deepThinking
const templateTypes = [
  { value: 'firstDraft', label: '生成初稿' },
  { value: 'polish', label: '润色文章' }
] as const

// 存储各类型的模板
const templates = ref<
  Record<
    PromptTemplateType,
    {
      id?: string
      type: PromptTemplateType
      content: string
      description?: string
    } | null
  >
>({
  firstDraft: null,
  polish: null
})

// 表单数据
const formData = ref({
  description: '',
  content: ''
})

// 表单验证
const isFormValid = computed(() => {
  return formData.value.content.trim() !== ''
})

// 初始化
onMounted(async () => {
  // 加载所有类型的模板
  await loadAllTemplates()
})

// 加载所有模板
const loadAllTemplates = async () => {
  for (const type of templateTypes) {
    const template = await promptTemplateStore.getTemplateByType(type.value)
    templates.value[type.value] = template || null
  }
}

// 获取指定类型的模板
const getTemplateByType = (type: PromptTemplateType) => {
  return templates.value[type]
}

// 修改 getIconForType 函数，移除 deepThinking 相关的逻辑
const getIconForType = (type: PromptTemplateType) => {
  switch (type) {
    case 'firstDraft':
      return Write
    case 'polish':
      return MessageEmoji
    default:
      return Write
  }
}

// 获取模板类型名称
const getTemplateTypeName = (type: PromptTemplateType) => {
  const typeConfig = templateTypes.find((t) => t.value === type)
  return typeConfig?.label || type
}

// 处理创建
const handleCreate = (type: PromptTemplateType) => {
  currentType.value = type
  isEditing.value = false
  formData.value = {
    description: '',
    content: ''
  }
  showModal.value = true
}

// 处理编辑
const handleEdit = (type: PromptTemplateType) => {
  const template = getTemplateByType(type)
  if (template) {
    currentType.value = type
    isEditing.value = true
    formData.value = {
      description: template.description || '',
      content: template.content
    }
    showModal.value = true
  }
}

// 处理删除
const handleDelete = async (type: PromptTemplateType) => {
  try {
    await promptTemplateStore.deleteTemplate(type)
    // 更新本地状态
    templates.value[type] = null
    message.success('模板已删除')
  } catch (error) {
    message.error('删除失败')
  }
}

// 处理遮罩层点击
const handleOverlayClick = () => {
  if (isFormDirty.value) {
    if (confirm('确定要关闭吗？未保存的更改将会丢失。')) {
      closeModal()
    }
  } else {
    closeModal()
  }
}

// 表单是否被修改
const isFormDirty = computed(() => {
  return formData.value.content !== ''
})

// 关闭模态框
const closeModal = () => {
  showModal.value = false
  formData.value = {
    description: '',
    content: ''
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    const result = await promptTemplateStore.upsertTemplate({
      type: currentType.value,
      description: formData.value.description,
      content: formData.value.content
    })

    // 更新本地状态
    if (result) {
      templates.value[currentType.value] = result
    }

    message.success('保存成功')
    closeModal()
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}
</script>

<style scoped lang="scss">
.writing-desk-settings {
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

.writing-desk-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0 20px;
}

.template-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 4px;
  margin-bottom: 30px;
  padding: 0 10px;
}

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

.template-item {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-secondary);

  .template-info {
    margin-bottom: 16px;

    .template-description {
      font-size: 14px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
    }

    .template-content {
      font-size: 14px;
      line-height: 1.6;
      color: var(--color-text-primary);
      white-space: pre-wrap;
      background: var(--color-bg-primary);
      padding: 12px;
      border-radius: 6px;
    }
  }

  .template-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
}

.empty-state {
  width: 100%;
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
    font-size: 14px;
  }
}

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

    .type-display {
      font-size: 14px;
      color: var(--color-text-secondary);
      padding: 8px 12px;
      background: var(--color-bg-secondary);
      border-radius: 6px;
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  align-items: center;

  .footer-right {
    display: flex;
    gap: 12px;
  }
}

.settings-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  margin: 0 20px 16px 20px;
  background: var(--color-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--color-border);

  .description-icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--color-text-secondary);
  }

  .description-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
}
</style>
