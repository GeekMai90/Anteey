<template>
  <div
    ref="moreBtnRef"
    v-tooltip:[tooltipPlacement]="tooltipConfig"
    class="more-button"
    :class="{ 'more-button--large': size === 'large' }"
    @click.stop="toggleMoreMenu"
  >
    <div class="icon">
      <More
        theme="outline"
        :size="size === 'large' ? 18 : 16"
        fill="var(--color-icon-default)"
        :stroke-width="3"
      />
    </div>
    <PopupMenu
      ref="moreMenuRef"
      :show="moreMenuState.isOpen"
      :button-ref="moreBtnRef"
      :menuItems="noteMenuItems"
      @close="closeMoreMenu"
      @itemClick="handleMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { More } from '@icon-park/vue-next'
import { ref, computed } from 'vue'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'
import { useMenu } from '@renderer/composables/useMenu'

const props = withDefaults(
  defineProps<{
    noteId: string
    menuItems: string[]
    size?: 'default' | 'large'
    tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  {
    size: 'default',
    tooltipPlacement: 'top'
  }
)

// tooltip配置
const tooltipConfig = {
  content: '更多',
  delay: { show: 1000 }
}

const tooltipPlacement = computed(() => props.tooltipPlacement)

const moreBtnRef = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)

// 使用 useNoteMenu 获取菜单项
const { menuItems: noteMenuItems, resetDeleteState } = useNoteMenu({
  noteId: props.noteId,
  menuItems: props.menuItems
})

// 使用 useMenu 管理菜单状态
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

// 处理菜单项点击
const handleMenuItemClick = (item: MenuItem) => {
  item.action()
  if (item.name !== 'delete') {
    closeMoreMenu()
  }
}
</script>

<style lang="scss" scoped>
.more-button {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px;
  margin: 2px;
  width: 28px;
  height: 28px;
  justify-content: center;

  // 大尺寸样式
  &--large {
    width: 32px;
    height: 32px;
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

  // 大尺寸时的图标样式
  &--large .icon {
    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  &:hover {
    background-color: var(--color-icon-hover-bg);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
