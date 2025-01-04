<template>
  <div v-if="visible" class="image-upload-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>添加图片</h3>
        <button class="close-button" @click="hide">
          <Close theme="outline" size="16" fill="var(--color-text-secondary)" />
        </button>
      </div>

      <div class="upload-area" @paste="handlePaste" @drop.prevent="handleDrop" @dragover.prevent>
        <div v-if="!previewUrl" class="upload-hint">
          <PictureOne theme="outline" size="48" fill="var(--color-text-secondary)" />
          <p>将图片拖放到此处，或点击选择图片</p>
          <p class="sub-hint">支持粘贴图片 (Ctrl + V)</p>
          <button class="select-button" @click="triggerFileSelect">选择图片</button>
        </div>
        <div v-else class="preview">
          <img :src="previewUrl" alt="预览" />
          <div class="preview-actions">
            <button class="action-button" @click="clearPreview">重新选择</button>
            <button class="action-button primary" @click="handleConfirm">确认添加</button>
          </div>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Close, PictureOne } from '@icon-park/vue-next'
import { message } from '@renderer/utils/message'

const visible = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')

const emit = defineEmits<{
  (e: 'confirm', imageData: { url: string; width: number; height: number }): void
}>()

const show = () => {
  visible.value = true
  // 监听粘贴事件
  document.addEventListener('paste', handlePaste)
}

const hide = () => {
  visible.value = false
  clearPreview()
  document.removeEventListener('paste', handlePaste)
}

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    processFile(input.files[0])
  }
}

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  // 将 DataTransferItemList 转换为数组
  Array.from(items).forEach((item) => {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        processFile(file)
      }
    }
  })
}

const handleDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    processFile(files[0])
  }
}

const processFile = async (file: File) => {
  try {
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        previewUrl.value = result
      }
    }
    reader.readAsDataURL(file)

    // 直接上传图片
    const { path: imagePath } = await window.electronAPI.image.uploadImage(file.path, '')

    // 获取图片实际尺寸
    const img = new Image()
    img.onload = () => {
      const imageData = {
        url: imagePath,
        width: img.width,
        height: img.height
      }
      currentImageData.value = imageData
    }
    img.src = imagePath
  } catch (error) {
    console.error('处理图片失败:', error)
    message.error('处理图片失败')
  }
}

const currentImageData = ref<{ url: string; width: number; height: number } | null>(null)

const handleConfirm = () => {
  if (currentImageData.value) {
    emit('confirm', currentImageData.value)
    hide()
  }
}

const clearPreview = () => {
  previewUrl.value = ''
  currentImageData.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

defineExpose({
  show,
  hide
})
</script>

<style lang="scss" scoped>
.image-upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal-content {
    background-color: var(--color-bg-primary);
    border-radius: 8px;
    padding: 20px;
    width: 500px;
    max-width: 90vw;
    box-shadow: var(--shadow-primary);

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        color: var(--color-text-primary);
      }

      .close-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;

        &:hover {
          background-color: var(--color-hover-button);
        }
      }
    }

    .upload-area {
      border: 2px dashed var(--color-border);
      border-radius: 8px;
      padding: 20px;
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--color-primary);
      }

      .upload-hint {
        text-align: center;
        color: var(--color-text-secondary);

        .sub-hint {
          font-size: 12px;
          margin-top: 8px;
        }
      }

      .preview {
        width: 100%;

        img {
          max-width: 100%;
          max-height: 300px;
          object-fit: contain;
          border-radius: 4px;
        }

        .preview-actions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
      }
    }
  }

  .select-button,
  .action-button {
    padding: 6px 16px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    // background-color: var(--color-bg-secondary);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-hover-button);
    }

    &.primary {
      background-color: var(--color-primary);
      color: white;
      border: none;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
