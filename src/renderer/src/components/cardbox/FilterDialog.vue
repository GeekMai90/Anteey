<template>
  <div class="modal-overlay" @click="handleCancel">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ filter ? '编辑筛选规则' : '创建筛选规则' }}</h3>
        <button class="close-button" @click="handleCancel">
          <div class="icon">
            <CloseOne theme="outline" size="20" fill="var(--color-icon-default)" :strokeWidth="3" />
          </div>
        </button>
      </div>

      <div class="dialog-body">
        <form>
          <!-- 名称 -->
          <div class="form-group">
            <label>名称</label>
            <input
              v-model="formData.name"
              class="input-name"
              type="text"
              placeholder="输入筛选规则名称"
            />
          </div>

          <!-- 匹配类型 -->
          <div class="form-group">
            <label>匹配类型</label>
            <div class="radio-group">
              <label class="radio-label">
                <input v-model="formData.matchType" type="radio" value="all" />
                <span>全部匹配 (AND)</span>
              </label>
              <label class="radio-label">
                <input v-model="formData.matchType" type="radio" value="any" />
                <span>任一匹配 (OR)</span>
              </label>
            </div>
          </div>

          <!-- 筛选规则列表 -->
          <div class="form-group">
            <label>规则</label>
            <div class="rules-container">
              <div v-for="(rule, index) in formData.rules" :key="index" class="rule-item">
                <div class="rule-content">
                  <!-- 字段选择 -->
                  <div class="custom-select">
                    <button
                      type="button"
                      class="select-trigger"
                      @click.prevent.stop="toggleDropdown('field', index)"
                    >
                      {{ getFieldLabel(rule.field) }}
                      <div class="arrow-icon"></div>
                    </button>
                    <div
                      v-show="activeDropdown === `field-${index}`"
                      class="select-dropdown"
                      @click.stop
                    >
                      <div
                        v-for="option in fieldOptions"
                        :key="option.value"
                        class="select-option"
                        :class="{ active: rule.field === option.value }"
                        @click="selectField(option.value, index)"
                      >
                        {{ option.label }}
                      </div>
                    </div>
                  </div>

                  <!-- 操作符选择 -->
                  <div class="custom-select">
                    <button
                      type="button"
                      class="select-trigger"
                      @click.prevent.stop="toggleDropdown('operator', index)"
                    >
                      {{ getOperatorLabel(rule.operator) }}
                      <div class="arrow-icon"></div>
                    </button>
                    <div
                      v-show="activeDropdown === `operator-${index}`"
                      class="select-dropdown"
                      @click.stop
                    >
                      <div
                        v-for="op in getOperatorOptions(rule.field)"
                        :key="op.value"
                        class="select-option"
                        :class="{ active: rule.operator === op.value }"
                        @click="selectOperator(op.value, index)"
                      >
                        {{ op.label }}
                      </div>
                    </div>
                  </div>

                  <!-- 值输入/选择 -->
                  <div class="value-input">
                    <input
                      v-if="rule.field === 'keyword'"
                      v-model="rule.value"
                      type="text"
                      :placeholder="getValuePlaceholder(rule.field)"
                    />
                    <div v-else class="custom-select">
                      <button
                        type="button"
                        class="select-trigger"
                        @click.prevent.stop="toggleDropdown('value', index)"
                      >
                        {{ getValueLabel(rule.value, rule.field) }}
                        <div class="arrow-icon"></div>
                      </button>
                      <div
                        v-show="activeDropdown === `value-${index}`"
                        class="select-dropdown"
                        :class="{ 'select-dropdown-multiple': isMultipleValue(rule.field) }"
                        @click.stop
                      >
                        <div
                          v-for="option in getValueOptions(rule.field)"
                          :key="option.value"
                          class="select-option"
                          :class="{ active: isValueSelected(option.value, rule) }"
                          @click="selectValue(option.value, index)"
                        >
                          {{ option.label }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 删除规则按钮 -->
                <button
                  v-if="formData.rules.length > 1"
                  type="button"
                  class="remove-rule-btn"
                  @click="removeRule(index)"
                >
                  <Delete theme="outline" size="16" :strokeWidth="3" />
                </button>
              </div>
            </div>

            <!-- 添加规则按钮 -->
            <button type="button" class="add-rule-btn" @click="addRule">
              <div class="icon">
                <Plus theme="outline" size="16" :strokeWidth="3" />
              </div>
              <div class="name">添加规则</div>
            </button>
          </div>
        </form>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" @click="handleCancel">取消</button>
        <button class="btn-save" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Delete, Plus, CloseOne } from '@icon-park/vue-next'
import type {
  CustomFilter,
  FilterRule,
  FilterField,
  FilterOperator,
  CreateCustomFilterInput,
  UpdateCustomFilterInput
} from '@shared/types'
import { useTagStore } from '@renderer/stores/tagStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'

const props = defineProps<{
  filter: CustomFilter | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
}>()

const tagStore = useTagStore()
const noteStore = useNoteStore()
const saving = ref(false)
const activeDropdown = ref('')

