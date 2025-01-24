<template>
  <div
    class="calendar-template"
    :style="[cardStyle, { backgroundImage: `url(${backgroundImage})` }]"
  >
    <div class="template-content" :class="{ 'dark-mode': isDarkGradient }">
      <div v-if="config.showDate" class="note-header">
        <div class="note-date">{{ currentDate }}</div>
      </div>
      <div class="content-wrapper">
        <div class="note-content">
          <ShareTipTapRender :content="note.content" :editable="false" />
        </div>
      </div>
      <div v-if="config.showAuthor" class="note-footer">
        <div class="footer-left">
          <div class="footer-author">—— {{ authorName }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import ShareTipTapRender from '@renderer/components/share/ShareTipTapRender.vue'
import { Note } from '@shared/types'
import { computed, onMounted, ref, getCurrentInstance } from 'vue'
import QRCode from 'qrcode'
import { useUserSettingsStore } from '@renderer/stores/userSettingsStore'
import { exportNoteImage, copyNoteToClipboard } from '@renderer/utils/shareViewUtils'
import type { Component } from 'vue'
import backgroundImage from '@renderer/assets/share/calendarBackground.png'

// 固定尺寸常量
const DISPLAY_WIDTH = 514
const DISPLAY_HEIGHT = 860

const props = defineProps<{
  note: Note
  config: {
    width: number
    height: number
    fontSize: number
    padding: number
    radius: number
    gradient: string
    showDate: boolean
    showAuthor: boolean
    showMotto: boolean
    showQrcode: boolean
  }
}>()

// 获取当前组件实例
const instance = getCurrentInstance()
const emit = defineEmits<{
  (e: 'export-success'): void
  (e: 'export-error'): void
  (e: 'copy-success'): void
  (e: 'copy-error'): void
}>()

// 计算样式
const cardStyle = computed(() => {
  const style: Record<string, string> = {
    width: DISPLAY_WIDTH + 'px',
    height: DISPLAY_HEIGHT + 'px',
    background: 'transparent',
    padding: '0'
  }

  return style
})

// const contentStyle = computed(() => ({
//   fontSize: '1em', // 使用固定字体大小
//   width: '60%', // 控制内容区域宽度
//   margin: '0 auto' // 水平居中
// }))

const userSettingsStore = useUserSettingsStore()
const currentDate = format(new Date(), 'yyyy.MM.dd')
const qrCodeUrl = ref('')

// 从 store 中获取用户设置
const authorName = computed(() => userSettingsStore.settings?.authorName || 'Antinet')

// 二维码更新逻辑
const updateQRCode = async () => {
  try {
    const customUrl = userSettingsStore.settings?.qrcodeUrl
    if (customUrl && customUrl.trim() !== '') {
      if (customUrl.match(/^https?:\/\//)) {
        qrCodeUrl.value = await QRCode.toDataURL(customUrl, {
          width: 64,
          margin: 1,
          color: {
            dark: '#333333',
            light: '#FFFFFF'
          }
        })
      } else if (customUrl.startsWith('data:image')) {
        qrCodeUrl.value = customUrl
      } else {
        qrCodeUrl.value = ''
      }
    } else {
      qrCodeUrl.value = ''
    }
  } catch (err) {
    console.error('二维码处理错误:', err)
    qrCodeUrl.value = ''
  }
}

onMounted(async () => {
  if (!userSettingsStore.settings) {
    await userSettingsStore.fetchSettings()
  }
  await updateQRCode()
})

// 导出方法
const exportImage = async () => {
  if (!instance?.type) return

  try {
    await exportNoteImage({
      note: props.note,
      component: instance.type as Component,
      config: {
        ...props.config,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT
      }
    })
    emit('export-success')
  } catch (error) {
    console.error('导出失败:', error)
    emit('export-error')
  }
}

// 复制方法
const copyToClipboard = async () => {
  if (!instance?.type) return

  try {
    await copyNoteToClipboard({
      note: props.note,
      component: instance.type as Component,
      config: {
        ...props.config,
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT
      }
    })
    emit('copy-success')
  } catch (error) {
    console.error('复制失败:', error)
    emit('copy-error')
  }
}

// 暴露方法给父组件
defineExpose({
  exportImage,
  copyToClipboard
})

// 判断是否是深色渐变
const isDarkGradient = computed(() => {
  const gradient = props.config.gradient.toLowerCase()
  return (
    // 原有的深色系列
    gradient.includes('rgb(49, 13, 206)') || // dark-1
    gradient.includes('rgb(197, 17, 41)') || // dark-2
    gradient.includes('rgb(243, 32, 46)') || // dark-3
    gradient.includes('rgb(22, 25, 223)') || // dark-4
    gradient.includes('rgb(2, 40, 227)') || // dark-5
    // 新增的深色系列
    gradient.includes('#0f172a') || // dark-6, dark-9
    gradient.includes('#1e293b') || // dark-7
    gradient.includes('#18181b') || // dark-8
    gradient.includes('#1e1b4b') // dark-10
  )
})
</script>

<style lang="scss" scoped>
.calendar-template {
  overflow: hidden;
  position: relative;
  background-size: cover; // 确保背景图填充整个容器
  background-position: center;
  background-repeat: no-repeat;
}

.editor-wrapper {
  background-color: transparent;
}

:deep(.tiptap) {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  background-color: transparent !important;
  font-size: 1.2em;
  font-family: 'Noto Serif SC', serif;

  blockquote {
    border-left: none !important;
    background-color: transparent !important;
    color: var(--color-text-primary) !important;
  }

  ul[data-type='taskList'] {
    list-style: none;
    margin-left: 0;
    padding: 0;

    li {
      align-items: flex-start;
      display: flex;

      > label {
        display: inline-flex;
        align-items: center;
        margin-right: 0.5rem;
        user-select: none;
      }

      > div {
        flex: 1 1 auto;
        margin-top: 0;
      }
    }

    // 自定义复选框样式
    input[type='checkbox'] {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      width: 1em;
      height: 1em;
      border: 2px solid var(--color-border);
      border-radius: 50%;
      outline: none;
      cursor: pointer;
      position: relative;
      transition: all 0.3s ease;
      margin: 3.5px 0;
      flex-shrink: 0;
      background: transparent;

      &:hover {
        border-color: var(--color-primary);
      }

      &:checked {
        border-color: var(--color-primary);
        background: var(--color-primary);
        animation: splash 0.6s ease forwards;

        &::after {
          content: '\2713';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.7em;
          font-weight: 900;
          color: #fff;
          line-height: 1;
        }
      }
    }

    ul[data-type='taskList'] {
      margin: 0;
    }
  }

  pre {
    margin: 0;
    background: var(--color-code-block-bg) !important; // GitHub Dark style
    color: var(--color-code-text) !important; // 确保基础文本颜色设置在这里

    code {
      font-family: var(--font-mono);
      color: var(--color-code-text) !important;
      font-size: 0.9em;
      background: none !important;
    }
  }

  p {
    font-family: 'Noto Serif SC', serif;
    font-weight: bold;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: 'Noto Serif SC', serif;
  }
}

.template-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: 40px; // 给内容添加一些内边距
  color: #252525;
  transition: all 0.3s ease;

  .content-wrapper {
    flex: 1;
    display: flex;
    // align-items: center;
    justify-content: center;
    padding: 0; // 重置内边距
    margin-top: 200px;
  }

  .note-content {
    // margin-top: 200px;
    // text-align: center;
    font-size: 1em;
    line-height: 1.8;
    padding: 0 40px;
    font-family: 'Noto Serif SC', serif;
  }

  .note-date {
    font-size: 16px;
    color: #4a5568;
    font-weight: 500;
    position: absolute;
    top: 190px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 24px;
    font-weight: bold;
    color: #2a2a2a; // 调整日期颜色
  }

  .note-footer {
    border-top: none;
    justify-content: flex-end;
    position: absolute;
    bottom: 130px;
    right: 95px;
  }

  .footer-author {
    font-size: 20px;
    color: #2a2a2a;
  }

  // 深色模式样式
  &.dark-mode {
    background: transparent;

    .note-date,
    .footer-author {
      color: #4a5568;
    }

    :deep(.tiptap) {
      color: #2d3748 !important;

      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      strong {
        color: #2d3748 !important;
      }

      p {
        color: #2d3748;
      }
    }
  }
}

.note-header {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.footer-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.footer-qrcode {
  width: 46px;
  height: 46px;
  margin-left: 16px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}
</style>
