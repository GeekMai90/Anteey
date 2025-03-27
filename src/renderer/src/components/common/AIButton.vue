<template>
  <div
    ref="aiBtnRef"
    class="ai-button"
    :class="{ 'ai-button--large': size === 'large' }"
    @click.stop="toggleAIMenu"
  >
    <div v-tooltip.bottom="tooltipConfig" class="icon">
      <RobotOne
        theme="outline"
        :size="size === 'large' ? 18 : 16"
        fill="var(--color-icon-default)"
        :strokeWidth="3"
      />
    </div>
    <!-- AI功能菜单 -->
    <PopupMenu
      ref="aiMenuRef"
      :show="aiMenuState.isOpen"
      :button-ref="aiBtnRef"
      :menuItems="agentMenuItems"
      emptyText="暂无可用的 AI 助理"
      @close="closeAIMenu"
      @itemClick="handleAgentMenuItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { RobotOne } from '@icon-park/vue-next'
import { ref, computed } from 'vue'
import { useAgentStore } from '@renderer/stores/agentStore'
import { useMenu } from '@renderer/composables/useMenu'
import PopupMenu from '@renderer/components/common/PopupMenu.vue'
import type { MenuItem } from '@renderer/components/common/PopupMenu.vue'

// 合并 props 定义和默认值
const props = withDefaults(
  defineProps<{
    noteId: string
    size?: 'default' | 'large'
  }>(),
  {
    size: 'default'
  }
)

// tooltip配置
const tooltipConfig = {
  content: 'AI助手',
  delay: { show: 1000 }
}

const agentStore = useAgentStore()
const aiBtnRef = ref<HTMLElement | null>(null)
const aiMenuRef = ref<HTMLElement | null>(null)

const {
  menuState: aiMenuState,
  toggleMenu: toggleAIMenu,
  closeMenu: closeAIMenu
} = useMenu({
  buttonRef: aiBtnRef,
  menuRef: aiMenuRef
})

// 获取Agent菜单项
const agentMenuItems = computed(() => {
  return agentStore.generateAgentMenuItems(props.noteId)
})

// 处理Agent菜单项点击
const handleAgentMenuItemClick = (item: MenuItem) => {
  item.action()
  closeAIMenu()
}
</script>

<style lang="scss" scoped>
.ai-button {
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