// 字段选项
const fieldOptions = [
  { label: '标签', value: 'tag' },
  { label: '卡片盒', value: 'cardBox' },
  { label: '关键词', value: 'keyword' },
  { label: '卡片类型', value: 'cardType' },
  { label: '闪卡', value: 'isFlashcard' }
]

// 表单数据
const formData = ref({
  name: props.filter?.name || '',
  matchType: props.filter?.matchType || 'all',
  rules: props.filter?.rules.map((rule) => ({
    field: rule.field,
    operator: rule.operator,
    value: rule.value
  })) || [createEmptyRule()]
})

// 创建空规则
function createEmptyRule(): Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    field: 'tag',
    operator: 'contains',
    value: []
  }
}

// 获取字段标签
const getFieldLabel = (field: FilterField) => {
  return fieldOptions.find((option) => option.value === field)?.label || field
}

// 获取操作符标签
const getOperatorLabel = (operator: FilterOperator) => {
  const options = getOperatorOptions(
    formData.value.rules.find((rule) => rule.operator === operator)?.field || 'keyword'
  )
  return options.find((op) => op.value === operator)?.label || operator
}

// 获取值标签
const getValueLabel = (value: any, field: FilterField) => {
  if (field === 'keyword') return value

  const options = getValueOptions(field)
  if (Array.isArray(value)) {
    if (value.length === 0) return getValuePlaceholder(field)
    return value.map((v) => options.find((op) => op.value === v)?.label || v).join(', ')
  }
  return options.find((op) => op.value === value)?.label || getValuePlaceholder(field)
}

// 判断值是否被选中
const isValueSelected = (value: string, rule: any) => {
  if (Array.isArray(rule.value)) {
    return rule.value.includes(value)
  }
  return rule.value === value
}

// 获取操作符选项
const getOperatorOptions = (field: FilterField) => {
  switch (field) {
    case 'tag':
    case 'keyword':
      return [
        { label: '包含', value: 'contains' },
        { label: '不包含', value: 'doesNotContain' }
      ]
    case 'cardBox':
    case 'cardType':
    case 'isFlashcard':
      return [
        { label: '是', value: 'is' },
        { label: '不是', value: 'isNot' }
      ]
    default:
      return []
  }
}

// 获取值选项
const getValueOptions = (field: FilterField) => {
  switch (field) {
    case 'tag':
      return tagStore.tags.map((tag) => ({
        label: tag.name,
        value: tag.id
      }))
    case 'cardBox':
      return noteStore.cardBoxes.map((box) => ({
        label: box.name,
        value: box.id
      }))
    case 'cardType':
      return [
        { label: '主要卡片', value: 'Maincard' },
        { label: '参考卡片', value: 'Bibcard' },
        { label: '索引卡片', value: 'Indexcard' }
      ]
    case 'isFlashcard':
      return [{ label: '闪卡', value: '闪卡' }]
    default:
      return []
  }
}

// 获取值输入提示
const getValuePlaceholder = (field: FilterField) => {
  switch (field) {
    case 'tag':
      return '选择标签'
    case 'cardBox':
      return '选择卡片盒'
    case 'keyword':
      return '输入关键词'
    case 'cardType':
      return '选择卡片类型'
    case 'isFlashcard':
      return '选择是否为闪卡'
    default:
      return '输入值'
  }
}

// 判断是否为多选值
const isMultipleValue = (field: FilterField) => {
  return field === 'tag'
}

// 切换下拉菜单
const toggleDropdown = (type: string, index: number) => {
  const dropdownId = `${type}-${index}`
  activeDropdown.value = activeDropdown.value === dropdownId ? '' : dropdownId
}

// 选择字段
const selectField = (value: string, index: number) => {
  const rule = formData.value.rules[index]
  rule.field = value as FilterField
  rule.operator = getOperatorOptions(rule.field)[0].value as FilterOperator
  rule.value = isMultipleValue(rule.field) ? [] : ''
  activeDropdown.value = ''
}

// 选择操作符
const selectOperator = (value: string, index: number) => {
  formData.value.rules[index].operator = value as FilterOperator
  activeDropdown.value = ''
}

// 选择值
const selectValue = (value: string, index: number) => {
  const rule = formData.value.rules[index]
  if (isMultipleValue(rule.field)) {
    const values = Array.isArray(rule.value) ? rule.value : []
    const valueIndex = values.indexOf(value)
    if (valueIndex === -1) {
      values.push(value)
    } else {
      values.splice(valueIndex, 1)
    }
    rule.value = values
  } else {
    rule.value = value
    activeDropdown.value = ''
  }
}

// 添加规则
const addRule = () => {
  formData.value.rules.push(createEmptyRule())
}

// 删除规则
const removeRule = (index: number) => {
  formData.value.rules.splice(index, 1)
}

// 处理点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-select')) {
    activeDropdown.value = ''
  }
}

// 挂载时添加点击事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

// 卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 取消
const handleCancel = () => {
  emit('close')
}

