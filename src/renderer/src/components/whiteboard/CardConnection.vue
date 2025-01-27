<!-- src/renderer/src/components/CardConnection.vue -->
<template>
  <div
    class="connection-line-container"
    :style="containerStyle"
    @click="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @dblclick.stop="startEditing"
  >
    <svg class="connection-line" :width="svgWidth" :height="svgHeight">
      <!-- 定义箭头标记 -->
      <defs>
        <marker
          :id="arrowheadId"
          markerWidth="7"
          markerHeight="5"
          refX="6"
          refY="2.5"
          orient="auto-start-reverse"
        >
          <polygon points="0 0, 7 2.5, 0 5" :fill="lineColor" />
        </marker>
      </defs>
      <!-- 实际的连接线路径 -->
      <path
        :d="pathData"
        :stroke="lineColor"
        stroke-width="2"
        fill="none"
        :marker-end="`url(#${arrowheadId})`"
        class="actual-path"
        :style="{ zIndex: zIndex }"
      />
      <!-- 用于悬停检测的透明路径 -->
      <path
        :d="pathData"
        stroke="transparent"
        stroke-width="12"
        fill="none"
        class="hover-path"
        :style="{ zIndex: zIndex }"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      />
      <!-- 起点标记（小圆圈） -->
      <circle :cx="startPoint.x" :cy="startPoint.y" :r="3" :fill="lineColor" />
    </svg>
    <!-- 连接线描述文本 -->
    <div
      v-if="isEditing || connection.description"
      class="connection-description"
      :style="textStyle"
      @click.stop="startEditing"
    >
      <input
        v-if="isEditing"
        ref="inputRef"
        v-model="editingDescription"
        :style="{ width: inputWidth }"
        @blur="finishEditing"
        @keyup.enter="finishEditing"
        @input="updateInputWidth"
        @click.stop
      />
      <span v-else>{{ connection.description }}</span>
      <span ref="measureSpan" class="measure-span">{{ editingDescription }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ComputedRef, CSSProperties, nextTick, ref, watch } from 'vue'
import type { Connection } from '@shared/types'

// 组件属性定义
const props = defineProps<{
  connection: Connection
  strokeColor?: string
  strokeWidth?: number
  textColor?: string
  isSelected?: boolean
}>()

// 定义组件事件
const emit = defineEmits(['click', 'contextmenu', 'update:description'])

// 编辑状态相关的响应式变量
const isEditing = ref(false)
const editingDescription = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const measureSpan = ref<HTMLSpanElement | null>(null)
const inputWidth = ref('20px')

// 悬停状态相关的响应式变量
const isHovered = ref(false)
const zIndex = ref(1)

// 悬停事件处理函数
const handleMouseEnter = () => {
  isHovered.value = true
  zIndex.value = 10 // 提高悬停时的 z-index
}

// 悬停事件处理函数
const handleMouseLeave = () => {
  isHovered.value = false
  zIndex.value = 1 // 恢复默认 z-index
}

// 更新输入框宽度
const updateInputWidth = () => {
  nextTick(() => {
    if (measureSpan.value) {
      const width = measureSpan.value.offsetWidth
      inputWidth.value = `${Math.max(20, width + 10)}px` // 最小宽度为20px，额外加10px作为缓冲
    }
  })
}

// 监听编辑描述的变化，更新输入框宽度
watch(editingDescription, updateInputWidth)

// 开始编辑
const startEditing = () => {
  isEditing.value = true
  editingDescription.value = props.connection.description || ''
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
      updateInputWidth()
    }
  })
}

// 结束编辑
const finishEditing = () => {
  isEditing.value = false
  const newDescription = editingDescription.value.trim()
  console.log('Finishing editing, new description:', newDescription) // 添加日志
  emit('update:description', props.connection.id, newDescription)
}

// 计算描述文本的样式
const textStyle = computed(() => {
  const isHorizontal = svgWidth.value > svgHeight.value
  const yOffset = isHorizontal ? 8 : 0 // 水平线偏移8px
  return {
    position: 'absolute',
    left: `${svgWidth.value / 2}px`,
    top: `${svgHeight.value / 2 + yOffset}px`,
    transform: 'translate(-50%, -50%)',
    border: `1px solid ${lineColor.value}`,
    whiteSpace: 'nowrap'
  }
}) as ComputedRef<CSSProperties>

