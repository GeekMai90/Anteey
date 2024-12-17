<template>
  <div class="connection-line" :data-id="connection.id">
    <div v-if="connection.label" class="connection-label" ref="labelRef">
      {{ connection.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { MindBoardConnection } from '@renderer/types/mindboard'
import LeaderLine from 'leader-line-new'

const props = defineProps<{
  connection: MindBoardConnection
  scale: number
}>()

const labelRef = ref<HTMLElement | null>(null)
let line: any = null
const observer = ref<MutationObserver | null>(null)

// 创建连线
const createLine = () => {
  const start = document.querySelector(`[data-element-id="${props.connection.fromId}"]`)
  const end = document.querySelector(`[data-element-id="${props.connection.toId}"]`)

  if (!start || !end) {
    console.warn('Connection elements not found:', props.connection.fromId, props.connection.toId)
    return
  }

  if (line) {
    line.remove()
  }

  try {
    line = new LeaderLine(start, end, {
      color: props.connection.style?.color || 'var(--color-text-secondary)',
      size: props.connection.style?.size || 2,
      path: props.connection.style?.path || 'fluid',
      startPlug: props.connection.style?.startPlug || 'behind',
      endPlug: props.connection.style?.endPlug || 'arrow1',
      startSocket: props.connection.fromAnchor,
      endSocket: props.connection.toAnchor,
      dash:
        props.connection.style?.dash === true
          ? true
          : Array.isArray(props.connection.style?.dash)
            ? { len: props.connection.style.dash[0], gap: props.connection.style.dash[1] }
            : false
    })

    // 将 SVG 移动到 transform-layer 中
    if (line.svg) {
      const container = start.closest('.transform-layer')
      if (container) {
        container.appendChild(line.svg)
        line.svg.style.position = 'absolute'
        line.svg.style.zIndex = '1'
        line.svg.style.pointerEvents = 'none'

        // 添加这一行，确保连线的 SVG 跟随变换层
        line.svg.style.willChange = 'transform'
      }
    }

    // 添加元素位置变化的监听
    observer.value = new MutationObserver(() => {
      requestAnimationFrame(() => {
        if (line) {
          line.position()
        }
      })
    })

    // 观察起点和终点元素
    if (start && end) {
      // 观察元素的位置变化
      observer.value.observe(start, {
        attributes: true,
        attributeFilter: ['style']
      })
      observer.value.observe(end, {
        attributes: true,
        attributeFilter: ['style']
      })

      // 观察变换层的变换
      const transformLayer = start.closest('.transform-layer')
      if (transformLayer) {
        observer.value.observe(transformLayer, {
          attributes: true,
          attributeFilter: ['style']
        })
      }
    }
  } catch (error) {
    console.error('Failed to create leader line:', error)
  }
}

// 监听连线样式变化
watch(
  () => props.connection.style,
  () => {
    createLine()
  },
  { deep: true }
)

// 在组件挂载时创建连线
onMounted(() => {
  nextTick(() => {
    createLine()
  })
})

// 在组件卸载时清理
onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
  if (line) {
    line.remove()
  }
})
</script>

<style lang="scss" scoped>
.connection-line {
  position: absolute;
  pointer-events: none;
  overflow: visible;
  will-change: transform;
}

.connection-label {
  padding: 4px 8px;
  background-color: var(--color-bg-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
