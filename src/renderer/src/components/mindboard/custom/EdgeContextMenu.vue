<template>
  <div v-if="show" class="edge-context-menu" :style="menuStyle">
    <div class="menu-item" title="删除" @click="$emit('delete')">
      <DeleteOne theme="outline" size="16" fill="var(--color-icon-default)" />
    </div>
    <div
      ref="colorButtonRef"
      class="menu-item"
      title="设置颜色"
      @click="showColorMenu = !showColorMenu"
    >
      <Platte theme="outline" size="16" fill="var(--color-icon-default)" />

      <!-- 颜色选择子菜单 -->
      <Teleport to="body">
        <div
          v-if="showColorMenu"
          ref="colorSubmenuRef"
          class="color-picker"
          :style="colorSubmenuStyle"
          @mouseleave="handleColorSubmenuLeave"
        >
          <div class="color-list">
            <div
              v-for="color in edgeColors"
              :key="color.value"
              class="color-item"
              @click.stop="handleColorSelect(color.value)"
            >
              <div class="color-dot" :style="{ background: color.value }"></div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <div
      ref="styleButtonRef"
      class="menu-item"
      title="设置样式"
      @click="showStyleMenu = !showStyleMenu"
    >
      <CurveAdjustment theme="outline" size="16" fill="var(--color-icon-default)" />

      <!-- 样式子菜单 -->
      <Teleport to="body">
        <div
          v-if="showStyleMenu"
          ref="styleSubmenuRef"
          class="style-submenu"
          :style="submenuStyle"
          @mouseleave="handleSubmenuLeave"
        >
          <div
            v-for="style in edgeStyles"
            :key="style.type"
            class="style-item"
            @click.stop="handleStyleSelect(style.type)"
          >
            <span class="style-icon">{{ style.icon }}</span>
            <span class="style-label">{{ style.label }}</span>
          </div>
        </div>
      </Teleport>
    </div>

    <div
      ref="markerButtonRef"
      class="menu-item"
      title="标记样式"
      @click="showMarkerMenu = !showMarkerMenu"
    >
      <Change theme="outline" size="16" fill="var(--color-icon-default)" />

      <!-- 标记样式子菜单 -->
      <Teleport to="body">
        <div
          v-if="showMarkerMenu"
          ref="markerSubmenuRef"
          class="style-submenu"
          :style="markerSubmenuStyle"
          @mouseleave="handleMarkerSubmenuLeave"
        >
          <div
            v-for="marker in markerStyles"
            :key="marker.type"
            class="style-item"
            @click.stop="handleMarkerSelect(marker.type)"
          >
            <span class="style-icon">{{ marker.icon }}</span>
            <span class="style-label">{{ marker.label }}</span>
          </div>
        </div>
      </Teleport>
    </div>
    <div class="menu-item" title="动画效果" @click="$emit('toggleAnimation')">
      <Play theme="outline" size="16" fill="var(--color-icon-default)" />
    </div>
    <div class="menu-item" title="编辑标签" @click="$emit('edit')">
      <Edit theme="outline" size="16" fill="var(--color-icon-default)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, ref } from 'vue'
import { CurveAdjustment, DeleteOne, Edit, Platte, Play, Change } from '@icon-park/vue-next'
import { useFloating } from '@floating-ui/vue'
import { flip, offset, shift } from '@floating-ui/dom'
import type { CSSProperties } from 'vue'
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits([
  'delete',
  'edit',
  'updateStyle',
  'toggleAnimation',
  'updateMarker',
  'updateColor'
])

const showStyleMenu = ref(false)
const styleButtonRef = ref<HTMLElement | null>(null)
const styleSubmenuRef = ref<HTMLElement | null>(null)
const showMarkerMenu = ref(false)
const markerButtonRef = ref<HTMLElement | null>(null)
const markerSubmenuRef = ref<HTMLElement | null>(null)
const showColorMenu = ref(false)
const colorButtonRef = ref<HTMLElement | null>(null)
const colorSubmenuRef = ref<HTMLElement | null>(null)

const edgeStyles = [
  { type: 'default', label: '贝塞尔曲线', icon: '↪' },
  { type: 'straight', label: '直线', icon: '→' },
  { type: 'step', label: '步进线', icon: '⌐' },
  { type: 'smoothstep', label: '平滑步进', icon: '⌒' }
]

