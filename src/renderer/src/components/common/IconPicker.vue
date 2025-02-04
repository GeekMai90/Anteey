<template>
  <div class="icon-picker">
    <div class="icon-picker-header">
      <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索图标..." />
    </div>
    <div class="icon-grid">
      <div
        v-for="icon in filteredIcons"
        :key="icon.name"
        class="icon-item"
        :class="{ active: selectedIcon === icon.name }"
        @click="selectIcon(icon.name)"
      >
        <component
          :is="icon.component"
          theme="outline"
          size="20"
          :fill="
            selectedIcon === icon.name ? 'var(--color-primary)' : 'var(--color-text-secondary)'
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getIconComponent, getAvailableIcons } from '@renderer/utils/iconMap'
import type { IconName } from '@shared/types'
import { iconKeywords } from './iconKeywords'

// 获取可用的图标列表
const icons = getAvailableIcons().map((name: IconName) => ({
  name,
  component: getIconComponent(name),
  keywords: iconKeywords[name] || []
}))

const props = defineProps<{
  modelValue?: IconName
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: IconName): void
}>()

const searchQuery = ref('')
const selectedIcon = computed({
  get: () => props.modelValue || '',
  set: (value: IconName) => emit('update:modelValue', value)
})

const filteredIcons = computed(() => {
  if (!searchQuery.value) return icons
  const query = searchQuery.value.toLowerCase()
  return icons.filter(
    (icon) =>
      // 匹配图标名称
      icon.name.toLowerCase().includes(query) ||
      // 匹配关键词
      icon.keywords.some((keyword: string) => keyword.toLowerCase().includes(query))
  )
})

const selectIcon = (iconName: IconName) => {
  selectedIcon.value = iconName
}
</script>

<style scoped lang="scss">
.icon-picker {
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  border-radius: 8px;

  .icon-picker-header {
    padding: 12px;
    border-bottom: 1px solid var(--color-border);

    .search-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font-size: 13px;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .icon-grid {
    flex: 1;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    overflow-y: auto;

    .icon-item {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;

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

      &:hover {
        background: var(--color-hover-bg);
      }

      &.active {
        background: var(--color-primary-light);
      }
    }
  }
}
</style>
