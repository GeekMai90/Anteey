<template>
  <node-view-wrapper
    data-type="image-wrapper"
    class="tiptap-image-wrapper"
    :class="{ 'is-selected': props.selected }"
    :style="wrapperStyle"
  >
    <div class="image-container" :style="containerStyle">
      <div class="resize-handle left" @mousedown="startResize('left', $event)"></div>
      <img
        :key="retryKey"
        :src="props.node.attrs.src"
        :alt="props.node.attrs.alt"
        :style="imageStyle"
        @error="handleImageError"
        @load="handleImageLoad"
        @dblclick="openImageViewer"
      />
      <div class="resize-handle right" @mousedown="startResize('right', $event)"></div>
      <div ref="moreButton" class="image-more-button" @click.stop="toggleMenu">
        <div class="icon">
          <More theme="outline" size="18" fill="white" />
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

    <!-- 使用 Modal 组件替代自定义模态窗口 -->
    <Modal v-model="showImageViewer" @outside-click="closeImageViewer">
      <div class="image-viewer-container">
        <div class="image-viewer-toolbar">
          <button class="image-viewer-close" @click.stop="closeImageViewer">
            <Close theme="outline" size="24" fill="white" :strokeWidth="3" />
          </button>
        </div>
        <div class="image-viewer-content">
          <!-- 左侧导航按钮 -->
          <button
            v-if="hasMultipleImages"
            class="image-nav-button prev-button"
            :disabled="currentImageIndex <= 0"
            @click.stop="showPrevImage"
          >
            <Left theme="outline" size="24" fill="white" :strokeWidth="3" />
          </button>

          <img
            :src="currentImageSrc"
            :alt="currentImageAlt"
            class="image-viewer-img"
            :style="viewerImageStyle"
            @click.stop
            @mousedown="startDrag"
            @touchstart="startDrag"
            @dblclick.stop="closeImageViewer"
          />

          <!-- 右侧导航按钮 -->
          <button
            v-if="hasMultipleImages"
            class="image-nav-button next-button"
            :disabled="currentImageIndex >= allImages.length - 1"
            @click.stop="showNextImage"
          >
            <Right theme="outline" size="24" fill="white" :strokeWidth="3" />
          </button>
        </div>
        <!-- 底部工具条 -->
        <div class="image-viewer-bottom-toolbar">
          <button
            v-tooltip.top="{
              content: '放大',
              delay: { show: 500 },
              html: true
            }"
            class="toolbar-button"
            @click="zoomIn"
          >
            <ZoomIn theme="outline" size="20" fill="white" :strokeWidth="3" />
          </button>
          <button
            v-tooltip.top="{
              content: '缩小',
              delay: { show: 500 },
              html: true
            }"
            class="toolbar-button"
            @click="zoomOut"
          >
            <ZoomOut theme="outline" size="20" fill="white" :strokeWidth="3" />
          </button>
          <button
            v-tooltip.top="{
              content: isOriginalSize ? '适应页面 (空格)' : '原始大小 (空格)',
              delay: { show: 500 },
              html: true
            }"
            class="toolbar-button"
            @click="toggleOriginalSize"
          >
            <component
              :is="isOriginalSize ? FullScreenIcon : EqualRatioIcon"
              theme="outline"
              size="20"
              fill="white"
              :strokeWidth="3"
            />
          </button>
          <button
            v-tooltip.top="{
              content: '旋转 (R)',
              delay: { show: 500 },
              html: true
            }"
            class="toolbar-button"
            @click="rotateImage"
          >
            <Rotate theme="outline" size="20" fill="white" :strokeWidth="3" />
          </button>
          <button
            v-tooltip.top="{
              content: '下载图片 (Ctrl/⌘ S)',
              delay: { show: 500 },
              html: true
            }"
            class="toolbar-button"
            @click="downloadViewerImage"
          >
            <Download theme="outline" size="20" fill="white" :strokeWidth="3" />
          </button>

          <!-- 导航组合按钮组 -->
          <div v-if="hasMultipleImages" class="nav-button-group">
            <button
              v-tooltip.top="{
                content: '上一张 (←)',
                delay: { show: 500 },
                html: true
              }"
              :disabled="currentImageIndex <= 0"
              class="nav-button"
              @click="showPrevImage"
            >
              <Left theme="outline" size="20" fill="white" :strokeWidth="3" />
            </button>
            <div class="image-counter">{{ currentImageIndex + 1 }} / {{ allImages.length }}</div>
            <button
              v-tooltip.top="{
                content: '下一张 (→)',
                delay: { show: 500 },
                html: true
              }"
              :disabled="currentImageIndex >= allImages.length - 1"
              class="nav-button"
              @click="showNextImage"
            >
              <Right theme="outline" size="20" fill="white" :strokeWidth="3" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  </node-view-wrapper>

  <!-- 使用Teleport将菜单传送到body -->
  <Teleport to="body">
    <div
      v-if="showMenu"
      ref="popupMenu"
      class="popup-menu"
      :style="{
        position: 'fixed',
        top: `${menuPosition.y}px`,
        left: `${menuPosition.x}px`,
        zIndex: 9999
      }"
      @click.stop
    >
      <div class="popup-menu-item" @click="alignImage('left')">
        <div class="icon">
          <AlignTextLeft
            theme="outline"
            size="18"
            fill="var(--color-icon-primary)"
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
            fill="var(--color-icon-primary)"
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
            fill="var(--color-icon-primary)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">右对齐</div>
      </div>
      <div class="popup-menu-item" @click="downloadImage">
        <div class="icon">
          <Download theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
        </div>
        <div class="name">下载</div>
      </div>
      <div class="popup-menu-item" @click="copyImage">
        <div class="icon">
          <Copy theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
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
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import {
  Download,
  Copy,
  Delete,
  More,
  AlignTextLeft,
  AlignTextCenter,
  AlignTextRight,
  Close,
  ZoomIn,
  ZoomOut,
  FullScreen as FullScreenIcon,
  Rotate,
  EqualRatio as EqualRatioIcon,
  Left,
  Right
} from '@icon-park/vue-next'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import Modal from '@renderer/components/common/Modal.vue'
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
// 添加图片查看器状态
const showImageViewer = ref(false)
// 添加图片查看器的缩放和旋转状态
const zoomLevel = ref(1)
const rotationDegree = ref(0)
// 添加原始大小状态
const isOriginalSize = ref(false)
// 添加拖动相关状态
const dragPosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)
// 添加多图片浏览相关状态
const allImages = ref<ImageInfo[]>([])
const currentImageIndex = ref<number>(0)

