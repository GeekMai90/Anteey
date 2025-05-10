<template>
  <node-view-wrapper
    data-type="iframe-wrapper"
    class="tiptap-iframe-wrapper"
    :class="{ 'is-selected': selected }"
  >
    <div class="iframe-container">
      <iframe
        :src="node.attrs.src"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
      <div ref="moreButton" class="iframe-more-button" @click.stop="toggleMenu">
        <div class="icon">
          <More theme="outline" size="18" fill="white" />
        </div>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <confirm-dialog
      v-model:visible="showDeleteConfirm"
      title="删除嵌入内容"
      message="删除后嵌入内容将无法恢复，确定要删除吗？"
      type="danger"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="confirmDelete"
    />

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
        <div class="popup-menu-item" @click="editIframe">
          <div class="icon">
            <Edit theme="outline" size="18" fill="var(--color-icon-primary)" :strokeWidth="3" />
          </div>
          <div class="name">编辑链接</div>
        </div>
        <div class="popup-menu-item popup-menu-item-danger" @click="deleteIframe">
          <div class="icon">
            <Delete theme="outline" size="18" fill="#ff4d4f" :strokeWidth="3" />
          </div>
          <div class="name">删除</div>
        </div>
      </div>
    </Teleport>

    <!-- 添加InputDialog组件 -->
    <input-dialog
      v-model:visible="showEditDialog"
      title="编辑视频链接"
      :initial-value="currentSrc"
      placeholder="请输入视频嵌入链接"
      confirm-text="确定"
      cancel-text="取消"
      @confirm="handleEditConfirm"
      @cancel="closeEditDialog"
    >
      <template #footer>
        <div class="iframe-dialog-tips">
          <p>请输入以下任意格式：</p>
          <ul>
            <li>完整的嵌入代码：&lt;iframe src="..."&gt;&lt;/iframe&gt;</li>
            <li>YouTube: https://www.youtube.com/embed/VIDEO_ID</li>
            <li>B站: https://player.bilibili.com/player.html?bvid=BV***</li>
            <li>腾讯视频: https://v.qq.com/txp/iframe/player.html?vid=***</li>
          </ul>
          <p>普通网页链接可能因安全限制无法显示</p>
        </div>
      </template>
    </input-dialog>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { More, Edit, Delete } from '@icon-park/vue-next'
