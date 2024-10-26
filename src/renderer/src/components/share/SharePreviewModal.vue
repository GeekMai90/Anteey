<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>分享笔记</h3>
        <button class="close-button" @click="$emit('close')">
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

      <div class="share-container">
        <!-- 左侧预览区 -->
        <div class="preview-section">
          <div class="preview-scale-wrapper">
            <div ref="previewCardRef" class="preview-card" :style="previewStyle">
              <div class="share-content">
                <div class="note-header">
                  <div class="note-date">{{ currentDate }}</div>
                </div>
                <div class="note-content">
                  <ShareTipTapRender :content="note.content" :editable="false" />
                </div>
                <div class="note-footer">
                  <div class="footer-left">
                    <div class="footer-author">{{ authorName }}</div>
                    <div class="footer-motto">{{ authorMotto }}</div>
                  </div>
                  <!-- 只在有二维码地址时显示二维码 -->
                  <div v-if="customQrcodeUrl" class="footer-qrcode">
                    <img :src="qrCodeUrl" alt="专栏二维码" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧样式选择区 -->
        <div class="style-section">
          <div class="style-options">
            <h4>背景样式</h4>
            <div class="background-grid">
              <!-- 浅色主题 -->
              <div
                v-for="(style, index) in backgroundStyles"
                :key="index"
                class="style-item"
                :class="{ active: selectedStyle === index }"
                :style="style.preview"
                @click="selectStyle(index)"
              >
                <span>Aa</span>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <button class="copy-btn" @click="copyToClipboard">复制</button>
            <button class="save-btn" @click="handleExportImage">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import ShareTipTapRender from '@renderer/components/share/ShareTipTapRender.vue'
import { Note } from '@renderer/types/Note'
import { exportNoteImage, copyNoteToClipboard } from '@renderer/utils/shareNoteImage'
import { message } from '@renderer/utils/message'
import QRCode from 'qrcode'
import { useUserSettingsStore } from '@renderer/stores/useUserSettings'
import { CloseOne } from '@icon-park/vue-next'

const props = defineProps<{
  note: Note
}>()
const userSettingsStore = useUserSettingsStore()
const currentDate = format(new Date(), 'yyyy年MM月dd日')
const selectedStyle = ref(0)
const previewCardRef = ref<HTMLElement | null>(null)

const qrCodeUrl = ref('')

// 从 store 中获取用户设置
const authorName = computed(() => userSettingsStore.settings?.authorName || 'Antinet')
const authorMotto = computed(() => userSettingsStore.settings?.authorMotto || '一起践行终身成长')
const customQrcodeUrl = computed(() => userSettingsStore.settings?.qrcodeUrl || '')