// 添加重试相关的状态
const retryKey = ref(0)
const retryCount = ref(0)
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1秒后重试

const containerStyle = computed(() => ({
  width: props.node.attrs.width || '100%',
  margin:
    props.node.attrs.align === 'center'
      ? '0 auto'
      : props.node.attrs.align === 'left'
        ? '0 auto 0 0'
        : '0 0 0 auto'
}))

const imageStyle = computed(() => ({
  maxWidth: '100%',
  width: '100%',
  height: 'auto'
}))

const showMenu = ref(false)
const moreButton = ref(null)
const popupMenu = ref(null)
const menuPosition = ref({ x: 0, y: 0 })

// 修改toggleMenu函数，使用floating-ui定位菜单
const toggleMenu = async () => {
  showMenu.value = !showMenu.value

  if (showMenu.value) {
    await nextTick()
    updateMenuPosition()
  }
}

// 添加菜单位置更新函数
const updateMenuPosition = async () => {
  if (!moreButton.value || !popupMenu.value) return

  try {
    // 使用floating-ui计算菜单位置
    const { x, y } = await computePosition(moreButton.value, popupMenu.value, {
      placement: 'bottom-end',
      middleware: [
        offset(4),
        flip({
          fallbackPlacements: ['top-end', 'left-end', 'right-end']
        }),
        shift({ padding: 8 })
      ]
    })

    // 更新菜单位置
    menuPosition.value = { x, y }
  } catch (error) {
    console.error('菜单定位出错:', error)
  }
}

// 修改hideMenu函数
const hideMenu = (event?: MouseEvent) => {
  if (event && popupMenu.value && (popupMenu.value as HTMLElement).contains(event.target as Node)) {
    return
  }
  showMenu.value = false
}

// 添加图片类型定义
interface ImageInfo {
  src: string
  alt: string
}

