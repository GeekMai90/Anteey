<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <!-- 顶部标题栏 -->
      <div class="modal-header">
        <div class="header-title">分享笔记</div>
        <button class="close-button" @click="handleClose">
          <div class="icon">
            <CloseOne
              theme="outline"
              size="20"
              fill="var(--color-icon-default)"
              :stroke-width="3"
            />
          </div>
        </button>
      </div>

      <div class="main-container">
        <!-- 左侧模板导航栏 -->
        <div class="template-sidebar">
          <h3 class="sidebar-title">模板</h3>
          <div class="template-group">
            <div class="group-title">长文模板</div>
            <div class="template-grid">
              <div
                v-for="template in longTemplates"
                :key="template.id"
                class="template-item"
                :class="{ active: currentTemplateId === template.id }"
                @click="switchTemplate(template.id)"
              >
                <div class="template-icon">
                  <img :src="template.icon" :alt="template.name" />
                </div>
                <span class="template-name">{{ template.name }}</span>
              </div>
            </div>
          </div>
          <div class="template-group">
            <div class="group-title">短句模板</div>
            <div class="template-grid">
              <div
                v-for="template in shortTemplates"
                :key="template.id"
                class="template-item"
                :class="{ active: currentTemplateId === template.id }"
                @click="switchTemplate(template.id)"
              >
                <div class="template-icon">
                  <img :src="template.icon" :alt="template.name" />
                </div>
                <span class="template-name">{{ template.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间预览区域 -->
        <div class="preview-area">
          <div class="preview-wrapper">
            <component
              :is="currentTemplate"
              ref="templateRef"
              :note="note"
              :config="config"
              @export-success="onExportSuccess"
              @export-error="onExportError"
              @copy-success="onCopySuccess"
              @copy-error="onCopyError"
            />
          </div>
        </div>

        <!-- 右侧属性面板 -->
        <div class="properties-panel">
          <!-- 添加标签页切换 -->
          <div class="panel-tabs">
            <button
              class="tab-btn"
              :class="{ active: currentTab === 'property' }"
              @click="currentTab = 'property'"
            >
              属性设置
            </button>
            <button
              class="tab-btn"
              :class="{ active: currentTab === 'display' }"
              @click="currentTab = 'display'"
            >
              显示设置
            </button>
          </div>

          <!-- 属性设置内容 -->
          <div v-show="currentTab === 'property'" class="properties-content">
            <div class="property-section">
              <h4>尺寸</h4>
              <div class="size-controls">
                <SizeInput v-model="config.width" label="W" @update:modelValue="onWidthChange" />
                <SizeInput v-model="config.height" label="H" @update:modelValue="onHeightChange" />
                <button
                  class="lock-ratio-btn"
                  :class="{ active: lockRatio }"
                  @click="toggleLockRatio"
                >
                  <div class="icon">
                    <component :is="lockRatio ? Lock : Unlock" fill="var(--color-icon-default)" />
                  </div>
                </button>
              </div>

              <!-- 添加尺寸比例选择 -->
              <div class="ratio-selector">
                <button
                  v-for="ratio in ratioPresets"
                  :key="ratio.id"
                  class="ratio-btn"
                  :class="{ active: currentRatio === ratio.id }"
                  @click="applyRatio(ratio)"
                >
                  {{ ratio.name }}
                </button>
              </div>
            </div>

            <div class="property-section">
              <h4>样式</h4>
              <div class="property-item">
                <label>内边距</label>
                <div class="size-control">
                  <button class="minus-button" @click="adjustPadding(-1)">
                    <div class="icon">
                      <Minus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                  <span>{{ config.padding }}</span>
                  <button class="plus-button" @click="adjustPadding(1)">
                    <div class="icon">
                      <Plus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                </div>
              </div>
              <div class="property-item">
                <label>圆角半径</label>
                <div class="size-control">
                  <button class="minus-button" @click="adjustRadius(-1)">
                    <div class="icon">
                      <Minus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                  <span>{{ config.radius }}</span>
                  <button class="plus-button" @click="adjustRadius(1)">
                    <div class="icon">
                      <Plus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                </div>
              </div>
              <div class="property-item">
                <label>字体大小</label>
                <div class="size-control">
                  <button class="minus-button" @click="adjustFontSize(-0.1)">
                    <div class="icon">
                      <Minus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                  <span>{{ config.fontSize }}</span>
                  <button class="plus-button" @click="adjustFontSize(0.1)">
                    <div class="icon">
                      <Plus
                        theme="outline"
                        size="20"
                        fill="var(--color-icon-default)"
                        :stroke-width="3"
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 背景设置区域 -->
            <div class="property-section">
              <h4>背景</h4>
              <!-- 浅色渐变预设 -->
              <div class="gradient-group">
                <div class="gradient-group-title">浅色系列</div>
                <div class="gradient-list">
                  <button
                    v-for="(gradient, index) in lightGradients"
                    :key="'light-' + index"
                    class="gradient-item"
                    :class="{ active: currentGradient === gradient.id }"
                    :style="{ background: gradient.value }"
                    @click="selectGradient(gradient.id)"
                  />
                </div>
              </div>

              <!-- 深色系列 -->
              <div class="gradient-group">
                <div class="gradient-group-title">深色系列</div>
                <div class="gradient-list">
                  <button
                    v-for="(gradient, index) in darkGradients"
                    :key="'dark-' + index"
                    class="gradient-item"
                    :class="{ active: currentGradient === gradient.id }"
                    :style="{ background: gradient.value }"
                    @click="selectGradient(gradient.id)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 显示设置内容 -->
          <div v-show="currentTab === 'display'" class="properties-content">
            <div class="property-section">
              <h4>显示元素</h4>
              <div class="property-item">
                <label>显示日期</label>
                <Switch v-model="config.showDate" />
              </div>
              <div class="property-item">
                <label>显示作者</label>
                <Switch v-model="config.showAuthor" />
              </div>
              <div class="property-item">
                <label>显示座右铭</label>
                <Switch v-model="config.showMotto" />
              </div>
              <div class="property-item">
                <label>显示二维码</label>
                <Switch v-model="config.showQrcode" />
              </div>
            </div>
          </div>

          <!-- 底部操作按钮 -->
          <div class="panel-footer">
            <button class="action-btn" @click="handleCopy">复制</button>
            <button class="action-btn primary" @click="handleExport">导出</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { CloseOne, Lock, Unlock, Minus, Plus } from '@icon-park/vue-next'
import DefaultTemplate from './templates/DefaultTemplate.vue'
import TransparentTemplate from './templates/TransparentTemplate.vue'
import CalendarTemplate from './templates/CalendarTemplate.vue'
import ChalkTemplate from './templates/ChalkTemplate.vue'
import BookTemplate from './templates/BookTemplate.vue'
import QuoteTemplate from './templates/QuoteTemplate.vue'
import SmartisanTemplate from './templates/SmartisanTemplate.vue'
import defaultIcon from '@renderer/assets/share/default.png'
import transparentIcon from '@renderer/assets/share/transparent.png'
import calendarIcon from '@renderer/assets/share/calendar.png'
import chalkIcon from '@renderer/assets/share/chalk.png'
import quoteIcon from '@renderer/assets/share/quote.png'
import bookIcon from '@renderer/assets/share/book.png'
import smartisanIcon from '@renderer/assets/share/smartisan.png'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'
import SizeInput from './SizeInput.vue'
import Switch from '@renderer/components/ui/switch/Switch.vue'

// 从 store 获取笔记内容
const noteStore = useNoteStore()
const note = computed(() => noteStore.shareViewNote)

// 浅色渐变预设
const lightGradients = [
  { id: 'light-1', value: 'linear-gradient(180deg, rgb(158, 203, 255), rgb(158, 247, 255))' },
  { id: 'light-2', value: ' linear-gradient(90deg, rgb(189, 226, 255), rgb(204, 199, 255))' },
  { id: 'light-3', value: 'linear-gradient(135deg, #7ec2ff 0%, #73e7d1 100%)' },
  { id: 'light-4', value: 'linear-gradient(45deg, rgb(163, 255, 255), rgb(255, 173, 245))' },
  { id: 'light-5', value: 'linear-gradient(135deg, rgb(173, 222, 255), rgb(212, 153, 255))' },
  { id: 'light-6', value: 'linear-gradient(180deg, rgb(168, 183, 255), rgb(199, 168, 255))' },
  { id: 'light-7', value: 'linear-gradient(0deg, rgb(248, 255, 199), rgb(204, 255, 218))' },
  { id: 'light-8', value: 'linear-gradient(45deg, rgb(204, 255, 220), rgb(255, 211, 173))' },
  { id: 'light-9', value: 'linear-gradient(45deg, rgb(255, 245, 153), rgb(186, 158, 255))' },
  { id: 'light-10', value: 'linear-gradient(135deg, rgb(255, 138, 230), rgb(251, 142, 155))' }
]

// 深色渐变预设
const darkGradients = [
  // 原有的深色系列
  { id: 'dark-1', value: 'linear-gradient(45deg, rgb(49, 13, 206), rgb(246, 19, 19))' },
  { id: 'dark-2', value: 'linear-gradient(45deg, rgb(197, 17, 41), rgb(22, 3, 226))' },
  { id: 'dark-3', value: 'linear-gradient(180deg, rgb(243, 32, 46), rgb(4, 19, 220))' },
  { id: 'dark-4', value: 'linear-gradient(45deg, rgb(22, 25, 223), rgb(155, 21, 244))' },
  { id: 'dark-5', value: 'linear-gradient(135deg, rgb(2, 40, 227), rgb(240, 36, 209))' },

  // 新增的深色系列
  { id: 'dark-6', value: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)' },
  { id: 'dark-7', value: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' },
  { id: 'dark-8', value: 'linear-gradient(135deg, #18181B 0%, #27272A 100%)' },
  { id: 'dark-9', value: 'linear-gradient(135deg, #0F172A 0%, #064E3B 100%)' },
  { id: 'dark-10', value: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)' }
]

// 状态
const currentTemplateId = ref('default')
const config = ref({
  width: 400,
  height: 0,
  fontSize: 1,
  padding: 20,
  radius: 12,
  gradient: lightGradients[0].value, // 默认使用第一个浅色渐变
  showDate: true,
  showAuthor: true,
  showMotto: true,
  showQrcode: true
})

const currentRatio = ref('auto') // 默认为 auto
const lockRatio = ref(false) // 默认不锁定比例
const aspectRatio = ref(1)

// 模板数据
const templates = [
  {
    id: 'default',
    name: '默认',
    icon: defaultIcon,
    component: DefaultTemplate,
    type: 'long'
  },
  {
    id: 'transparent',
    name: '毛玻璃',
    icon: transparentIcon,
    component: TransparentTemplate,
    type: 'long'
  },
  {
    id: 'smartisan',
    name: '便签',
    icon: smartisanIcon,
    component: SmartisanTemplate,
    type: 'long'
  },
  {
    id: 'calendar',
    name: '日历',
    icon: calendarIcon,
    component: CalendarTemplate,
    type: 'short'
  },
  {
    id: 'chalk',
    name: '粉笔',
    icon: chalkIcon,
    component: ChalkTemplate,
    type: 'short'
  },
  {
    id: 'book',
    name: '书摘',
    icon: bookIcon,
    component: BookTemplate,
    type: 'short'
  },
  {
    id: 'quote',
    name: '金句',
    icon: quoteIcon,
    component: QuoteTemplate,
    type: 'short'
  }
]

// 分类模板
const longTemplates = computed(() => templates.filter((t) => t.type === 'long'))
const shortTemplates = computed(() => templates.filter((t) => t.type === 'short'))

// 当前选中的模板组件
const currentTemplate = computed(() => {
  const template = templates.find((t) => t.id === currentTemplateId.value)
  return template?.component || DefaultTemplate
})

// 组件挂载时获取初始高度
onMounted(() => {
  // 确保是 Auto 模式
  currentRatio.value = 'auto'
  lockRatio.value = false

  // 延迟一帧等待内容渲染
  requestAnimationFrame(() => {
    if (templateRef.value?.$el) {
      const element = templateRef.value.$el
      const contentHeight = element.scrollHeight
      config.value.height = contentHeight
    }
  })
})

// 修改计算实际高度的方法
const updateHeight = () => {
  if (!templateRef.value?.$el) return

  // 先重置高度，触发重排
  config.value.height = 0

  // 等待 DOM 更新
  nextTick(() => {
    // 使用 requestAnimationFrame 确保在下一帧渲染时计算
    requestAnimationFrame(() => {
      const element = templateRef.value.$el
      if (element) {
        config.value.height = element.scrollHeight
      }
    })
  })
}

// 监听所有会影响高度的属性
watch(
  [() => config.value.width, () => config.value.fontSize, () => currentTemplateId.value],
  () => {
    if (currentRatio.value === 'auto' && !lockRatio.value) {
      updateHeight()
    }
  },
  { flush: 'post' }
)

// 监听宽度变化，自动调整高度
watch(
  () => config.value.width,
  () => {
    if (lockRatio.value) return // 如果锁定比例，不自动调整高度
    // 延迟一帧等待内容重排
    requestAnimationFrame(() => {
      updateHeight()
    })
  }
)

// 监听模板切换
watch(
  () => currentTemplateId.value,
  () => {
    if (lockRatio.value) return
    updateHeight()
  }
)

// 修改宽度变化处理
const onWidthChange = (width: number) => {
  if (width < 300) return
  config.value.width = width

  if (lockRatio.value && config.value.height) {
    config.value.height = Math.round(width / aspectRatio.value)
  }
}

// 修改高度变化处理
const onHeightChange = (height: number) => {
  if (height < 300) return
  config.value.height = height

  if (lockRatio.value && config.value.width) {
    config.value.width = Math.round(height * aspectRatio.value)
  }
}

// 基础方法
const switchTemplate = (templateId: string) => {
  currentTemplateId.value = templateId
}

// 修改调整内边距的方法
const adjustPadding = (delta: number) => {
  const newPadding = config.value.padding + delta
  if (newPadding >= 0 && newPadding <= 48) {
    config.value.padding = newPadding
    // 手动触发一次高度更新
    if (currentRatio.value === 'auto' && !lockRatio.value) {
      updateHeight()
    }
  }
}

// 修改调整字体大小的方法
const adjustFontSize = (delta: number) => {
  const newSize = Number((config.value.fontSize + delta).toFixed(1))
  if (newSize >= 0.5 && newSize <= 2) {
    config.value.fontSize = newSize
  }
}

const adjustRadius = (delta: number) => {
  const newRadius = config.value.radius + delta
  if (newRadius >= 0 && newRadius <= 24) {
    config.value.radius = newRadius
  }
}

const templateRef = ref()

// 操作方法
const handleCopy = async () => {
  if (!note.value || !templateRef.value) return
  templateRef.value.copyToClipboard()
}

const handleExport = async () => {
  if (!note.value || !templateRef.value) return
  templateRef.value.exportImage()
}

// 事件处理
const onExportSuccess = () => {
  message.success('导出成功')
}

const onExportError = () => {
  message.error('导出失败')
}

const onCopySuccess = () => {
  message.success('已复制到剪贴板')
}

const onCopyError = () => {
  message.error('复制失败')
}

// 关闭时清理状态
const handleClose = () => {
  noteStore.shareViewNote = null
  noteStore.showShareViewModal = false
}

// 尺寸比例预设
const ratioPresets = [
  { id: 'auto', name: 'Auto', ratio: null },
  { id: '1:1', name: '正方形 (1:1)', ratio: 1 },
  { id: '3:4', name: '小红书 (3:4)', ratio: 3 / 4 },
  { id: '4:3', name: 'Instagram (4:3)', ratio: 4 / 3 },
  { id: '9:16', name: '抖音 (9:16)', ratio: 9 / 16 },
  { id: '12:16', name: '微博 (12:16)', ratio: 12 / 16 }
]

// 修改 Auto 模式的处理
const applyRatio = (preset: (typeof ratioPresets)[0]) => {
  currentRatio.value = preset.id

  if (preset.ratio === null) {
    // Auto 模式
    lockRatio.value = false
    updateHeight() // 直接调用更新高度
    return
  }

  // 锁定比例
  lockRatio.value = true
  aspectRatio.value = preset.ratio

  // 保持当前宽度，调整高度
  const newHeight = Math.round(config.value.width / preset.ratio)
  config.value.height = newHeight
}

// 修改现有的 toggleLockRatio 方法
const toggleLockRatio = () => {
  lockRatio.value = !lockRatio.value
  if (lockRatio.value && config.value.height) {
    aspectRatio.value = config.value.width / config.value.height
    // 设置为自定义比例
    currentRatio.value = 'custom'
  } else {
    // 解除锁定时恢复自动模式
    currentRatio.value = 'auto'
    nextTick(() => {
      const element = templateRef.value?.$el
      if (element) {
        config.value.height = element.scrollHeight
      }
    })
  }
}

const currentGradient = ref(lightGradients[0].id)

// 选择渐变背景
const selectGradient = (id: string) => {
  currentGradient.value = id
  const gradient = [...lightGradients, ...darkGradients].find((g) => g.id === id)
  if (gradient) {
    config.value.gradient = gradient.value
  }
}

// 添加标签页状态
const currentTab = ref('property')

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 90vw; // 设置固定宽度
  height: 90vh; // 设置固定高度
  background: var(--color-bg-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.modal-header {
  height: 48px;
  padding: 0 16px;
  display: flex;
  justify-content: center; // 居中标题
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  position: relative; // 用于定位关闭按钮
}

.header-title {
  font-size: 16px;
  font-weight: 500;
}

.close-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;

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

  &:hover {
    background: var(--color-hover-bg);
  }
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.template-sidebar {
  width: 280px;
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-title {
  padding: 16px;
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: center;
}

.template-group {
  margin-bottom: 24px;
  padding-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .group-title {
    padding: 0 16px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 12px;
}

.template-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;

  &.active {
    background: var(--color-hover-bg);
  }
  &:hover {
    background: var(--color-hover-bg);
  }

  .template-icon {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    margin-bottom: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .template-name {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.preview-area {
  flex: 1;
  padding: 24px;
  background: var(--color-bg-preview);
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: top; // 改为顶部对齐
}

.preview-wrapper {
  height: fit-content;
  padding: 24px;
}

.properties-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border);
}

.panel-tabs {
  padding: 12px 16px;
  // border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  height: 32px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  background: none;
  cursor: pointer;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    background: var(--color-primary);
    color: white;
  }
}

.properties-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.property-section {
  margin-bottom: 24px;

  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
  }
}

.property-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  label {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.size-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.size-inputs {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.lock-ratio-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  cursor: pointer;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
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
      width: 14px;
      height: 14px;
      display: block;
      line-height: 1;
    }
  }
}

.size-control {
  display: flex;
  align-items: center;
  gap: 8px;

  .minus-button,
  .plus-button {
    width: 20px;
    height: 20px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 16px;
    line-height: 1;

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
        width: 14px;
        height: 14px;
      }
    }

    &:hover {
      background: var(--color-hover-bg);
    }

    &:active {
      background: var(--color-active-bg);
    }
  }

  span {
    min-width: 32px;
    text-align: center;
    font-size: 13px;
    line-height: 24px;
    color: var(--color-text);
    user-select: none;
  }
}

.panel-footer {
  padding: 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 12px;

  .action-btn {
    flex: 1;
    height: 36px;
    border-radius: 6px;
    font-size: 14px;
    border: 1px solid var(--color-border);
    background: none;
    cursor: pointer;

    &:hover {
      background: var(--color-hover-bg);
    }

    &.primary {
      background: var(--color-primary);
      color: white;
      border: none;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}

.ratio-selector {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ratio-btn {
  flex: 1;
  min-width: 80px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: none;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: var(--color-hover-bg);
  }

  &.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
}

.gradient-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.gradient-group-title {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.gradient-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.gradient-item {
  width: 100%;
  aspect-ratio: 1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid transparent;
    border-radius: inherit;
    transition: border-color 0.2s;
  }

  &:hover::after {
    border-color: var(--color-border);
  }

  &.active::after {
    border-color: var(--color-primary);
    border-width: 2px;
  }
}
</style>
