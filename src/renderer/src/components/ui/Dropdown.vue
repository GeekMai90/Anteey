<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'
import Button from './Button.vue'
import type { Component } from 'vue'
import type { Placement } from '@floating-ui/vue'

interface BaseDropdownItem {
  icon?: any
  disabled?: boolean
  danger?: boolean
  active?: boolean
}

interface NormalDropdownItem extends BaseDropdownItem {
  label: string
  key: string
  divided?: never
}

interface DividerDropdownItem {
  divided: true
  label?: never
  key?: never
  icon?: never
  disabled?: never
  danger?: never
  active?: never
}

type DropdownItem = NormalDropdownItem | DividerDropdownItem

interface Props {
  items: DropdownItem[]
  // 按钮相关属性
  type?: 'default' | 'primary' | 'text' | 'link' | 'delete'
  size?: 'small' | 'medium' | 'large'
  icon?: Component
  disabled?: boolean
  loading?: boolean
  height?: number
  iconOnly?: boolean
  tooltip?: {
    content: string
    html?: boolean
    delay?: { show: number; hide?: number }
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }
  // 下拉菜单相关属性
  placement?: 'bottom' | 'top' | 'left' | 'right'
  trigger?: 'hover' | 'click'
  width?: string | number
  align?: 'start' | 'center' | 'end'
  showSelected?: boolean // 是否在按钮中显示选中项的文本
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'medium',
  placement: 'bottom',
  trigger: 'click',
  disabled: false,
  loading: false,
  width: undefined,
  align: 'start',
  height: 0,
  iconOnly: false,
  showSelected: false
})

const emit = defineEmits<{
  select: [key: string, item: DropdownItem]
  'visible-change': [visible: boolean]
  click: [event: MouseEvent]
}>()

const visible = ref(false)
const buttonInstance = ref<{ el: HTMLElement } | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const selectedItem = ref<NormalDropdownItem | null>(null)

const computedPlacement = computed(() => {
  const align = props.align === 'center' ? '' : `-${props.align}`
  return `${props.placement}${align}` as Placement
})

