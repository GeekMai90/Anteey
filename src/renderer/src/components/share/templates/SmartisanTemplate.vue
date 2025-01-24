<template>
  <div class="smartisan-template" :style="cardStyle">
    <div class="template-content" :class="{ 'dark-mode': isDarkGradient }">
      <div class="border-decoration-top-left">
        <div class="corner"></div>
      </div>
      <div class="border-decoration-top-right">
        <div class="corner"></div>
      </div>
      <div class="border-decoration-bottom-left">
        <div class="corner"></div>
      </div>
      <div class="border-decoration-bottom-right">
        <div class="corner"></div>
      </div>
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
import ShareTipTapRender from '@renderer/components/share/ShareTipTapRender.vue'
import { Note } from '@shared/types'
import { computed, onMounted, ref, getCurrentInstance } from 'vue'
import QRCode from 'qrcode'
import { useUserSettingsStore } from '@renderer/stores/userSettingsStore'
import { exportNoteImage, copyNoteToClipboard } from '@renderer/utils/shareViewUtils'
import type { Component } from 'vue'

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

  // 只有在高度不为 0 时才设置固定高度
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
.smartisan-template {
  overflow: hidden;
  position: relative;
  padding: 30px 20px !important;
  background: #fefcf6 !important;
  font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

.border-decoration-top-left {
  position: absolute;
  top: -6px;
  left: -2px;
  pointer-events: none;

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 4px;
    border: 1px solid rgba(99, 88, 73, 0.15);
  }
}
.border-decoration-top-right {
  position: absolute;
  top: -6px;
  right: -6px;
  pointer-events: none;

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 4px;
    border: 1px solid rgba(99, 88, 73, 0.15);
  }
}
.border-decoration-bottom-left {
  position: absolute;
  bottom: -2px;
  left: -2px;
  pointer-events: none;

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 4px;
    border: 1px solid rgba(99, 88, 73, 0.15);
  }
}
.border-decoration-bottom-right {
  position: absolute;
  bottom: -2px;
  right: -6px;
  pointer-events: none;

  .corner {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 4px;
    border: 1px solid rgba(99, 88, 73, 0.15);
  }
}

.template-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fefcf6;
  padding: 10px 20px;
  color: #333333;
  transition: all 0.3s ease;
  border: 1px solid rgba(99, 88, 73, 0.15);
  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border: 1px solid rgba(99, 88, 73, 0.15);
  }

  // 深色模式#61544A
  &.dark-mode {
    background: #1a1a1a;
    color: white;

    &::before,
    &::after {
      border-color: rgba(255, 255, 255, 0.1);
    }

    .border-decoration .corner {
      border-color: rgba(255, 255, 255, 0.1);
    }

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
      color: rgba(255, 255, 255, 0.9) !important;
    }
  }
}

.note-header {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 6px;
}

.note-date {
  font-size: 14px;
  color: #61544a;
}

.content-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  // 最外层边框
  // &::before {
  //   content: '';
  //   position: absolute;
  //   inset: -12px;
  //   border: 1px solid rgba(0, 0, 0, 0.08);
  // }

  // 内层双线边框
  // &::after {
  //   content: '';
  //   position: absolute;
  //   inset: -6px;
  //   border-width: 1px 1px;
  //   border-style: solid;
  //   border-color: rgba(0, 0, 0, 0.08);
  // }
}

:deep(.editor-wrapper) {
  background-color: transparent !important;
}

.note-content {
  height: 100%;
  overflow: hidden;

  :deep(.tiptap) {
    font-size: 16px;
    line-height: 1.5;
    color: #61544a;
    letter-spacing: 0.02em;
    background-color: transparent !important;
    padding-left: 0px !important;
    padding-right: 0px !important;

    p {
      margin: 0 0 1em;

      &:last-child {
        margin-bottom: 0;
      }
    }

    ul li::before {
      background-color: #cfb489 !important;
      border-color: #cfb489 !important;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 0.5em 0 0.5em;
      font-weight: 600;
      line-height: 1.4;
      color: #61544a;
    }

    strong {
      color: #61544a;
    }
    ul {
      padding: 0 1rem;
      margin: 0.5rem 0 1rem 10px;

      li p {
        margin-top: 0.25em;
        margin-bottom: 0.25em;
      }
    }

    ol {
      padding: 0 1rem;
      margin: 0.5rem 0 1rem 10px;

      li p {
        margin-top: 0.25em;
        margin-bottom: 0.25em;
        margin-left: 10px;
      }
    }
    // 无序列表标记
    ul {
      li {
        &::marker {
          color: #61544a !important;
        }
      }
    }

    // 有序列表标记
    ol {
      li {
        &::marker {
          color: #61544a !important;
        }
      }
    }

    ul[data-type='taskList'] {
      list-style: none;
      margin-left: 0;
      padding: 0;
      line-height: 1;

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
        border: 1px solid var(--color-border);
        border-radius: 20%;
        outline: none;
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;
        margin: 3.5px 0;
        flex-shrink: 0;
        background: transparent;

        &:hover {
          border-color: #cfb489 !important;
        }

        &:checked {
          border-color: #cfb489 !important;
          background: #fcf0c8 !important;
          animation: splash 0.6s ease forwards;

          &::after {
            content: '\2713';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.7em;
            font-weight: 900;
            color: #b16a19 !important;
            line-height: 1;
          }
        }
      }

      // ul[data-type='taskList'] {
      //   margin: 0;
      // }
    }

    blockquote {
      position: relative;
      margin: 1.5rem 0;
      padding: 0.5em 1rem 0.5em 1rem;
      border-left: none;
      background-color: transparent !important;
    }

    /* 清除原来竖线的样式 */
    blockquote::before {
      content: '"';
      font-family: Arial, sans-serif;
      font-size: 2em;
      position: absolute;
      left: 0rem;
      top: 35%;
      transform: translateY(-50%);
      color: #61544a83;
      background: none; /* 清除原来的背景色 */
      width: auto; /* 清除原来的宽度设置 */
      border-radius: 0; /* 清除原来的圆角 */
    }

    pre {
      margin: 1em 0;
      padding: 16px;
      background: var(--color-code-block-bg) !important;
      border-radius: 4px;
      overflow-x: auto;

      code {
        font-size: 14px;
        line-height: 1.6;
        background: none !important;
      }
    }
    code {
      color: #61544a !important;
    }
  }
}

.note-footer {
  flex-shrink: 0;
  padding-top: 24px;
  margin-top: 40px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.footer-author {
  font-size: 16px;
  color: #61544a;
  font-weight: 500;
}

.footer-motto {
  font-size: 14px;
  color: #61544a;
}

.footer-qrcode {
  width: 48px;
  height: 48px;
  margin-left: 24px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}
</style>
