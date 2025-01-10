<template>
  <div ref="cardTypeDropdown" class="cardtype-dropdown" @click.stop="toggleMenu">
    <div class="icon">
      <CategoryManagement
        theme="outline"
        size="18"
        fill="var(--color-icon-menu-default)"
        :strokeWidth="3"
      />
    </div>
    <div class="name">{{ selectedTypesName }}</div>
    <div class="icon down-icon">
      <Down theme="outline" size="14" fill="var(--color-text-secondary)" :strokeWidth="3" />
    </div>
    <!-- 下拉菜单 -->
    <div v-if="showMenu" class="dropdown-menu" :class="{ show: showMenu }" :style="menuStyle">
      <!-- 固定选项：所有类型 -->
      <div
        class="dropdown-item"
        :class="{ active: modelValue.length === 0 }"
        @click.stop="select([])"
      >
        <div class="dropdown-item-content">
          <div class="icon">
            <CategoryManagement
              theme="outline"
              size="18"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">所有类型</div>
        </div>
      </div>

      <div class="dropdown-divider"></div>

      <!-- 卡片类型列表 -->
      <div
        v-for="type in cardTypes"
        :key="type.id"
        class="dropdown-item"
        :class="{ active: modelValue.includes(type.id) }"
        @click.stop="toggleType(type.id)"
      >
        <div class="dropdown-item-content">
          <div class="icon">
            <component
              :is="type.icon"
              theme="outline"
              size="18"
              fill="var(--color-icon-menu-default)"
              :strokeWidth="3"
            />
          </div>
          <div class="name">{{ type.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CategoryManagement, Notes, Bookshelf, ListAlphabet, Down } from '@icon-park/vue-next'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const showMenu = ref(false)
const cardTypeDropdown = ref<HTMLElement | null>(null)
const menuStyle = ref({})

// 固定的卡片类型列表
const cardTypes = [
  { id: 'Maincard', name: '主要卡片', icon: Notes },
  { id: 'Bibcard', name: '文献卡片', icon: Bookshelf },
  { id: 'Indexcard', name: '索引卡片', icon: ListAlphabet }
]

// 选中的类型名称
const selectedTypesName = computed(() => {
  if (props.modelValue.length === 0) return '所有类型'
  if (props.modelValue.length === 1) {
    const type = cardTypes.find((t) => t.id === props.modelValue[0])
    return type?.name || '卡片类型'
  }
  return `已选 ${props.modelValue.length} 种`
})

// 切换菜单显示状态
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (showMenu.value) {
    updateMenuPosition()
  }
}

// 选择类型
const select = (types: string[]) => {
  emit('update:modelValue', types)
  showMenu.value = false
}

// 切换单个类型
const toggleType = (typeId: string) => {
  const newTypes = [...props.modelValue]
  const index = newTypes.indexOf(typeId)
  if (index === -1) {
    newTypes.push(typeId)
  } else {
    newTypes.splice(index, 1)
  }
  emit('update:modelValue', newTypes)
}

// 更新菜单位置
const updateMenuPosition = () => {
  if (!cardTypeDropdown.value) return
  const rect = cardTypeDropdown.value.getBoundingClientRect()
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  menuStyle.value = {
    top: `${rect.bottom + scrollTop + 8}px`,
    left: `${rect.left}px`
  }
}

// 全局点击事件处理
const handleGlobalClick = (event: MouseEvent) => {
  if (cardTypeDropdown.value && !cardTypeDropdown.value.contains(event.target as Node)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  window.addEventListener('scroll', updateMenuPosition)
  window.addEventListener('resize', updateMenuPosition)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('scroll', updateMenuPosition)
  window.removeEventListener('resize', updateMenuPosition)
})
</script>

<style lang="scss" scoped>
.cardtype-dropdown {
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
    color: var(--color-text-primary);
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
  padding: 8px;
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
    // 修改激活状态的样式
    &.active {
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

  .dropdown-divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 6px 0;
  }
}
</style>
