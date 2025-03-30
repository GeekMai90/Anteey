<template>
  <div class="flip-clock-card">
    <div class="flip-clock">
      <!-- 分钟 -->
      <div ref="minutesRef" class="tick" data-value="00">
        <div data-view="flip">
          <span data-view="flip-front"></span>
          <span data-view="flip-back"></span>
        </div>
      </div>

      <!-- 秒钟 -->
      <div ref="secondsRef" class="tick" data-value="00">
        <div data-view="flip">
          <span data-view="flip-front"></span>
          <span data-view="flip-back"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Tick from '@pqina/flip'
// 引入样式使用 @use 替代 @import
import '@pqina/flip/dist/flip.min.css'

const props = defineProps<{
  value: string
}>()

const minutesRef = ref<HTMLElement | null>(null)
const secondsRef = ref<HTMLElement | null>(null)
let minutesInstance: any = null
let secondsInstance: any = null

onMounted(() => {
  if (minutesRef.value && secondsRef.value) {
    minutesInstance = Tick.DOM.create(minutesRef.value, {
      credits: false
    })
    secondsInstance = Tick.DOM.create(secondsRef.value, {
      credits: false
    })
    updateTime(props.value)
  }
})

const updateTime = (timeString: string) => {
  const [minutes, seconds] = timeString.split(':')
  if (minutesInstance && secondsInstance) {
    minutesInstance.value = minutes
    secondsInstance.value = seconds
  }
}

watch(
  () => props.value,
  (newValue) => {
    updateTime(newValue)
  }
)

onBeforeUnmount(() => {
  if (minutesInstance) minutesInstance.destroy()
  if (secondsInstance) secondsInstance.destroy()
})
</script>

<style scoped>
/* 注意：对于第三方库的 CSS，仍然可以使用 @import */
/* @import '@pqina/flip/dist/flip.min.css'; 移到 script 中使用 import */

.flip-clock-card {
  border-radius: 8px;
}

.flip-clock {
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
}

.tick {
  font-size: 38px;
  font-family: monospace;
  color: var(--color-primary);
  min-width: 2.4ch;
  text-align: center;
}

/* 更新深度选择器语法 :deep() */
:deep(.tick [data-view='flip-front']),
:deep(.tick [data-view='flip-back']) {
  background: var(--color-bg-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  padding: 4px 0;
}

/* 更新深度选择器语法 */
:deep(.tick-credits) {
  display: none !important;
}
</style>
