<template>
  <node-view-wrapper
    data-type="image-wrapper"
    class="tiptap-image-wrapper"
    :class="{ 'is-selected': props.selected }"
    :style="wrapperStyle"
  >
    <div class="image-container" :style="containerStyle">
      <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
      <img :src="props.node.attrs.src" :alt="props.node.attrs.alt" :style="imageStyle" />
      <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
      <div
        ref="moreButton"
        v-click-outside="hideMenu"
        class="image-more-button"
        @click.stop="toggleMenu"
      >
        <div class="icon">
          <More theme="outline" size="18" fill="white" />
        </div>
        <div v-if="showMenu" class="popup-menu" @click.stop>
          <div class="popup-menu-item" @click="alignImage('left')">
            <div class="icon">
              <AlignTextLeft
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">左对齐</div>
          </div>
          <div class="popup-menu-item" @click="alignImage('center')">
            <div class="icon">
              <AlignTextCenter
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">居中对齐</div>
          </div>
          <div class="popup-menu-item" @click="alignImage('right')">
            <div class="icon">
              <AlignTextRight
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">右对齐</div>
          </div>
          <div class="popup-menu-item" @click="downloadImage">
            <div class="icon">
              <Download
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">下载</div>
          </div>
          <div class="popup-menu-item" @click="copyImage">
            <div class="icon">
              <Copy
                theme="outline"
                size="18"
                fill="var(--color-icon-menu-default)"
                :strokeWidth="3"
              />
            </div>
            <div class="name">复制</div>
          </div>
          <div class="popup-menu-item popup-menu-item-danger" @click="deleteImage">
            <div class="icon">
              <Delete theme="outline" size="18" fill="#ff4d4f" :strokeWidth="3" />
            </div>
            <div class="name">删除</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 添加确认对话框 -->
    <confirm-dialog
      v-model:visible="showDeleteConfirm"
      title="删除图片"
      message="删除后图片将无法恢复，确定要删除吗？"
      type="danger"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="confirmDelete"
    />
  </node-view-wrapper>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import {
  Download,
  Copy,
  Delete,
  More,
  AlignTextLeft,
  AlignTextCenter,
  AlignTextRight
} from '@icon-park/vue-next'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { message } from '@renderer/utils/message'

const props = defineProps({
  ...nodeViewProps,
  noteId: {
    type: String,
    required: false, // 改为 false
    default: '' // 添加默认值
  }
})
// 添加确认对话框的状态
const showDeleteConfirm = ref(false)

const containerStyle = computed(() => ({
  width: props.node.attrs.width || '100%',
  textAlign: props.node.attrs.align || 'center'
}))

const imageStyle = computed(() => ({
  maxWidth: '100%',
  height: 'auto'
}))

const showMenu = ref(false)
const moreButton = ref(null)

// watch(
//   () => props.node.attrs.width,
//   () => {
//     if (showMenu.value) {
//       nextTick(() => {
//         updateMenuPosition()
//       })
//     }
//   }
// )

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const wrapperStyle = computed(() => ({
  textAlign: props.node.attrs.align
}))

const hideMenu = () => {
  showMenu.value = false
}
const downloadImage = async () => {
  const imageUrl = props.node.attrs.src
  const fileName = getFileNameFromUrl(imageUrl)

  try {
    await window.electronAPI.image.downloadImage(imageUrl, fileName)
    message.success('图片下载成功')
  } catch (error) {
    console.error('下载图片失败:', error)
    message.error('图片下载失败')
  }
  showMenu.value = false
}

const getFileNameFromUrl = (url) => {
  // 从 URL 中提取文件名
  const pathArray = url.split('/')
  let fileName = pathArray[pathArray.length - 1]

  // 移除可能的查询参数
  fileName = fileName.split('?')[0]

  // 如果文件名为空，使用默认名称
  if (!fileName) {
    fileName = 'image.jpg'
  }

  return fileName
}