// 添加事件类型定义
interface ResizeEvent extends MouseEvent {
  clientX: number
  clientY: number
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

// 修改 getFileNameFromUrl 函数
const getFileNameFromUrl = (url: string): string => {
  const pathArray = url.split('/')
  let fileName = pathArray[pathArray.length - 1]
  fileName = fileName.split('?')[0]
  return fileName || 'image.jpg'
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

// 修改 alignImage 函数
const alignImage = (alignment: 'left' | 'center' | 'right'): void => {
  props.updateAttributes({ align: alignment })
  showMenu.value = false
}

// 修改 startResize 函数
const startResize = (side: 'left' | 'right', event: ResizeEvent): void => {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = props.node.attrs.width ? parseInt(props.node.attrs.width) : 100
  const minWidth = 25
  const maxWidth = 100
  const step = 5
  const snapThreshold = 2

  const resize = (e: ResizeEvent) => {
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

// 处理图片加载错误
const handleImageError = async () => {
  if (retryCount.value < MAX_RETRIES) {
    // 等待一段时间后重试
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))

    // 增加重试次数
    retryCount.value++

    // 通过改变 key 来强制重新加载图片
    retryKey.value = Date.now()
  } else {
    console.error('图片加载失败，已达到最大重试次数')
    // 可以在这里添加失败后的处理逻辑，比如显示占位图
  }
}

// 处理图片加载成功
const handleImageLoad = () => {
  // 重置重试计数
  retryCount.value = 0

  // 确保图片加载后也能正确应用宽度
  if (!props.node.attrs.width) {
    props.updateAttributes({ width: '100%' })
  }
}

// 计算属性：是否有多张图片
const hasMultipleImages = computed(() => allImages.value.length > 1)

// 计算属性：当前显示的图片URL
const currentImageSrc = computed((): string => {
  if (allImages.value.length > 0 && currentImageIndex.value >= 0) {
    return allImages.value[currentImageIndex.value].src
  }
  return props.node.attrs.src
})

// 计算属性：当前显示的图片alt文本
const currentImageAlt = computed((): string => {
  if (allImages.value.length > 0 && currentImageIndex.value >= 0) {
    return allImages.value[currentImageIndex.value].alt
  }
  return props.node.attrs.alt
})

// 获取当前笔记中的所有图片
const getAllImagesInNote = (): ImageInfo[] => {
  if (!props.editor) return []

  const images: ImageInfo[] = []
  props.editor.state.doc.descendants((node) => {
    if (node.type.name === 'image') {
      images.push({
        src: node.attrs.src,
        alt: node.attrs.alt || ''
      })
    }
    return true
  })

  return images
}

// 查找当前图片在所有图片中的索引
const findCurrentImageIndex = () => {
  const currentSrc = props.node.attrs.src
  return allImages.value.findIndex((img) => img.src === currentSrc)
}

// 显示上一张图片
const showPrevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
    // 重置缩放、旋转和拖动状态
    resetViewerState()
  }
}

// 显示下一张图片
const showNextImage = () => {
  if (currentImageIndex.value < allImages.value.length - 1) {
    currentImageIndex.value++
    // 重置缩放、旋转和拖动状态
    resetViewerState()
  }
}

// 重置查看器状态
const resetViewerState = () => {
  zoomLevel.value = 1
  rotationDegree.value = 0
  isOriginalSize.value = false
  dragPosition.value = { x: 0, y: 0 }
}

// 打开图片查看器
const openImageViewer = (event: MouseEvent): void => {
  allImages.value = getAllImagesInNote()
  currentImageIndex.value = findCurrentImageIndex()
  showImageViewer.value = true
  resetViewerState()
  event.preventDefault()
  event.stopPropagation()
  document.addEventListener('keydown', handleKeydown)
}

// 关闭图片查看器
const closeImageViewer = () => {
  showImageViewer.value = false
  document.removeEventListener('keydown', handleKeydown)
}

// 放大图片
const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value = Math.min(3, zoomLevel.value + 0.2)
  }
}

// 缩小图片
const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.2)
  }
}

// 切换原始大小/适应页面
const toggleOriginalSize = () => {
  isOriginalSize.value = !isOriginalSize.value
  if (isOriginalSize.value) {
    // 设置为原始大小
    zoomLevel.value = 1.5 // 使用较大的缩放比例模拟原始大小
  } else {
    // 设置为适应页面
    zoomLevel.value = 1
    // 重置拖动位置
    dragPosition.value = { x: 0, y: 0 }
  }
}

// 旋转图片
const rotateImage = () => {
  rotationDegree.value -= 90
}

// 下载查看器中的图片
const downloadViewerImage = async () => {
  const imageUrl = currentImageSrc.value
  const fileName = getFileNameFromUrl(imageUrl)

  try {
    await window.electronAPI.image.downloadImage(imageUrl, fileName)
    message.success('图片下载成功')
  } catch (error) {
    console.error('下载图片失败:', error)
    message.error('图片下载失败')
  }
}

// 图片查看器的图片样式
const viewerImageStyle = computed(() => ({
  transform: `translate(${dragPosition.value.x}px, ${dragPosition.value.y}px) scale(${zoomLevel.value}) rotate(${rotationDegree.value}deg)`,
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  cursor: zoomLevel.value > 1 ? 'grab' : 'default'
}))

