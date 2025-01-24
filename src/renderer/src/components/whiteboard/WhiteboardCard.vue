<template>
  <div class="whiteboard-card">
    <div class="whiteboard-card-header">
      <!-- 更多功能菜单按钮 -->
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
        <!-- 更多功能菜单按钮 -->
        <PopupMenu
          ref="moreMenuRef"
          :show="moreMenuState.isOpen"
          :button-ref="moreBtnRef"
          :menuItems="noteMenuItems"
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
      <div class="cardCount">{{ cardCount }}</div>
      <div class="cardCountText">张卡片</div>
    </div>
    <ConfirmModal
      :show="showConfirmModal"
      title="删除白板"
      message="确定要删除这个白板吗？此操作不可撤销。"
      @confirm="confirmDeleteWhiteboard"
      @cancel="cancelDeleteWhiteboard"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, nextTick, onMounted, ref } from 'vue'
import type { Whiteboard } from '@shared/types'
import { Workbench, More } from '@icon-park/vue-next'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStore'
import router from '@renderer/router'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmModal from '@renderer/components/ConfirmModal.vue'
import { useMenu } from '@renderer/composables/useMenu'

const props = defineProps<{
  whiteboard: Whiteboard
}>()

const whiteboardStore = useWhiteboardStore()

//初始化数据
const cardCount = ref(0)
onMounted(async () => {
  cardCount.value = await whiteboardStore.getCardCount(props.whiteboard.id)
})

// 打开白板详情
const openWhiteboard = async (id: string) => {
  try {
    // 确保路径正确
    const targetPath = `/whiteboard/${id}`

    // 如果当前已经在白板详情页，先跳转到临时页面
    if (router.currentRoute.value.name === 'whiteboardDetail') {
      await router.replace({ name: 'temp' })
    }

    // 使用完整的路径进行跳转
    await router.push({
      path: targetPath,
      replace: true
    })

    // 验证跳转结果
    await nextTick()
    if (router.currentRoute.value.path !== targetPath) {
      console.error('Route not updated correctly')
      window.location.reload()
    }
  } catch (error) {
    console.error('Navigation failed:', error)
    window.location.reload()
  }
}
// 更多按钮弹出菜单
const {
  menuItems: noteMenuItems,
  resetDeleteState,
  showConfirmModal,
  cancelDeleteWhiteboard,
  confirmDeleteWhiteboard
} = useNoteMenu({
  noteId: props.whiteboard.id,
  whiteboardId: props.whiteboard.id,
  menuItems: ['deleteWhiteboard']
})
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef,
  onClose: () => {
    resetDeleteState()
  }
})
// 更多菜单点击事件
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
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
  transition: opacity 0.2s ease-in-out; // 添加过渡效果
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
    color: var(--default-text-color);
    font-size: 18px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
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
  .cardCount {
    font-size: 14px;
    font-weight: bold;
    margin-right: 4px;
  }

  .cardCountText {
    font-size: 14px;
    color: #666;
  }
}
</style>