import { message } from '@renderer/utils/message'
import InputDialog from '@renderer/components/common/InputDialog.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  node: {
    type: Object,
    required: true
  },
  updateAttributes: {
    type: Function,
    required: true
  },
  deleteNode: {
    type: Function,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

// 菜单相关
const showMenu = ref(false)
const moreButton = ref<HTMLElement | null>(null)
const popupMenu = ref<HTMLElement | null>(null)
const menuPosition = ref({ x: 0, y: 0 })

// 删除确认
const showDeleteConfirm = ref(false)

// 添加状态
const showEditDialog = ref(false)
const currentSrc = ref('')

// 添加类型定义
interface DialogResult {
  name: string
  icon?: string
}

// 切换菜单显示状态
const toggleMenu = async (event: MouseEvent) => {
  event.stopPropagation()
  showMenu.value = !showMenu.value

  if (showMenu.value && moreButton.value) {
    await calculateMenuPosition()
  }
}

// 计算菜单位置
const calculateMenuPosition = async () => {
  if (!moreButton.value) return

  const { x, y } = await computePosition(moreButton.value, popupMenu.value as HTMLElement, {
    placement: 'bottom-start',
    middleware: [offset(5), flip(), shift()]
  })

  menuPosition.value = { x, y }
}

// 编辑iframe链接
const editIframe = () => {
  currentSrc.value = props.node.attrs.src
  showEditDialog.value = true
  showMenu.value = false
}

// 确认编辑
const handleEditConfirm = (result: DialogResult) => {
  if (result.name && result.name !== props.node.attrs.src) {
    const embedUrl = convertToEmbedUrl(result.name.trim())

    props.updateAttributes({
      src: embedUrl
    })
    message.success('链接已更新')
  }
  showEditDialog.value = false
}

// 将普通视频URL转换为嵌入URL
const convertToEmbedUrl = (url: string): string => {
  try {
    // 首先检查是否是完整的iframe HTML代码
    if (url.includes('<iframe') && url.includes('src="')) {
      // 提取src属性值
      const srcMatch = url.match(/src=["']([^"']+)["']/)
      if (srcMatch && srcMatch[1]) {
        console.log('从iframe中提取到src:', srcMatch[1])
        // 递归调用自身处理提取出的URL
        return convertToEmbedUrl(srcMatch[1])
      }
    }

    // 尝试创建URL对象进行解析
    const urlObj = new URL(url)

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      // 已经是嵌入格式
      if (urlObj.pathname.includes('/embed/')) {
        return url
      }

      // 从watch链接提取视频ID
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop() // 处理youtu.be短链接

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Bilibili
    if (urlObj.hostname.includes('bilibili.com')) {
      // 已经是嵌入格式
      if (url.includes('player.bilibili.com')) {
        return url
      }

      // 提取BV号
      const bvidMatch = url.match(/BV\w+/)
      if (bvidMatch) {
        return `https://player.bilibili.com/player.html?bvid=${bvidMatch[0]}&high_quality=1`
      }

      // 提取av号
      const avidMatch = urlObj.pathname.match(/av(\d+)/)
      if (avidMatch) {
        return `https://player.bilibili.com/player.html?aid=${avidMatch[1]}&high_quality=1`
      }
    }

    // 腾讯视频
    if (urlObj.hostname.includes('v.qq.com')) {
      // 已经是嵌入格式
      if (url.includes('txp/iframe/player')) {
        return url
      }

      // 提取vid
      const vidMatch = url.match(/vid=([A-Za-z0-9]+)/)
      if (vidMatch) {
        return `https://v.qq.com/txp/iframe/player.html?vid=${vidMatch[1]}`
      }
    }

    // 如果没有匹配任何格式，返回原始URL
    return url
  } catch (e) {
    console.error('URL格式错误:', e)
    return url
  }
}

// 关闭编辑对话框
const closeEditDialog = () => {
  showEditDialog.value = false
}

// 删除iframe
const deleteIframe = () => {
  showDeleteConfirm.value = true
  showMenu.value = false
}

// 确认删除
const confirmDelete = () => {
  props.deleteNode()
  message.success('嵌入内容已删除')
  showDeleteConfirm.value = false
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (
    showMenu.value &&
    popupMenu.value &&
    !popupMenu.value.contains(event.target as Node) &&
    moreButton.value &&
    !moreButton.value.contains(event.target as Node)
  ) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.tiptap-iframe-wrapper {
  position: relative;
  width: 100%;
  margin: 20px 0;

  &.is-selected {
    .iframe-container {
      box-shadow: 0 0 0 2px var(--color-primary);
      border-radius: 8px;
    }

    .iframe-more-button {
      display: flex;
    }
  }
}

.iframe-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9比例 */
  overflow: hidden;
  border-radius: 8px;

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
}

.iframe-more-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;

  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }
}

.popup-menu {
  padding: 6px 0;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  min-width: 120px;

  .popup-menu-item {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    cursor: pointer;

    &:hover {
      background-color: var(--color-hover-button);
    }

    .icon {
      margin-right: 8px;
      display: flex;
      align-items: center;
    }

    &.popup-menu-item-danger {
      color: #ff4d4f;

      &:hover {
        background-color: rgba(255, 77, 79, 0.1);
      }
    }
  }
}

.iframe-dialog-tips {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
  border-top: 1px solid var(--color-border-primary);
  padding-top: 8px;

  ul {
    padding-left: 16px;
    margin: 4px 0;
  }

  p {
    margin: 4px 0;
  }
}
</style>