// 保存
const handleSave = async () => {
  if (!formData.value.name.trim()) {
    message.error('请输入筛选规则名称')
    return
  }

  try {
    saving.value = true
    const saveData: CreateCustomFilterInput | UpdateCustomFilterInput = {
      name: formData.value.name,
      matchType: formData.value.matchType,
      rules: formData.value.rules
    }

    if (props.filter) {
      // 如果是编辑，添加 id
      ;(saveData as UpdateCustomFilterInput).id = props.filter.id
    }

    emit('save', saveData)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
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

.modal-content {
  background: var(--color-bg-primary);
  border-radius: 16px;
  width: 700px;
  min-height: 700px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    user-select: none;
  }

  .close-button {
    position: relative;
    display: flex;
    align-items: center;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 4px;

    &:hover {
      background-color: var(--color-hover-button);
    }
    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;

      // &:hover:not(:disabled) {
      //   background-color: rgba(0, 0, 0, 0.05);
      // }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 18px;
        height: 18px;
      }
    }
  }
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  width: 100%;
}

.form-group {
  margin-bottom: 24px;
  width: 100%;

  label {
    display: block;
    margin-bottom: 8px;
    // color: var(--color-text-secondary);
    font-size: 14px;
  }

  input[type='text'] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    // background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:hover {
      border-color: var(--color-primary);
    }
  }
}

.radio-group {
  display: flex;
  gap: 16px;

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;

    input[type='radio'] {
      -webkit-appearance: none;
      appearance: none;
      margin: 0;
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-border);
      border-radius: 50%;
      transition: all 0.2s ease-in-out;
      position: relative;
      cursor: pointer;

      &:checked {
        border-color: var(--color-primary);
        background-color: var(--color-primary);

        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: white;
        }
      }

      &:hover:not(:checked) {
        border-color: var(--color-primary);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
      }
    }
  }
}

.rules-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.rule-item {
  position: relative;
  // background: var(--color-bg-secondary);
  border-radius: 8px;
  display: flex; // 修改为 flex 布局
  align-items: center; // 垂直居中
  gap: 12px;
  padding: 5px 0px 5px 0px; // 添加内边距
  padding-right: 48px; // 为删除按钮留出空间

  .rule-content {
    flex: 1; // 占据剩余空间
    display: grid;
    grid-template-columns: 150px 150px 1fr;
    gap: 12px;
    align-items: start;
    width: 100%;
  }

  .remove-rule-btn {
    position: absolute;
    right: 12px; // 调整右侧距离
    top: 50%; // 垂直居中
    transform: translateY(-50%); // 垂直居中
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-danger);
    border-radius: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;

    &:hover {
      background: var(--color-hover-bg);
    }

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
  }
}

// 自定义下拉菜单样式
.custom-select {
  position: relative;
  width: 100%;

  .select-trigger {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--color-primary);
    }

    .arrow-icon {
      width: 12px;
      height: 12px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8.825L1.175 4 2.238 2.938 6 6.7l3.763-3.762L10.825 4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      transition: transform 0.2s ease;
    }
  }

  .select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1010;
    max-height: 200px;
    overflow-y: auto;

    &.select-dropdown-multiple {
      max-height: 240px;
    }

    .select-option {
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;

      &:hover {
        background: var(--color-hover-bg);
      }

      &.active {
        background: var(--color-primary);
        color: white;
      }
    }
  }
}

// 值输入框样式
.value-input {
  width: 100%;

  input[type='text'] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    // background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:hover {
      border-color: var(--color-primary);
    }
  }
}

.add-rule-btn {
  display: flex;
  align-items: center;
  border: none;
  border-radius: 8px;
  background: var(--color-bg-primary);
  color: var(--color-primary);
  cursor: pointer;
  font-size: 14px;
  padding: 8px 8px;

  &:hover {
    background: var(--color-hover-bg);
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(---color-text-primary);
    font-size: 14px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }
}

// .dialog-footer {
//   padding: 16px 24px;
//   border-top: 1px solid var(--color-border);
//   display: flex;
//   justify-content: flex-end;
//   gap: 12px;

//   button {
//     padding: 8px 24px;
//     border-radius: 8px;
//     cursor: pointer;
//     border: none;
//     font-size: 14px;
//     font-weight: 500;

//     &.btn-cancel {
//       background: var(--color-bg-secondary);
//       color: var(--color-text-primary);

//       &:hover {
//         opacity: 0.8;
//       }
//     }

//     &.btn-save {
//       background: var(--color-primary);
//       color: white;

//       &:hover:not(:disabled) {
//         opacity: 0.9;
//       }

//       &:disabled {
//         opacity: 0.5;
//         cursor: not-allowed;
//       }
//     }
//   }
// }
.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;

  button {
    padding: 8px 24px;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 80px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.btn-cancel {
      background: transparent;
      color: var(--color-text-primary);
      border: 1px solid var(--color-border);
      &:hover {
        background: var(--color-hover-bg);
        border-color: var(--color-text-secondary);
      }
    }

    &.btn-save {
      background: var(--color-primary);
      color: white;
      &:hover {
        opacity: 0.9;
        box-shadow: 0 4px 12px rgba(0, 170, 140, 0.3);
      }
    }
  }
}
</style>