// 开始拖动图片
const startDrag = (event: MouseEvent | TouchEvent): void => {
  if (zoomLevel.value <= 1) return

  event.preventDefault()
  isDragging.value = true

  const startX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX
  const startY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY
  const initialX = dragPosition.value.x
  const initialY = dragPosition.value.y

  const handleMove = (moveEvent: MouseEvent | TouchEvent): void => {
    if (!isDragging.value) return

    const currentX =
      moveEvent instanceof MouseEvent ? moveEvent.clientX : moveEvent.touches[0].clientX
    const currentY =
      moveEvent instanceof MouseEvent ? moveEvent.clientY : moveEvent.touches[0].clientY

    // 计算位移
    const deltaX = currentX - startX
    const deltaY = currentY - startY

    // 更新位置
    dragPosition.value = {
      x: initialX + deltaX,
      y: initialY + deltaY
    }
  }

  // 结束拖动处理函数
  const handleEnd = () => {
    isDragging.value = false

    // 移除事件监听器
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
  }

  // 添加事件监听器
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleEnd)
  document.addEventListener('touchmove', handleMove)
  document.addEventListener('touchend', handleEnd)
}

// 修改键盘事件处理函数的类型声明
const handleKeydown = (event: KeyboardEvent): void => {
  if (!showImageViewer.value) return

  switch (event.key) {
    case 'Escape':
      closeImageViewer()
      break
    case 'ArrowLeft':
      if (hasMultipleImages.value) showPrevImage()
      break
    case 'ArrowRight':
      if (hasMultipleImages.value) showNextImage()
      break
    case 'r':
    case 'R':
      // 阻止事件冒泡和默认行为
      event.preventDefault()
      event.stopPropagation()
      rotateImage()
      break
    case 's':
    case 'S':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        event.stopPropagation()
        downloadViewerImage()
      }
      break
    case ' ':
      event.preventDefault()
      event.stopPropagation()
      toggleOriginalSize()
      break
  }
}

// 添加回wrapperStyle计算属性
const wrapperStyle = computed(() => ({
  width: '100%'
}))

// 添加窗口大小变化监听逻辑
onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  document.removeEventListener('click', handleDocumentClick)
})

// 窗口大小变化处理
const handleWindowResize = () => {
  if (showMenu.value) {
    updateMenuPosition()
  }
}

// 处理文档点击事件
const handleDocumentClick = (event: MouseEvent) => {
  if (!showMenu.value) return

  const target = event.target as Node

  // 如果点击了菜单按钮或菜单内容，不关闭菜单
  if (
    (moreButton.value && (moreButton.value as HTMLElement).contains(target)) ||
    (popupMenu.value && (popupMenu.value as HTMLElement).contains(target))
  ) {
    return
  }

  // 其他情况关闭菜单
  hideMenu()
}
</script>

<style lang="scss" scoped>
.tiptap-image-wrapper {
  position: relative;
  display: block;
  width: 100%;
  margin-top: 5px;
  margin-bottom: 5px;

  &:hover .image-more-button,
  &:hover .resize-handle {
    opacity: 1;
  }

  .image-container {
    position: relative;
    display: block;
    width: 100%;
  }

  img {
    display: block;
    max-width: 100%;
    width: 100%;
    height: auto;
    object-fit: contain;
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
  background-color: var(--color-icon-hover);
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
    background-color: var(--color-icon-hover-dark);
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
  // 移除顶部margin，由定位算法控制
  transform-origin: top right;
  animation: popup-in 0.15s ease;
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
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
    color: var(---color-text-primary);
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

// 添加加载失败时的样式
.image-container {
  img {
    &[src=''] {
      // 添加占位图样式
      min-height: 100px;
      background: var(--color-bg-secondary);
      border: 1px dashed var(--color-border);
    }
  }
}

// 添加图片查看器样式
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.image-viewer-container {
  position: relative;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.image-viewer-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.image-viewer-toolbar {
  position: fixed;
  top: 16px;
  right: 16px;
  padding: 0;
  z-index: 10001;
}

.image-viewer-close {
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}

.image-viewer-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  animation: zoomIn 0.3s ease;
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
  width: auto;

  &:active {
    cursor: grabbing;
  }
}

// 添加底部工具条样式
.image-viewer-bottom-toolbar {
  position: fixed;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 16px;
  z-index: 10001;
}

// 导航组合按钮组样式
.nav-button-group {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  padding: 4px;
  margin-left: 16px;
  height: 40px;

  .nav-button {
    background: transparent;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &:active {
      transform: scale(0.95);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
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

  .image-counter {
    color: white;
    font-size: 14px;
    min-width: 48px;
    text-align: center;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.toolbar-button {
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin: 0 8px;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  &:active {
    transform: scale(0.95);
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// 添加图片导航按钮样式
.image-nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  z-index: 10001;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: rgba(0, 0, 0, 0.5);
    }

    &:active {
      transform: translateY(-50%);
    }
  }

  &.prev-button {
    left: 16px;
  }

  &.next-button {
    right: 16px;
  }

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :deep(svg) {
    width: 24px;
    height: 24px;
  }
}
</style>
