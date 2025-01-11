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

      <!-- 分隔符 -->
      <!-- <div class="separator">:</div> -->

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

<style>
@import '@pqina/flip/dist/flip.min.css';

.flip-clock-card {
  /* background: var(--color-bg-primary); */
  border-radius: 8px;
  /* padding: 12px; */
  /* border: 1px solid var(--color-border); */
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

/* 自定义翻页样式 */
:deep(.tick [data-view='flip-front']),
:deep(.tick [data-view='flip-back']) {
  background: var(--color-bg-primary);
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  padding: 4px 0;
}

/* 隐藏 Powered by 标记 */
:deep(.tick-credits) {
  display: none !important;
}
</style>
