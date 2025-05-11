<template>
  <div class="mindboard-card" @dblclick="handleDblClick">
    <!-- 预览区域 -->
    <div class="preview-area">
      <div v-if="mindboard.preview_image" class="preview-image">
        <img :src="mindboard.preview_image" alt="思维板预览" />
      </div>
      <div v-else class="preview-placeholder">
        <img src="@renderer/assets/images/load-failed.svg" alt="暂无预览" />
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="info-area">
      <div class="title-row">
        <template v-if="!isEditing">
          <h3 class="title" :class="{ untitled: !mindboard.name }">
            {{ mindboard.name || '未命名文件' }}
          </h3>
        </template>
        <template v-else>
          <input
            ref="nameInput"
            v-model="editingName"
            class="title-input"
            type="text"
            @blur="finishEditing"
            @keyup.enter="finishEditing"
            @keyup.esc="isEditing = false"
            @click.stop
          />
        </template>
        <div class="action-buttons">
          <div class="favorite-button" @click.stop="toggleFavorite">
            <Star
              theme="outline"
              size="16"
              :fill="mindboard.is_favorite ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
              :strokeWidth="3"
            />
          </div>
          <div ref="moreBtnRef" class="more-button" @click.stop="toggleMoreMenu">
            <More theme="outline" size="16" fill="var(--color-text-secondary)" :strokeWidth="3" />
            <PopupMenu
              ref="moreMenuRef"
              :show="moreMenuState.isOpen"
              :button-ref="moreBtnRef"
              :menuItems="menuItems"
              @close="closeMoreMenu"
              @itemClick="handleMenuItemClick"
            />
          </div>
        </div>
      </div>
      <div class="time">
        {{ formatTime(mindboard.updated_at) }}
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除思维板"
      message="确定要删除这个思维板吗？此操作不可撤销。"
      type="danger"
      cancel-text="取消"
      confirm-text="删除"
      @confirm="handleDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Mindboard } from '@shared/types/mindboard'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import dayjs from 'dayjs'
import { Star, More, Edit, Delete } from '@icon-park/vue-next'
import { markRaw, ref, nextTick } from 'vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'

const router = useRouter()
const mindboardStore = useMindboardStore()

const props = defineProps<{
  mindboard: Mindboard
}>()

// 更多菜单相关
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

// 删除确认对话框状态
const showDeleteConfirm = ref(false)

// 编辑状态
const isEditing = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const menuItems = ref<MenuItem[]>([
  {
    name: 'rename',
    icon: markRaw(Edit),
    label: '修改名称',
    action: () => {
      startEditing()
    }
  },
  {
    name: 'delete',
    icon: markRaw(Delete),
    label: '删除',
    action: () => {
      showDeleteConfirm.value = true
    },
    isDangerous: true
  }
])

const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef
})

// 处理菜单项点击
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  closeMoreMenu()
}

// 开始编辑
const startEditing = () => {
  isEditing.value = true
  editingName.value = props.mindboard.name
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

// 完成编辑
const finishEditing = async () => {
  isEditing.value = false
  if (editingName.value.trim() === '') {
    editingName.value = props.mindboard.name
    return
  }
  if (editingName.value !== props.mindboard.name) {
    try {
      await mindboardStore.updateMindboardName(props.mindboard.id, editingName.value.trim())
    } catch (error) {
      console.error('修改名称失败:', error)
    }
  }
}

// 删除思维板
const handleDelete = async () => {
  try {
    await mindboardStore.deleteMindboard(props.mindboard.id)
  } catch (error) {
    console.error('删除思维板失败:', error)
  }
}

// 取消删除
const handleCancelDelete = () => {
  showDeleteConfirm.value = false
}

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// 打开思维板
const openMindboard = async (id: string) => {
  try {
    // 将思维板添加到标签页系统
    const { useTabsStore } = await import('@renderer/stores/tabsStore')
    const tabsStore = useTabsStore()
    await tabsStore.openContent(id, 'MindBoard', props.mindboard.name || '未命名思维板')

    // 导航到思维板详情页
    router.push(`/mindboard/${id}`)
  } catch (error) {
    console.error('打开思维板失败:', error)
  }
}

// 处理双击事件
const handleDblClick = () => {
  openMindboard(props.mindboard.id)
}

// 切换收藏状态
const toggleFavorite = async (event: MouseEvent) => {
  event.stopPropagation()
  try {
    await mindboardStore.toggleFavorite(props.mindboard.id)
  } catch (error) {
    console.error('切换收藏状态失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.mindboard-card {
  background: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid var(--color-border);
  height: 200px; // 减小高度
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .preview-area {
    flex: 1;
    background: var(--color-bg-secondary);
    overflow: hidden;
    position: relative;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    .preview-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-secondary);

      img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
      }
    }

    .preview-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      img {
        width: 200px;
        height: 200px;
        opacity: 1;
      }
    }
  }

  .info-area {
    padding: 8px 12px;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;

      .title {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        margin-right: 8px;

        &.untitled {
          color: var(--color-text-secondary);
        }
      }

      .action-buttons {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .favorite-button,
      .more-button {
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        transition: all 0.2s ease;
        opacity: 0;

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

        &:hover {
          opacity: 1;
          background-color: var(--color-hover-bg);
        }
      }
    }

    &:hover {
      .favorite-button,
      .more-button {
        opacity: 1;
      }
    }

    .time {
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }

  &:hover {
    .info-area .title-row .favorite-button,
    .info-area .title-row .more-button {
      opacity: 1;
    }
  }
}

.more-menu {
  position: absolute;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  min-width: 120px;
  padding: 4px;
  transform-origin: top right;
  will-change: transform, opacity;

  .menu-item {
    display: flex;
    align-items: center;
    border-radius: 6px;
    cursor: pointer;
    padding: 6px 8px;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--color-hover-bg);
    }

    .menu-item-content {
      display: flex;
      align-items: center;
      width: 100%;

      .icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
          width: 16px;
          height: 16px;
        }
      }

      .name {
        margin-left: 8px;
        color: var(--color-text-primary);
        font-size: 13px;
        line-height: 1;
      }
    }
  }
}

// 优化的苹果风格动画
.animate-enter-from,
.animate-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.animate-enter-active {
  transition: all 0.2s cubic-bezier(0.3, 1, 0.3, 1);
}

.animate-leave-active {
  transition: all 0.15s cubic-bezier(0.3, 1, 0.3, 1);
}

.title-input {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
  margin-right: 8px;
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  padding: 0;
  height: 24px;
  border-radius: 4px;

  &:focus {
    background: var(--color-bg-secondary);
    padding: 0 4px;
  }
}
</style>