// 单独封装二维码更新逻辑
const updateQRCode = async () => {
  try {
    const customUrl = userSettingsStore.settings?.qrcodeUrl

    if (customUrl && customUrl.trim() !== '') {
      // 如果是 URL，则生成二维码
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
        // 如果已经是 base64 图片，直接使用
        qrCodeUrl.value = customUrl
      } else {
        console.error('无效的二维码 URL 格式')
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

// 预定义的背景样式
const backgroundStyles = [
  {
    preview: { background: 'linear-gradient(180deg, rgb(158, 203, 255), rgb(158, 247, 255))' },
    style: { background: 'linear-gradient(180deg, rgb(158, 203, 255), rgb(158, 247, 255))' }
  },
  {
    preview: { background: ' linear-gradient(90deg, rgb(189, 226, 255), rgb(204, 199, 255))' },
    style: { background: ' linear-gradient(90deg, rgb(189, 226, 255), rgb(204, 199, 255))' }
  },
  {
    preview: { background: 'linear-gradient(135deg, #7ec2ff 0%, #73e7d1 100%)' },
    style: { background: 'linear-gradient(135deg, #7ec2ff 0%, #73e7d1 100%)' }
  },
  {
    preview: { background: 'linear-gradient(45deg, rgb(163, 255, 255), rgb(255, 173, 245))' },
    style: { background: 'linear-gradient(45deg, rgb(163, 255, 255), rgb(255, 173, 245))' }
  },
  {
    preview: { background: 'linear-gradient(135deg, rgb(173, 222, 255), rgb(212, 153, 255))' },
    style: { background: 'linear-gradient(135deg, rgb(173, 222, 255), rgb(212, 153, 255))' }
  },
  {
    preview: { background: 'linear-gradient(180deg, rgb(168, 183, 255), rgb(199, 168, 255))' },
    style: { background: 'linear-gradient(180deg, rgb(168, 183, 255), rgb(199, 168, 255))' }
  },
  {
    preview: { background: 'linear-gradient(0deg, rgb(248, 255, 199), rgb(204, 255, 218))' },
    style: { background: 'linear-gradient(0deg, rgb(248, 255, 199), rgb(204, 255, 218))' }
  },
  {
    preview: { background: 'linear-gradient(45deg, rgb(204, 255, 220), rgb(255, 211, 173))' },
    style: { background: 'linear-gradient(45deg, rgb(204, 255, 220), rgb(255, 211, 173))' }
  },

  {
    preview: { background: 'linear-gradient(45deg, rgb(255, 245, 153), rgb(186, 158, 255))' },
    style: { background: 'linear-gradient(45deg, rgb(255, 245, 153), rgb(186, 158, 255))' }
  }
]

const previewStyle = computed(() => {
  return backgroundStyles[selectedStyle.value].style
})

const selectStyle = (index: number) => {
  selectedStyle.value = index
}
const copyToClipboard = async () => {
  if (!props.note) return
  try {
    await copyNoteToClipboard({
      note: props.note,
      background: backgroundStyles[selectedStyle.value].style.background
    })
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败，请重试')
  }
}
const handleExportImage = async () => {
  if (!props.note) return
  await exportNoteImage({
    note: props.note,
    background: backgroundStyles[selectedStyle.value].style.background
  })
}

// 将方法传递给父组件
defineEmits<{
  (e: 'copy'): void
  (e: 'confirm'): void
  (e: 'close'): void
}>()
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
  width: 900px;
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
    padding: 4px 4px;
    margin: 2px;

    .icon {
      background: none;
      border: none;
      cursor: pointer;
      width: 26px;
      height: 26px;
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
        width: 20px;
        height: 20px;
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--default-text-color);
      font-size: 13px;
      font-weight: 400;
      margin-left: 6px;
      white-space: nowrap;
      writing-mode: horizontal-tb;
    }

    &:hover {
      background-color: var(--color-hover-button);
    }

    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }

    &.delete {
      color: #ff4d4f;
    }
  }
}

.share-container {
  display: flex;
  padding: 24px;
  gap: 16px;
  height: 600px;
}

.preview-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-hover-bg);
  border-radius: 12px;
  padding: 16px;
  overflow: hidden;
}

.preview-scale-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-card {
  width: 500px;
  height: 700px;
  transform: scale(0.75);
  transform-origin: center center;
  // border-radius: 24px; // 增加圆角
  transition: all 0.3s ease;
  padding: 16px; // 添加内边距
  position: relative; // 为水印定位
}

.style-section {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.style-options {
  h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 500;
  }
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.style-item {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  font-size: 20px;
  transition: all 0.2s ease;
  span {
    color: #252525;
  }

  &:hover {
    transform: scale(1.05);
  }

  &.active {
    border-color: var(--color-primary);
  }
}

.action-buttons {
  margin-top: auto;
  display: flex;
  gap: 12px;

  button {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: none;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .copy-btn {
    background-color: var(--color-hover-bg);
    color: var(--color-text-primary);

    &:hover {
      background-color: var(--color-border);
    }
  }

  .save-btn {
    background-color: var(--color-primary);
    color: white;

    &:hover {
      opacity: 0.9;
    }
  }
}

.share-content {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white; // 内容区域始终保持白色背景
  border-radius: 16px; // 内容区域添加圆角
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); // 可选：添加轻微阴影
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.note-content {
  flex: 1;
  // overflow: hidden;
  overflow-y: auto;
  margin: 16px 0;
  :deep(.tiptap) {
    margin: 0;
    padding: 0;
    font-size: 15px;
    line-height: 1.6;
    max-height: 100%;
  }
}

.note-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e7e5e4;
  display: flex;
  justify-content: space-between; // 改为两端对齐
  align-items: center;
  .footer-left {
    margin: 0; // 在没有二维码时居中显示
  }
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

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}
.note-date {
  font-size: 14px;
  color: #949494;
}
</style>
