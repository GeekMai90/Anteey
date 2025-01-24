<template>
  <div class="transparent-template" :style="cardStyle">
    <div class="gradient-background"></div>
    <div class="template-content" :class="{ 'dark-mode': isDarkGradient }">
      <div v-if="config.showDate" class="note-header">
        <div class="note-date">{{ currentDate }}</div>
      </div>
      <div class="content-wrapper">
        <div class="note-content" :style="contentStyle">
          <ShareTipTapRender :content="note.content" :editable="false" />
        </div>
      </div>
      <div v-if="config.showAuthor || config.showMotto || config.showQrcode" class="note-footer">
        <div class="footer-left">
          <template v-if="config.showAuthor || config.showMotto">
            <div v-if="config.showAuthor" class="footer-author">{{ authorName }}</div>
            <div v-if="config.showMotto" class="footer-motto">{{ authorMotto }}</div>
          </template>
        </div>
        <div v-if="config.showQrcode && customQrcodeUrl" class="footer-qrcode">
          <img :src="qrCodeUrl" alt="专栏二维码" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { computed, onMounted, ref, getCurrentInstance } from 'vue'
import QRCode from 'qrcode'
import { useUserSettingsStore } from '@renderer/stores/userSettingsStore'
import { exportNoteImage, copyNoteToClipboard } from '@renderer/utils/shareViewUtils'
import type { Component } from 'vue'
import { Note } from '@shared/types'
import ShareTipTapRender from '@renderer/components/share/ShareTipTapRender.vue'

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
    width: `${props.config.width}px`,
    background: 'transparent',
    padding: `${props.config.padding}px`
  }

  if (props.config.height > 0) {
    style.height = `${props.config.height}px`
  }

  return style
})

const contentStyle = computed(() => ({
  fontSize: `${props.config.fontSize}em`
}))

const userSettingsStore = useUserSettingsStore()
const currentDate = format(new Date(), 'yyyy年MM月dd日')
const qrCodeUrl = ref('')

// 从 store 中获取用户设置
const authorName = computed(() => userSettingsStore.settings?.authorName || 'Antinet')
const authorMotto = computed(() => userSettingsStore.settings?.authorMotto || '一起践行终身成长')
const customQrcodeUrl = computed(() => userSettingsStore.settings?.qrcodeUrl || '')

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

// 导出方法
const exportImage = async () => {
  if (!instance?.type) return

  try {
    await exportNoteImage({
      note: props.note,
      component: instance.type as Component,
      config: props.config
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
      config: props.config
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
</script>

<style lang="scss" scoped>
.transparent-template {
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  padding: 16px;
  background: transparent;
}

.gradient-background {
  position: absolute;
  inset: 0;
  background: v-bind('config.gradient');
  opacity: 0.8;
}

.editor-wrapper {
  background: transparent !important;
}

:deep(.tiptap) {
  padding-left: 0.5rem;
  padding-right: 0.5rem;

  code {
    background: #f8f8f8c8 !important;
  }

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
}

.template-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  // 毛玻璃效果
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: v-bind('config.radius + "px"');
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  color: #252525;
  transition: all 0.3s ease;

  :deep(.tiptap) {
    background: transparent !important;
  }

  // 深色模式样式
  &.dark-mode {
    background: rgba(26, 26, 26, 0.7); // 深色半透明背景
    color: white;

    .note-date {
      color: rgba(255, 255, 255, 0.6);
    }

    .footer-author {
      color: white;
    }

    .footer-motto {
      color: rgba(255, 255, 255, 0.6);
    }

    .note-footer {
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    :deep(.tiptap) {
      color: var(--color-share-text-white) !important;
      background: transparent !important;

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        color: var(--color-share-text-white) !important;
      }

      strong {
        color: var(--color-share-text-white) !important;
      }

      p {
        color: rgba(255, 255, 255, 0.9);
      }

      blockquote {
        border-left-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
      }
    }
  }
}

// 复用其他样式
.note-header {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.note-date {
  font-size: 12px;
  color: #949494;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.note-content {
  height: 100%;
  overflow: hidden;
}

.note-footer {
  flex-shrink: 0;
  padding-top: 16px;
  margin-top: 24px;
  border-top: 1px solid rgba(222, 222, 222, 0.599);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.footer-author {
  font-size: 16px;
  color: #252525;
  font-weight: 500;
}

.footer-motto {
  font-size: 14px;
  color: #949494;
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
