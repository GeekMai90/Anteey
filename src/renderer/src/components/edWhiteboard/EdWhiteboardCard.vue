<template>
  <div class="whiteboard-card">
    <div class="whiteboard-card-header">
      <!-- 更多功能菜单按钮 -->
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
        <!-- 更多功能菜单 -->
        <PopupMenu
          ref="moreMenuRef"
          :show="moreMenuState.isOpen"
          :position="moreMenuState.position"
          :menuItems="menuItems"
          @close="closeMoreMenu"
          @itemClick="handleMenuItemClick"
        />
      </div>
    </div>
    <div class="whiteboard-card-content" @dblclick.stop="openWhiteboard(whiteboard.id)">
      <div class="whiteboard-name">
        <div class="icon">
          <Workbench
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">
          {{ whiteboard.name }}
        </div>
      </div>
    </div>
    <div class="whiteboard-card-footer">
      <div class="update-time">{{ formatTime }}</div>
    </div>
    <ConfirmModal
      :show="showConfirmModal"
      title="删除白板"
      message="确定要删除这个白板吗？此操作不可撤销。"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { EdWhiteboard } from '@shared/types/edWhiteboard'
import { Workbench, More } from '@icon-park/vue-next'
import { useEdWhiteboardStore } from '@renderer/stores/EdWhiteboardStore'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmModal from '@renderer/components/ConfirmModal.vue'
import { useMenu } from '@renderer/composables/useMenu'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const props = defineProps<{
  whiteboard: EdWhiteboard
}>()

const router = useRouter()
const edWhiteboardStore = useEdWhiteboardStore()

// 格式化更新时间
const formatTime = computed(() => {
  return formatDistanceToNow(props.whiteboard.updated_at, {
    addSuffix: true,
    locale: zhCN
  })
})

// 打开白板
const openWhiteboard = (id: string) => {
  router.push(`/ed-whiteboard/${id}`)
}

// 更多菜单相关
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const showConfirmModal = ref(false)

const menuItems = ref<MenuItem[]>([
  {
    name: 'rename',
    label: '重命名',
    action: () => {
      // TODO: 实现重命名功能
    }
  },
  {
    name: 'delete',
    label: '删除',
    action: () => {
      showConfirmModal.value = true
    }
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
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}

// 删除确认
const confirmDelete = async () => {
  try {
    await edWhiteboardStore.deleteWhiteboard(props.whiteboard.id)
    showConfirmModal.value = false
    closeMoreMenu()
  } catch (error) {
    console.error('删除白板失败:', error)
  }
}

const cancelDelete = () => {
  showConfirmModal.value = false
}
</script>

<style lang="scss" scoped>
.whiteboard-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--color-note-card-bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease-in-out;
  border: 1px solid var(--color-border);

  &:hover {
    box-shadow:
      0 10px 15px rgba(0, 0, 0, 0.1),
      0 4px 6px rgba(0, 0, 0, 0.05);
    .whiteboard-card-header {
      opacity: 1;
    }
  }
}

.whiteboard-card-header {
  display: flex;
  width: 100%;
  height: 24px;
  align-items: center;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  .icon {
    background: none;
    border: none;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background-color: var(--color-hover-button);
    }

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
}

.whiteboard-card-content {
  flex-grow: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.whiteboard-name {
  display: flex;
  align-items: center;
  width: 100%;

  .icon {
    background: none;
    border: none;
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
      width: 18px;
      height: 18px;
    }
  }

  .name {
    flex-grow: 1;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 18px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.whiteboard-card-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  user-select: none;

  .update-time {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}
</style>
