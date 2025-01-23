<template>
  <div class="note-toolbar">
    <div class="toolbar-buttons">
      <div
        v-tooltip.top="{ content: '从白板移除', delay: { show: 1000 } }"
        class="toolbar-button"
        @click="$emit('delete')"
      >
        <div class="icon">
          <Delete theme="outline" size="16" fill="var(--color-text-secondary)" />
        </div>
      </div>

      <div class="toolbar-button color-button">
        <div
          v-tooltip.top="{ content: '设置边框颜色', delay: { show: 1000 } }"
          class="icon"
          @click="toggleColorPicker"
        >
          <Platte theme="outline" size="16" fill="var(--color-text-secondary)" />
        </div>
        <div v-if="showColorPicker" class="color-menu">
          <div
            v-tooltip.top="{ content: '默认', delay: { show: 1000 } }"
            class="color-item default"
            @click="selectColor(null)"
          >
            <div class="color-circle">
              <Close theme="outline" size="12" :fill="currentColor === null ? '#fff' : '#666'" />
            </div>
          </div>
          <div
            v-for="color in colors"
            :key="color.value"
            v-tooltip.top="{ content: color.name, delay: { show: 1000 } }"
            class="color-item"
            :class="{ active: currentColor === color.value }"
            @click="selectColor(color.value)"
          >
            <div class="color-circle" :style="{ backgroundColor: color.value }"></div>
          </div>
        </div>
      </div>

      <div
        v-tooltip.top="{ content: '聚焦显示', delay: { show: 1000 } }"
        class="toolbar-button"
        @click="$emit('focus')"
      >
        <div class="icon">
          <FocusOne theme="outline" size="16" fill="var(--color-text-secondary)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Delete, Platte, FocusOne, Close } from '@icon-park/vue-next'

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'color', color: string | null): void
  (e: 'focus'): void
}>()

const showColorPicker = ref(false)
const currentColor = ref<string | null>(null)

const colors = [
  { name: '绿色', value: 'var(--color-primary)' },
  { name: '黄色', value: 'var(--color-yellow)' },
  { name: '蓝色', value: 'var(--color-blue)' },
  { name: '粉色', value: 'var(--color-pink)' }
]

const toggleColorPicker = () => {
  showColorPicker.value = !showColorPicker.value
}

const selectColor = (color: string | null) => {
  currentColor.value = color
  showColorPicker.value = false
  emit('color', color)
}
</script>

<style lang="scss" scoped>
.note-toolbar {
  position: absolute;
  z-index: 9999;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  padding: 4px;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  white-space: nowrap;

  left: 50%;
  top: -48px;
  transform: translateX(-50%);

  .toolbar-buttons {
    display: flex;
    gap: 4px;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
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

    &:hover {
      background-color: var(--color-hover-button);
    }

    &:active {
      background-color: var(--color-active-button);
    }
  }

  .color-button {
    position: relative;
  }

  .color-menu {
    position: absolute;
    display: flex;
    gap: 8px;
    padding: 6px;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-primary);
    z-index: 1000;
    top: 100%;
    left: 50%;
    transform: translateX(-40%);
    margin-top: 8px;
    min-width: 180px;
    justify-content: center;

    .color-item {
      cursor: pointer;
      border-radius: 4px;
      padding: 2px;

      &:hover {
        background-color: var(--color-hover-bg);
      }

      &.active {
        background-color: var(--color-hover-button);
      }

      .color-circle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.1);
        }
      }

      &.default .color-circle {
        background-color: var(--color-bg-primary);
      }

      &:not(.default) .color-circle {
        opacity: 1;
        border: none;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
      }
    }
  }
}
</style>
