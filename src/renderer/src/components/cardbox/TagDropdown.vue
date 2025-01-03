<template>
  <div ref="tagDropdown" class="tag-dropdown" @click.stop="toggleMenu">
    <div class="icon">
      <Tag theme="outline" size="18" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
    </div>
    <div class="name">{{ selectedTagName || '标签' }}</div>
    <div class="icon down-icon">
      <Down theme="outline" size="14" fill="var(--color-text-secondary)" :strokeWidth="3" />
    </div>
    <!-- 标签下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu" :class="{ show: showMenu }" :style="menuStyle">
      <!-- 固定选项：所有标签 -->
      <div
        class="dropdown-item"
        :class="{ active: modelValue.includes('all') }"
        @click.stop="select({ id: 'all', name: '所有标签' })"
      >
        <div class="dropdown-item-content">
          <div class="icon">
            <Tag theme="outline" size="18" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
          </div>
          <div class="name">所有标签</div>
        </div>
      </div>
      <!-- 固定选项：无标签 -->
      <div
        class="dropdown-item"
        :class="{ active: modelValue.includes('none') }"
        @click.stop="select({ id: 'none', name: '无标签' })"
      >
        <div class="dropdown-item-content">
          <div class="icon">
            <TagOne
              theme="outline"
              size="18"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">无标签</div>
        </div>
      </div>
      <!-- 分隔线 -->
      <div class="dropdown-divider"></div>

      <!-- 用户标签列表 -->
      <div
        v-for="tag in tags"
        :key="tag.id"
        class="dropdown-item"
        :class="{
          active: !modelValue.includes('all') && modelValue.includes(tag.id)
        }"
      >
        <div class="dropdown-item-content" @click.stop="select(tag)">
          <div class="icon">
            <TagOne
              theme="outline"
              size="18"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">{{ tag.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Tag, TagOne, Down } from '@icon-park/vue-next'
import type { Tag as TagType } from '@renderer/types/Note'

const props = defineProps<{
  modelValue: string[]
  tags: TagType[]
  selectedTag: TagType | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  select: [tag: TagType | { id: string; name: string }]
}>()

// 下拉菜单状态
const showMenu = ref(false)
const tagDropdown = ref<HTMLElement | null>(null)
const menuStyle = ref({})

// 选中的标签名称
const selectedTagName = computed(() => {
  // 如果选中了多个标签（即选择了"所有标签"）
  if (props.modelValue.length > 1) {
    return '所有标签'
  }
  // 如果选择了"无标签"
  if (props.modelValue.includes('none')) {
    return '无标签'
  }
  // 如果有单个选中的标签
  if (props.selectedTag) {
    return props.selectedTag.name
  }
  // 如果有单个标签ID，尝试从标签列表中找到对应的标签
  if (props.modelValue.length === 1) {
    const currentTag = props.tags.find((tag) => tag.id === props.modelValue[0])
    return currentTag?.name || '标签'
  }
  // 默认显示
  return '标签'
})

// 切换菜单显示状态
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    updateMenuPosition()
  }
}

// 选择标签
const select = async (tag: TagType | { id: string; name: string }) => {
  emit('select', tag)
  await nextTick()
  showMenu.value = false
}

// 更新菜单位置
const updateMenuPosition = () => {
  if (!tagDropdown.value) return

  const rect = tagDropdown.value.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop

  menuStyle.value = {
    top: `${rect.bottom + scrollTop + 8}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (tagDropdown.value && !tagDropdown.value.contains(event.target as Node)) {
    showMenu.value = false
  }
}

// 监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', updateMenuPosition)
  window.addEventListener('resize', updateMenuPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateMenuPosition)
  window.removeEventListener('resize', updateMenuPosition)
})
</script>

<style lang="scss" scoped>
.tag-dropdown {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  user-select: none;
  margin-left: 2px;
  height: 36px;
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

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 15px;
      height: 15px;
    }
  }

  .name {
    flex-grow: 0;
    text-align: left;
    color: var(--default-text-color);
    font-size: 14px;
    font-weight: 400;
    margin-left: 3px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    line-height: 1;
  }

  &:hover {
    background-color: var(--color-hover-bg);
  }
}

.dropdown-menu {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  padding: 8px 12px 8px 8px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #d0d0d0;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-track {
    background-color: #f0f0f0;
  }

  &.show {
    opacity: 1;
    visibility: visible;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background-color: var(--color-hover-bg);
    }

    &.active .dropdown-item-content {
      background-color: var(--color-hover-bg);
    }
  }

  .dropdown-item-content {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 6px;
    flex-grow: 1;

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
      line-height: 1;
    }
  }
}
.dropdown-divider {
  display: block;
  width: 100%;
  height: 1px;
  min-height: 1px; // 添加最小高度
  background-color: var(--color-border);
  margin: 6px 0;
  padding: 0;
  border: none;
}
</style>
