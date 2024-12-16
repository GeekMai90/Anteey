<template>
  <div class="mindboard-card">
    <div class="mindboard-card-header">
      <!-- 更多功能菜单按钮 -->
      <div ref="moreBtnRef" class="more-btn" @click.stop="toggleMoreMenu">
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" :stroke-width="3" />
        </div>
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
    <div class="mindboard-card-content" @dblclick.stop="openMindBoard(mindBoard.id)">
      <div class="mindboard-name">
        <div class="icon">
          <Workbench
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">
          {{ mindBoard.name }}
        </div>
      </div>
    </div>
    <div class="mindboard-card-footer">
      <div class="cardCount">{{ elementCount }}</div>
      <div class="cardCountText">个元素</div>
    </div>
    <ConfirmModal
      :show="showConfirmModal"
      title="删除思维板"
      message="确定要删除这个思维板吗？此操作不可撤销。"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed, ref } from 'vue'
import type { MindBoard } from '@renderer/types/mindboard'
import { Workbench, More } from '@icon-park/vue-next'
import { useMindBoardStore } from '@renderer/stores/mindboardStore'
import router from '@renderer/router'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import ConfirmModal from '@renderer/components/ConfirmModal.vue'
import { useMenu } from '@renderer/composables/useMenu'

const props = defineProps<{
  mindBoard: MindBoard
}>()

const mindBoardStore = useMindBoardStore()

// 计算元素数量（包括卡片和连接）
const elementCount = computed(() => {
  return props.mindBoard.elements.length + props.mindBoard.connections.length
})

// 打开思维板详情
const openMindBoard = async (id: string) => {
  try {
    await router.push({
      path: `/mindboard/${id}`,
      replace: true
    })
  } catch (error) {
    console.error('Navigation failed:', error)
  }
}

// 删除相关状态和方法
const showConfirmModal = ref(false)
const confirmDelete = async () => {
  try {
    await mindBoardStore.deleteMindBoard(props.mindBoard.id)
    showConfirmModal.value = false
  } catch (error) {
    console.error('删除思维板失败:', error)
  }
}
const cancelDelete = () => {
  showConfirmModal.value = false
}

// 菜单项定义
const menuItems = [
  {
    name: 'delete',
    label: '删除思维板',
    action: () => {
      showConfirmModal.value = true
    }
  }
]

// 更多按钮菜单
const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const {
  menuState: moreMenuState,
  toggleMenu: toggleMoreMenu,
  closeMenu: closeMoreMenu
} = useMenu({
  buttonRef: moreBtnRef,
  menuRef: moreMenuRef
})

// 菜单点击事件
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}
</script>

<style lang="scss" scoped>
.mindboard-card {
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

  &:hover {
    box-shadow:
      0 10px 15px rgba(0, 0, 0, 0.1),
      0 4px 6px rgba(0, 0, 0, 0.05);
    .mindboard-card-header {
      opacity: 1;
    }
  }
}
.mindboard-card-header {
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
.mindboard-card-content {
  flex-grow: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.mindboard-name {
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
.mindboard-card-footer {
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
