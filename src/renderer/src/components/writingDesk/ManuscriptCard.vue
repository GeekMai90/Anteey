<template>
  <div class="manuscript-card" @dblclick="handleDblClick">
    <!-- 预览区域 -->
    <div class="preview-area">
      <div class="preview-content">
        <!-- 状态标签 -->
        <div class="status-badge">
          <StatusTag :status="manuscript.status" />
        </div>
        <!-- 预览内容：显示文章的前几段 -->
        <div class="content-preview">
          {{ getPreviewContent() }}
        </div>
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="info-area">
      <div class="title-row">
        <template v-if="!isEditing">
          <h3 class="title" :class="{ untitled: !manuscript.title }">
            {{ manuscript.title || '未命名文稿' }}
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
      <div class="info-row">
        <div class="time">{{ formatTime(manuscript.updatedAt) }}</div>
        <div class="stats">{{ manuscript.cards?.length || 0 }} 张卡片</div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除文稿"
      message="确定要删除这个文稿吗？此操作不可撤销。"
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
import type { Manuscript } from '@shared/types'
import { useWritingDeskStore } from '@renderer/stores/writingDeskStore'
import dayjs from 'dayjs'
import { More, Edit, Delete } from '@icon-park/vue-next'
import { markRaw, ref, nextTick } from 'vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import StatusTag from './StatusTag.vue'

const router = useRouter()
const writingDeskStore = useWritingDeskStore()

const props = defineProps<{
  manuscript: Manuscript
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
    label: '修改标题',
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
  editingName.value = props.manuscript.title
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

// 完成编辑
const finishEditing = async () => {
  isEditing.value = false
  if (editingName.value.trim() === '') {
    editingName.value = props.manuscript.title
    return
  }
  if (editingName.value !== props.manuscript.title) {
    try {
      await writingDeskStore.updateManuscript({
        id: props.manuscript.id,
        title: editingName.value.trim()
      })
    } catch (error) {
      console.error('修改标题失败:', error)
    }
  }
}

// 删除文稿
const handleDelete = async () => {
  try {
    await writingDeskStore.deleteManuscript(props.manuscript.id)
  } catch (error) {
    console.error('删除文稿失败:', error)
  }
}

// 取消删除
const handleCancelDelete = () => {
  showDeleteConfirm.value = false
}

// 格式化时间
const formatTime = (time: Date | string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// 获取预览内容
const getPreviewContent = () => {
  if (!props.manuscript.cards?.length) {
    return '暂无内容'
  }
  // 获取前三张卡片的内容拼接
  return (
    props.manuscript.cards
      .slice(0, 3)
      .map((card) => {
        const content =
          typeof card.content === 'string' ? card.content : JSON.stringify(card.content)
        return content.substring(0, 50)
      })
      .join('\n')
      .substring(0, 150) + '...'
  )
}

// 打开文稿
const handleDblClick = () => {
  router.push(`/writing-desk/${props.manuscript.id}`)
}
</script>

<style lang="scss" scoped>
.manuscript-card {
  background: var(--color-bg-primary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid var(--color-border);
  height: 200px;
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
    padding: 16px;

    .preview-content {
      height: 100%;
      position: relative;

      .status-badge {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
      }

      .content-preview {
        height: 100%;
        overflow: hidden;
        font-size: 13px;
        color: var(--color-text-secondary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        line-clamp: 5;
        -webkit-box-orient: vertical;
        box-orient: vertical;
        text-overflow: ellipsis;
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
      margin-bottom: 4px;

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

      .more-button {
        cursor: pointer;
        padding: 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.2s ease;

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

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--color-text-secondary);

      .time {
        flex: 1;
      }

      .stats {
        margin-left: 8px;
      }
    }
  }

  &:hover {
    .info-area .title-row .more-button {
      opacity: 1;
    }
  }
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
