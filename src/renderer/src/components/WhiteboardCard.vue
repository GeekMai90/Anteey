<template>
  <div class="whiteboard-card">
    <div class="whiteboard-card-header">
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMenu">
        <div class="icon">
          <More theme="outline" size="20" fill="var(--color-icon-default)" :strokeWidth="3" />
        </div>
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
    <PopupMenu
      ref="popupMenuRef"
      :show="isMenuVisible"
      :menuItems="noteMenuItems"
      :position="menuPosition"
      :offset="{ x: -80, y: 5 }"
      @close="closeMenu"
      @itemClick="handleMenuItemClick"
    />
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
import { defineProps, nextTick, onMounted, reactive, ref } from 'vue'
import type { Whiteboard } from '@renderer/types/Note'
import { Workbench, More } from '@icon-park/vue-next'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStores'
import router from '@renderer/router'
import PopupMenu from './PopupMenu.vue'
import { useNoteMenu } from '../composables/useNoteMenu'
import type { MenuItem } from './PopupMenu.vue'
import ConfirmModal from './ConfirmModal.vue'

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
const openWhiteboard = (id: string) => {
  console.log('打开白板详情', id)
  console.log('当前路由:', router.currentRoute.value)
  router
    // .replace({ name: 'whiteboardDetail', params: { whiteboardId: id } })
    .push({
      name: 'whiteboardDetail',
      params: { whiteboardId: id },
      query: { _t: Date.now() }
    })
    .then(() => {
      console.log('路由跳转成功')
      console.log('跳转后的路由:', router.currentRoute.value)
      nextTick(() => {
        console.log('在 nextTick 中检查路由:', router.currentRoute.value)
      })
    })
    .catch((error) => console.error('路由跳转失败:', error))
}
// 更多按钮弹出菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const popupMenuRef = ref<InstanceType<typeof PopupMenu> | null>(null)
const isMenuVisible = ref(false)
const menuPosition = reactive({ x: 0, y: 0 })

const {
  menuItems: noteMenuItems,
  resetDeleteState,
  showConfirmModal,
  cancelDeleteWhiteboard,
  handleDeleteWhiteboard,
  confirmDeleteWhiteboard
} = useNoteMenu({
  noteId: props.whiteboard.id,
  whiteboardId: props.whiteboard.id,
  menuItems: ['deleteWhiteboard']
})
const toggleMenu = (event: MouseEvent) => {
  event.preventDefault()
  isMenuVisible.value = !isMenuVisible.value
  if (isMenuVisible.value && moreBtnRef.value) {
    const rect = moreBtnRef.value.getBoundingClientRect()
    menuPosition.x = rect.left
    menuPosition.y = rect.bottom
    isMenuVisible.value = true
    nextTick(() => {
      popupMenuRef.value?.openMenu()
    })
  }
}
const handleMenuItemClick = (item: MenuItem) => {
  if (item.name === 'deleteWhiteboard') {
    handleDeleteWhiteboard()
    closeMenu()
  } else {
    item.action()
    closeMenu()
  }
}

const closeMenu = () => {
  isMenuVisible.value = false
  resetDeleteState()
}
</script>

<style lang="scss" scoped>
.whiteboard-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease-in-out;

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