const markerStyles = [
  { type: 'none', label: '无标记', icon: '—' },
  { type: 'single', label: '单向箭头', icon: '→' },
  { type: 'double', label: '双向箭头', icon: '↔' }
]

const edgeColors = [
  { value: '#C0C0C0', label: '默认灰色' },
  { value: 'var(--color-primary)', label: '主色' },
  { value: 'var(--color-warning)', label: '警告色' },
  { value: 'var(--color-danger)', label: '危险色' },
  { value: 'var(--color-blue)', label: '蓝色' }
]

const handleStyleSelect = (styleType: string) => {
  showStyleMenu.value = false
  emit('updateStyle', styleType)
}

const handleMarkerSelect = (markerType: string) => {
  showMarkerMenu.value = false
  emit('updateMarker', markerType)
}

const handleColorSelect = (colorValue: string) => {
  showColorMenu.value = false
  emit('updateColor', colorValue)
}

// 处理子菜单鼠标离开事件
const handleSubmenuLeave = (event: MouseEvent) => {
  // 检查鼠标是否移动到了父菜单项上
  const menuItem = (event.target as HTMLElement).closest('.menu-item')
  if (!menuItem) {
    showStyleMenu.value = false
  }
}

const handleMarkerSubmenuLeave = (event: MouseEvent) => {
  const menuItem = (event.target as HTMLElement).closest('.menu-item')
  if (!menuItem) {
    showMarkerMenu.value = false
  }
}

const handleColorSubmenuLeave = (event: MouseEvent) => {
  const menuItem = (event.target as HTMLElement).closest('.menu-item')
  if (!menuItem) {
    showColorMenu.value = false
  }
}

// 使用 floating-ui 设置子菜单位置
const { floatingStyles } = useFloating(styleButtonRef, styleSubmenuRef, {
  placement: 'bottom-start',
  middleware: [
    offset(4), // 设置偏移量
    flip(), // 自动翻转以保持在可视区域内
    shift() // 在需要时偏移以保持在可视区域内
  ]
})

// 子菜单样式
const submenuStyle = computed((): CSSProperties => {
  const styles = floatingStyles.value
  return {
    ...styles, // 先展开 floating 的样式
    zIndex: 1001 // 然后覆盖需要的属性
  }
})

// 使用 floating-ui 设置标记子菜单位置
const { floatingStyles: markerFloatingStyles } = useFloating(markerButtonRef, markerSubmenuRef, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift()]
})

const markerSubmenuStyle = computed((): CSSProperties => {
  const styles = markerFloatingStyles.value
  return {
    ...styles,
    zIndex: 1001
  }
})

// 使用 floating-ui 设置颜色子菜单位置
const { floatingStyles: colorFloatingStyles } = useFloating(colorButtonRef, colorSubmenuRef, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift()]
})

const colorSubmenuStyle = computed((): CSSProperties => {
  const styles = colorFloatingStyles.value
  return {
    ...styles,
    zIndex: 1001
  }
})

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

// 添加关闭子菜单的方法
const closeAllSubmenus = () => {
  showStyleMenu.value = false
  showMarkerMenu.value = false
  showColorMenu.value = false
}

// 暴露方法给父组件
defineExpose({
  closeStyleMenu: closeAllSubmenus
})

// 添加当前选中的颜色状态
// const currentColor = computed(() => {
//   const edge = findEdge(props.selectedEdgeId)
//   return edge?.data?.color || '#C0C0C0'
// })
</script>

<style lang="scss" scoped>
.edge-context-menu {
  position: absolute;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px;
  box-shadow: var(--shadow-card);
  z-index: 1000;
  display: flex;
  gap: 4px;

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative;

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

    &:hover {
      background: var(--color-hover);
    }
  }
}

.style-submenu {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 4px;
  box-shadow: var(--shadow-card);
  min-width: 140px;

  .style-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background: var(--color-hover);
    }

    .style-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }

    .style-label {
      font-size: 14px;
      color: var(--color-text);
    }
  }
}

.color-picker {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

  .color-list {
    display: flex;
    gap: 6px;

    .color-item {
      position: relative;
      cursor: pointer;
      padding: 2px;
      border-radius: 6px;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover);
        transform: translateY(-1px);
      }

      &.active {
        background: var(--color-hover);

        .color-dot::after {
          content: '';
          position: absolute;
          inset: -2px;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
        }
      }

      .color-dot {
        position: relative;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        transition: transform 0.2s ease;

        &::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }
      }
    }
  }
}
</style>
