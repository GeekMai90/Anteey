<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>分享笔记</h3>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>

      <div class="share-container">
        <!-- 左侧预览区 -->
        <div class="preview-section">
          <div class="preview-scale-wrapper">
            <div ref="previewCardRef" class="preview-card" :style="previewStyle">
              <div class="share-content">
                <div class="note-header">
                  <div class="note-indicator" :class="cardTypeClass"></div>
                  <h3 class="note-title">{{ note.address }}</h3>
                </div>
                <div class="note-content">
                  <TipTapRender :content="note.content" :editable="false" />
                </div>
                <div class="content-spacer"></div>
                <div class="note-date">{{ currentDate }}</div>
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
            <button class="save-btn" @click="$emit('confirm')">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import TipTapRender from './TipTapRender.vue'
import { Note } from '@renderer/types/Note'
import html2canvas from 'html2canvas' // 需要先安装这个包

const props = defineProps<{
  note: Note
}>()

const currentDate = format(new Date(), 'yyyy年MM月dd日')
const selectedStyle = ref(0)
const previewCardRef = ref<HTMLElement | null>(null)

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

// 复制图片到剪贴板
const copyToClipboard = async () => {
  if (!previewCardRef.value) return

  try {
    // 创建 canvas
    const canvas = await html2canvas(previewCardRef.value, {
      scale: 2, // 提高图片质量
      backgroundColor: null, // 保持背景透明
      useCORS: true // 允许加载跨域图片
    })

    // 将 canvas 转换为 blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })

    // 创建 ClipboardItem 并复制到剪贴板
    const data = new ClipboardItem({
      'image/png': blob
    })

    await navigator.clipboard.write([data])

    // 可以添加一个成功提示
    // message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    // message.error('复制失败，请重试')
  }
}

const cardTypeClass = computed(() => {
  switch (props.note.cardType) {
    case 'Maincard':
      return 'maincard'
    case 'Bibcard':
      return 'bibcard'
    case 'Indexcard':
      return 'indexcard'
    case 'Hoplinkcard':
      return 'hoplinkcard'
    default:
      return ''
  }
})
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
  padding: 20px 24px;
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
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background-color: var(--color-hover-bg);
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
  transform: scale(0.7);
  transform-origin: center center;
  border-radius: 24px; // 增加圆角
  transition: all 0.3s ease;
  padding: 32px; // 添加内边距
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
  border-radius: 12px; // 内容区域添加圆角
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); // 可选：添加轻微阴影
}

.note-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.note-indicator {
  width: 4px;
  height: 14px;
  border-radius: 2px;
  margin-right: 10px;

  &.maincard {
    background-color: var(--color-primary);
  }
  &.bibcard {
    background-color: var(--color-yellow);
  }
  &.indexcard {
    background-color: var(--color-blue);
  }
  &.hoplinkcard {
    background-color: var(--color-pink);
  }
}

.note-content {
  flex: 1;
  overflow: hidden;
  :deep(.tiptap) {
    margin: 0;
    padding: 0;
    font-size: 15px;
    line-height: 1.6;
    max-height: 100%;
  }
}

.content-spacer {
  height: 16px;
}

.note-date {
  font-size: 14px;
  color: var(--color-text-secondary);
  align-self: flex-end;
}

.note-title {
  margin: 0;
  font-size: 16px;
}
</style>
