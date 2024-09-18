<!-- src/components/CardboxDropdownMenu.vue -->
<template>
  <div v-if="isOpen" class="dropdown-menu">
    <template v-if="cardBoxes.length > 0">
      <div
        v-for="box in cardBoxes"
        :key="box.id"
        class="dropdown-item"
        :class="{ active: isBoxSelected(box) }"
        @click.stop="selectCardBox(box)"
      >
        <div class="icon">
          <component
            :is="box.id === '0000' ? FileCabinet : Box"
            theme="outline"
            size="18"
            fill="#b6b6b6"
          />
        </div>
        <div class="name">
          {{ box.name || '请添加卡片盒' }}
        </div>
      </div>
    </template>
    <div v-else class="empty-state">暂无卡片盒，请添加新的卡片盒</div>
  </div>
</template>

<script setup lang="ts">
import { FileCabinet, Box } from '@icon-park/vue-next'
import { CardBox } from '@renderer/types/Note'

const props = defineProps<{
  isOpen: boolean
  cardBoxes: CardBox[]
  selectedCardBox: CardBox | null
}>()

const emit = defineEmits(['update:selectedCardBox', 'toggleMoreActions', 'close'])

const selectCardBox = (box: CardBox) => {
  emit('update:selectedCardBox', box)
  emit('close')
}

const isBoxSelected = (box: CardBox) => {
  return props.selectedCardBox && props.selectedCardBox.id === box.id
}
</script>

<style scoped lang="scss">
.dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%); // 居中对齐
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  min-width: 200px;
  width: max-content; // 使用 max-content 确保菜单宽度适应内容
  max-width: 300px; // 设置最大宽度，避免过宽
  overflow-y: auto;
  padding: 6px 12px;
  white-space: nowrap;
}

.dropdown-item {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px 4px;
  margin: 2px;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    // &:hover:not(:disabled) {
    //   background-color: rgba(0, 0, 0, 0.05);
    // }

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

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 13px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.delete {
    color: #ff4d4f;
  }
}
</style>