// 点击事件处理函数
const handleClick = (event: Event) => {
  event.stopPropagation()
  emit('click')
}

// 右键菜单事件处理函数
const handleContextMenu = (event: MouseEvent) => {
  event.stopPropagation()
  emit('contextmenu', event, props.connection)
}

// 线条颜色计算
const lineColor = computed(() => {
  if (props.isSelected) return 'var(--color-primary)' // 选中时的颜色
  if (isHovered.value) return 'var(--color-primary)' // 悬停时的颜色
  return props.strokeColor || '#000000'
})

// 生成唯一的箭头ID
const arrowheadId = computed(() => `arrowhead-${props.connection.id}`)

// 设置线条与卡片边缘的距离
const linePadding = 5

// 计算容器样式
const containerStyle = computed(() => {
  const left = Math.min(props.connection.startPoint.x, props.connection.endPoint.x) - linePadding
  const top = Math.min(props.connection.startPoint.y, props.connection.endPoint.y) - linePadding
  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${svgWidth.value}px`,
    height: `${svgHeight.value}px`
  }
})

// 计算 SVG 的宽度和高度
const svgWidth = computed(
  () => Math.abs(props.connection.endPoint.x - props.connection.startPoint.x) + linePadding * 2
)
const svgHeight = computed(
  () => Math.abs(props.connection.endPoint.y - props.connection.startPoint.y) + linePadding * 2
)

// 计算路径数据
const pathData = computed(() => {
  const { startPoint, endPoint } = props.connection
  const isStartLeft = startPoint.x < endPoint.x
  const isStartTop = startPoint.y < endPoint.y

  // 调整起点和终点，考虑 linePadding
  const startX = isStartLeft ? linePadding : svgWidth.value - linePadding
  const startY = isStartTop ? linePadding : svgHeight.value - linePadding
  const endX = isStartLeft ? svgWidth.value - linePadding : linePadding
  const endY = isStartTop ? svgHeight.value - linePadding : linePadding

  const dx = endX - startX
  const dy = endY - startY

  // 检查是否为水平或垂直线
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    // 如果是水平或垂直线，使用直线
    return `M ${startX} ${startY} L ${endX} ${endY}`
  }

  // 对于其他情况，使用曲线
  const distance = Math.sqrt(dx * dx + dy * dy)
  const offset = Math.min(distance * 0.5, 160) // 增加偏移量，最大不超过150

  // 确定主要方向
  const isHorizontal = Math.abs(dx) > Math.abs(dy) * 3 // 调整判断条件

  let controlX1, controlY1, controlX2, controlY2

  if (isHorizontal) {
    // 水平主导的曲线
    controlX1 = startX + Math.sign(dx) * offset
    controlY1 = startY
    controlX2 = endX - Math.sign(dx) * offset
    controlY2 = endY
  } else {
    // 垂直主导的曲线
    controlX1 = startX
    controlY1 = startY + Math.sign(dy) * offset
    controlX2 = endX
    controlY2 = endY - Math.sign(dy) * offset
  }

  return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
})

// 计算起点坐标
const startPoint = computed(() => {
  const isStartLeft = props.connection.startPoint.x < props.connection.endPoint.x
  const isStartTop = props.connection.startPoint.y < props.connection.endPoint.y
  return {
    x: isStartLeft ? linePadding : svgWidth.value - linePadding,
    y: isStartTop ? linePadding : svgHeight.value - linePadding
  }
})
</script>

<style lang="scss" scoped>
.connection-line-container {
  position: absolute;
  pointer-events: none;
  pointer-events: all; // 改为 all
  cursor: pointer;
}
.actual-path {
  transition:
    stroke 0.3s ease,
    stroke-width 0.3s ease;

  &:hover {
    stroke-width: 2.5;
  }
}

.hover-path {
  cursor: pointer;
  pointer-events: all; // 确保这个路径可以接收鼠标事件
}

.connection-line {
  overflow: visible;
}

.connection-description {
  font-size: 12px;
  user-select: none;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 4px;
  border-radius: 4px;
  input {
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
    text-align: center;
    min-width: 20px;
    transition: width 0.2s ease;
  }

  span {
    display: block;
    min-height: 1em;
  }
  .measure-span {
    visibility: hidden;
    position: absolute;
    white-space: pre;
    font-size: inherit;
    padding: 2px 4px;
  }
}
</style>
