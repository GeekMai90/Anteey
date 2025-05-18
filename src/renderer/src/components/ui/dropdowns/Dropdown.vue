<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'
import Button from '@renderer/components/ui/buttons/Button.vue'
import Switch from '@renderer/components/ui/Switch.vue'
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
  switchable?: never
}

interface DividerDropdownItem {
  divided: true
  label?: never
  key?: never
  icon?: never
  disabled?: never
  danger?: never
  active?: never
  switchable?: never
}

interface SwitchableDropdownItem extends BaseDropdownItem {
  label: string
  key: string
  switchable: true
  checked: boolean
  divided?: never
}

type DropdownItem = NormalDropdownItem | DividerDropdownItem | SwitchableDropdownItem

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
  showArrow?: boolean // 新增: 是否显示下拉箭头
  placeholder?: string // 未选择时显示的文本
  emptyText?: string // 菜单项为空时显示的文本
  defaultIcon?: Component // 默认图标
  isActive?: boolean // 新增：控制按钮是否处于激活状态
  forceBottom?: boolean // 新增：是否强制菜单在按钮下方显示
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
  showSelected: false,
  showArrow: false,
  placeholder: '',
  emptyText: '暂无选项',
  defaultIcon: undefined,
  isActive: false,
  forceBottom: false // 新增：默认不强制在下方显示
})

const emit = defineEmits<{
  select: [key: string, item: DropdownItem]
  'visible-change': [visible: boolean]
  click: [event: MouseEvent]
  'switch-change': [key: string, checked: boolean]
}>()

const visible = ref(false)
const buttonInstance = ref<{ el: HTMLElement } | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const selectedItem = ref<NormalDropdownItem | SwitchableDropdownItem | null>(null)

const computedPlacement = computed(() => {
  if (props.placement === 'bottom' || props.placement === 'top') {
    const align = props.align === 'center' ? '' : `-${props.align}`
    return `${props.placement}${align}` as Placement
  } else if (props.placement === 'left' || props.placement === 'right') {
    let alignValue = ''
    if (props.align === 'start') {
      alignValue = '-start'
    } else if (props.align === 'end') {
      alignValue = '-end'
    }
    return `${props.placement}${alignValue}` as Placement
  }

  return props.placement as Placement
})

const { floatingStyles, update } = useFloating(
  computed(() => buttonInstance.value?.el || null),
  dropdownRef,
  {
    placement: computedPlacement,
    middleware: [
      offset(8),
      ...(!props.forceBottom
        ? [
            flip({
              fallbackPlacements: ['top', 'bottom', 'left', 'right']
            })
          ]
        : []),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate,
    strategy: 'fixed'
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
    // console.log('Dropdown visible, updating position with placement:', computedPlacement.value)
    nextTick(() => {
      update()
    })
  }
})

watch([() => props.align, () => props.placement], () => {
  if (visible.value && update) {
    // console.log('Alignment changed, updating position:', props.align, props.placement)
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
  return props.placeholder || null
})

const hasItems = computed(() => {
  return props.items && props.items.length > 0
})

const displayIcon = computed(() => {
  if (props.icon) return props.icon
  if (props.iconOnly && props.defaultIcon && !selectedItem.value) return props.defaultIcon
  return undefined
})

const handleSwitchChange = (item: SwitchableDropdownItem, checked: boolean) => {
  emit('switch-change', item.key, checked)
}
</script>

<template>
  <div class="ant-dropdown-wrapper">
    <Button
      ref="buttonInstance"
      :type="type"
      :size="size"
      :icon="displayIcon"
      :disabled="disabled"
      :loading="loading"
      :tooltip="tooltip && { ...tooltip }"
      :height="height"
      :iconOnly="iconOnly"
      :dropdown="showArrow"
      :class="{
        'icon-with-arrow': iconOnly && showArrow,
        'is-active': isActive
      }"
      @click="handleButtonClick"
      @mouseenter="handleTriggerMouseEnter"
      @mouseleave="handleTriggerMouseLeave"
    >
      <template v-if="!iconOnly">
        <template v-if="showSelected">
          {{ buttonText || placeholder }}
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
      :class="{ 'custom-width': props.width }"
      @mouseenter="handleDropdownMouseEnter"
      @mouseleave="handleDropdownMouseLeave"
    >
      <div v-if="!hasItems" class="ant-dropdown-empty">
        {{ emptyText }}
      </div>
      <ul v-else class="ant-dropdown-menu">
        <template v-for="item in items" :key="item.key">
          <template v-if="item.divided">
            <div class="ant-dropdown-menu-divider"></div>
          </template>
          <template v-else-if="item.switchable">
            <li
              class="ant-dropdown-menu-item ant-dropdown-menu-item-switchable"
              :class="{ 'ant-dropdown-menu-item-disabled': item.disabled }"
            >
              <div v-if="item.icon" class="item-icon">
                <component :is="item.icon" theme="outline" size="18" :strokeWidth="3" />
              </div>
              <span class="item-label">{{ item.label }}</span>
              <div class="item-switch">
                <Switch
                  :model-value="(item as SwitchableDropdownItem).checked"
                  @update:model-value="
                    (val: boolean) => handleSwitchChange(item as SwitchableDropdownItem, val)
                  "
                />
              </div>
            </li>
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

  :deep(.is-active) {
    background: rgba(var(--color-primary-rgb), 0.1);
    border-color: var(--color-primary);
    color: var(--color-primary);

    .button-icon {
      color: var(--color-primary);
    }

    &:hover {
      background: rgba(var(--color-primary-rgb), 0.15);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  :deep(.icon-with-arrow) {
    padding-right: 10px !important;
    width: 50px !important;

    .button-icon {
      margin-right: 4px;
    }

    .dropdown-arrow {
      margin-left: 2px;
    }
  }
}

.ant-dropdown {
  position: absolute;
  background-color: var(--color-bg-primary);
  border-color: var(--color-border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 9999;
  min-width: 100px;
  max-width: 400px;
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 12px;
  white-space: nowrap;

  &.custom-width {
    width: v-bind('typeof props.width === "number" ? `${props.width}px` : props.width');
    min-width: v-bind('props.width');
  }
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

.ant-dropdown-menu-item-switchable {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  cursor: default;

  &:hover {
    background-color: var(--color-hover-button);
  }

  .item-label {
    flex-grow: 1;
    margin-right: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-switch {
    display: flex;
    align-items: center;
    margin-left: 12px;
  }
}

.ant-dropdown-empty {
  padding: 12px 16px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
}
</style>
