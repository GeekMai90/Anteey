<template>
  <div
    ref="cardboxBtnRef"
    class="cardbox-button"
    :class="{ 'cardbox-button--large': size === 'large' }"
    @click.stop="toggleCardboxMenu"
  >
    <div v-tooltip.bottom="tooltipConfig" class="icon">
      <Install
        theme="outline"
        :size="size === 'large' ? 18 : 16"
        fill="var(--color-icon-default)"
        :strokeWidth="3"
      />
    </div>
    <CardboxDropdownMenu
      ref="cardboxMenuRef"
      :is-open="cardboxMenuState.isOpen"
      :note-id="noteId"
      :current-cardbox-id="currentCardboxId"
      :button-ref="cardboxBtnRef"
      @close="closeCardboxMenu"
      @update="handleCardboxUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { Install } from '@icon-park/vue-next'
import { ref } from 'vue'
import { useMenu } from '@renderer/composables/useMenu'
import CardboxDropdownMenu from '@renderer/components/cardbox/CardboxDropdownMenu.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'

const props = withDefaults(
  defineProps<{
    noteId: string
    currentCardboxId?: string
    size?: 'default' | 'large'
  }>(),
  {
    size: 'default'
  }
)

const noteStore = useNoteStore()

// tooltip配置
const tooltipConfig = {
  content: '设置卡片盒',
  delay: { show: 1000 }
}

const cardboxBtnRef = ref<HTMLElement | null>(null)
const cardboxMenuRef = ref<HTMLElement | null>(null)

// 使用 useMenu 管理菜单状态
const {
  menuState: cardboxMenuState,
  toggleMenu: toggleCardboxMenu,
  closeMenu: closeCardboxMenu
} = useMenu({
  buttonRef: cardboxBtnRef,
  menuRef: cardboxMenuRef
})

// 修改处理卡片盒更新的方法
const handleCardboxUpdate = async (cardBoxId: string) => {
  try {
    // 修正方法名
    await noteStore.updateNoteCardBox(props.noteId, cardBoxId)
  } catch (error) {
    console.error('更新卡片盒失败:', error)
    message.error('更新卡片盒失败')
  }
}
</script>

<style lang="scss" scoped>
.cardbox-button {
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