const copyImage = async () => {
  try {
    const imageUrl = props.node.attrs.src
    await window.electronAPI.image.copyImage(imageUrl)
    message.success('图片已复制到剪贴板')
  } catch (error) {
    console.error('复制图片失败:', error)
    message.error('复制图片失败')
  }
  showMenu.value = false
}

// 修改删除图片的处理流程
const deleteImage = () => {
  showMenu.value = false
  showDeleteConfirm.value = true
}
const confirmDelete = async () => {
  try {
    const imageUrl = props.node.attrs.src
    await window.electronAPI.image.deleteImage(imageUrl)
    props.deleteNode()
    message.success('图片删除成功')
  } catch (error) {
    console.error('删除图片失败:', error)
    message.error('删除图片失败')
  }
}

const alignImage = (alignment) => {
  props.updateAttributes({ align: alignment })
  showMenu.value = false
}

const startResize = (side, event) => {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = props.node.attrs.width ? parseInt(props.node.attrs.width) : 100
  const minWidth = 25
  const maxWidth = 100
  const step = 5 // 5% 的调整步长
  const snapThreshold = 2 // 吸附阈值，单位为像素

  const resize = (e) => {
    const currentX = e.clientX
    const diff = currentX - startX
    let newWidth = side === 'left' ? startWidth - diff * 0.5 : startWidth + diff * 0.5

    // 吸附效果
    const snapTo = Math.round(newWidth / step) * step
    const distanceToSnap = Math.abs(newWidth - snapTo)

    if (distanceToSnap < snapThreshold) {
      newWidth = snapTo
    } else {
      // 在接近吸附点时减缓调整速度
      const slowdownFactor = 1 - Math.max(0, (snapThreshold - distanceToSnap) / snapThreshold)
      newWidth = newWidth * slowdownFactor + snapTo * (1 - slowdownFactor)
    }

    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    props.updateAttributes({ width: `${Math.round(clampedWidth)}%` })
  }

  const stopResize = () => {
    window.removeEventListener('mousemove', resize)
    window.removeEventListener('mouseup', stopResize)

    // 确保最终宽度是 5% 的倍数
    const finalWidth = props.node.attrs.width ? parseInt(props.node.attrs.width) : 100
    const snappedWidth = Math.round(finalWidth / step) * step
    props.updateAttributes({ width: `${snappedWidth}%` })
  }

  window.addEventListener('mousemove', resize)
  window.addEventListener('mouseup', stopResize)
}
</script>

<style lang="scss" scoped>
.tiptap-image-wrapper {
  position: relative;
  display: inline-block;

  &:hover .image-more-button,
  &:hover .resize-handle {
    opacity: 1;
  }

  .image-container {
    position: relative;
    display: inline-block;
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 12px;
    cursor: ew-resize;
    opacity: 0;
    transition:
      opacity 0.2s ease,
      background-color 0.2s ease;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 6px;
      height: 50px;
      background-color: var(--color-text-secondary);
      border-radius: 3px;
      border: 1px solid #fff;
    }

    &.left {
      left: 0;
    }

    &.right {
      right: 0;
    }
  }
}
.image-more-button {
  position: absolute;
  top: 20px;
  right: 10px;
  background-color: var(--color-icon-image-more);
  opacity: 0;
  display: flex;
  align-items: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;
  transform: none;

  &:hover {
    background-color: var(--color-icon-image-more-hover);
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
      width: 16px;
      height: 16px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
    margin-top: 0px;
  }
}

.popup-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 120px;
  width: max-content;
  max-width: 300px;
  overflow-y: auto;
  padding: 6px 8px;
  white-space: nowrap;
  margin-top: 4px;
}

.popup-menu-item {
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

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.popup-menu-item-danger {
    color: #ff4d4f;
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
      width: 16px;
      height: 16px;
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
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
    margin-top: 0px;
  }
}
</style>
