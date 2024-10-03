<template>
  <div class="toolbar">
    <div
      v-tooltip.bottom="{ content: '展开编辑器', delay: { show: 1000 } }"
      class="expand-btn"
      @click="$emit('expand')"
    >
      <div class="icon">
        <ExpandTextInput theme="outline" size="16" fill="#b6b6b6" />
      </div>
    </div>
    <div class="toolbar-right">
      <div class="install-btn" @click="$emit('toggle-cardbox-menu')">
        <div v-tooltip.bottom="{ content: '设置卡片盒', delay: { show: 1000 } }" class="icon">
          <Install theme="outline" size="16" fill="#b6b6b6" />
        </div>
        <CardboxDropdownMenu
          :isOpen="isCardBoxMenuOpen"
          :cardBoxes="cardBoxes"
          :selectedCardBox="selectedCardBox"
          @update:selectedCardBox="$emit('select-card-box', $event)"
          @close="$emit('close-cardbox-menu')"
        />
      </div>
      <div class="connect-btn" @click="$emit('start-connection', $event)">
        <div v-tooltip.bottom="{ content: '连线', delay: { show: 1000 } }" class="icon">
          <Connection theme="outline" size="16" fill="var(--color-icon-default)" />
        </div>
      </div>
      <div
        class="more-btn"
        @click.stop="$emit('open-menu', $event)"
        @v-click-outside="$emit('close-menu')"
      >
        <div v-tooltip.bottom="{ content: '更多', delay: { show: 1000 } }" class="icon">
          <More theme="outline" size="16" fill="var(--color-icon-default)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExpandTextInput, Install, More, Connection } from '@icon-park/vue-next'
import CardboxDropdownMenu from './CardboxDropdownMenu.vue'
import { CardBox } from '../types/Note'

defineProps<{
  isCardBoxMenuOpen: boolean
  cardBoxes: CardBox[]
  selectedCardBox: CardBox | null
}>()

defineEmits([
  'expand',
  'toggle-cardbox-menu',
  'start-connection',
  'open-menu',
  'close-menu',
  'select-card-box',
  'close-cardbox-menu'
])
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  position: relative;

  .expand-btn {
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
  }
  .connect-btn,
  .install-btn {
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

    :deep(.dropdown-menu) {
      transform: translateX(-70%);
    }

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
  }

  .more-btn {
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

    :deep(.note-options-menu) {
      transform: translateX(-80%);
    }

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
  }

  .toolbar-right {
    display: flex;
    // gap: 10px;
  }
}
</style>