const { floatingStyles, update } = useFloating(
  computed(() => buttonInstance.value?.el || null),
  dropdownRef,
  {
    placement: computedPlacement,
    middleware: [
      offset(8),
      flip({
        fallbackPlacements: ['top', 'bottom']
      }),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate,
    strategy: 'absolute'
  }
)

const handleButtonClick = (event: MouseEvent) => {
  emit('click', event)
  if (props.disabled || props.loading) return
  if (props.trigger === 'click') {
    toggleDropdown()
  }
}

const toggleDropdown = () => {
  visible.value = !visible.value
  emit('visible-change', visible.value)
}

const handleItemSelect = (item: DropdownItem) => {
  if ('divided' in item) return
  if (item.disabled) return

  if (!('divided' in item)) {
    selectedItem.value = item
  }

  emit('select', item.key, item)
  visible.value = false
  emit('visible-change', false)
}

const handleClickOutside = (e: MouseEvent) => {
  if (
    visible.value &&
    dropdownRef.value &&
    !dropdownRef.value.contains(e.target as Node) &&
    buttonInstance.value?.el &&
    !buttonInstance.value.el.contains(e.target as Node)
  ) {
    visible.value = false
    emit('visible-change', false)
  }
}

let hoverTimer: NodeJS.Timeout | null = null

const handleTriggerMouseEnter = () => {
  if (props.disabled || props.trigger !== 'hover') return
  if (hoverTimer) clearTimeout(hoverTimer)
  visible.value = true
  emit('visible-change', true)
}

const handleTriggerMouseLeave = () => {
  if (props.disabled || props.trigger !== 'hover') return
  hoverTimer = setTimeout(() => {
    visible.value = false
    emit('visible-change', false)
  }, 200)
}

const handleDropdownMouseEnter = () => {
  if (props.disabled || props.trigger !== 'hover') return
  if (hoverTimer) clearTimeout(hoverTimer)
}

const handleDropdownMouseLeave = () => {
  if (props.disabled || props.trigger !== 'hover') return
  hoverTimer = setTimeout(() => {
    visible.value = false
    emit('visible-change', false)
  }, 200)
}

const setInitialSelected = () => {
  const activeItem = props.items.find(
    (item) => !('divided' in item) && item.active
  ) as NormalDropdownItem
  if (activeItem) {
    selectedItem.value = activeItem
  }
}

onMounted(() => {
  setInitialSelected()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (hoverTimer) clearTimeout(hoverTimer)
})

watch(visible, (newValue) => {
  if (newValue && update) {
    nextTick(() => {
      update()
    })
  }
})

watch(
  () => props.items,
  () => {
    setInitialSelected()
  },
  { deep: true }
)

const dropdownStyles = computed(() => {
  const styles: any = { ...floatingStyles.value }
  if (props.width) {
    styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  return styles
})

const buttonText = computed(() => {
  if (props.showSelected && selectedItem.value) {
    return selectedItem.value.label
  }
  return null
})
</script>

<template>
  <div class="ant-dropdown-wrapper">
    <Button
      ref="buttonInstance"
      :type="type"
      :size="size"
      :icon="icon"
      :disabled="disabled"
      :loading="loading"
      :tooltip="
        tooltip && {
          content: tooltip.content,
          html: tooltip.html,
          delay: tooltip.delay,
          placement: tooltip.placement || 'bottom'
        }
      "
      :height="height"
      :iconOnly="iconOnly"
      :dropdown="!iconOnly && !showSelected"
      @click="handleButtonClick"
      @mouseenter="handleTriggerMouseEnter"
      @mouseleave="handleTriggerMouseLeave"
    >
      <template v-if="!iconOnly">
        <template v-if="showSelected">
          {{ buttonText }}
        </template>
        <template v-else>
          <slot></slot>
        </template>
      </template>
    </Button>

    <div
      v-show="visible"
      ref="dropdownRef"
      class="ant-dropdown"
      :style="dropdownStyles"
      @mouseenter="handleDropdownMouseEnter"
      @mouseleave="handleDropdownMouseLeave"
    >
      <ul class="ant-dropdown-menu">
        <template v-for="item in items" :key="item.key">
          <template v-if="item.divided">
            <div class="ant-dropdown-menu-divider"></div>
          </template>
          <template v-else>
            <li
              :class="[
                'ant-dropdown-menu-item',
                { 'ant-dropdown-menu-item-disabled': item.disabled },
                { 'ant-dropdown-menu-item-danger': item.danger },
                { 'ant-dropdown-menu-item-active': item.active }
              ]"
              @click="handleItemSelect(item)"
            >
              <div v-if="item.icon" class="item-icon">
                <component :is="item.icon" theme="outline" size="18" :strokeWidth="3" />
              </div>
              <span class="item-label">{{ item.label }}</span>
            </li>
          </template>
        </template>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ant-dropdown-wrapper {
  display: inline-block;
  position: relative;
}

.ant-dropdown {
  position: absolute;
  background-color: var(--color-bg-primary);
  border-color: var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 120px;
  max-width: 400px;
  width: var(--dropdown-width, auto);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 12px;
  white-space: nowrap;
}

.ant-dropdown-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ant-dropdown-menu-item {
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
  min-height: 32px;
  box-sizing: border-box;

  &:hover {
    background-color: var(--color-hover-button);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.ant-dropdown-menu-item-active {
    background-color: var(--color-primary-light);
    color: var(--color-primary);

    .item-icon {
      :deep(svg) {
        color: var(--color-primary);
      }
    }

    .item-label {
      color: var(--color-primary);
    }

    &:hover {
      background-color: var(--color-primary-light);
    }
  }

  .item-icon {
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
      width: 16px;
      height: 16px;
      color: var(--color-icon-primary);
    }
  }

  .item-label {
    flex-grow: 0;
    text-align: left;
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 400;
    margin-left: 6px;
    white-space: nowrap;
    writing-mode: horizontal-tb;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 20px;
    user-select: none;
  }
}

.ant-dropdown-menu-item-disabled {
  opacity: 0.5;
  cursor: not-allowed;

  &:hover {
    background-color: transparent;
  }
}

.ant-dropdown-menu-item-danger {
  .item-label {
    color: #ff4d4f !important;
  }

  :deep(svg) {
    color: #ff4d4f !important;
  }
}

.ant-dropdown-menu-divider {
  height: 1px;
  margin: 4px 0;
  background-color: var(--color-border);
}
</style>
