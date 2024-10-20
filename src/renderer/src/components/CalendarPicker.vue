<template>
  <!-- 使用 Teleport 将日历弹出框渲染到 body 元素中，以避免被其他元素遮挡 -->
  <Teleport to="body">
    <!-- 日历弹出框，只在 isVisible 为 true 时显示 -->
    <div v-show="isVisible" ref="calendarRef" class="calendar-popup">
      <!-- v-calendar 的 DatePicker 组件 -->
      <DatePicker
        :model-value="selectedDate"
        :is-range="false"
        :model-config="{ type: 'string', mask: 'YYYY-MM-DD' }"
        :masks="{ title: 'YYYY年MM月' }"
        :attributes="attributes"
        @dayclick="onDayClick"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { DatePicker } from 'v-calendar'
import 'v-calendar/style.css'
import { useUIStore } from '@renderer/stores/useUIStore'

const uiStore = useUIStore()

// 定义组件的 props
const props = defineProps<{
  noteDates: string[] // 包含笔记的日期数组
  isVisible: boolean // 控制日历是否可见
  triggerElementSelector: string // 触发日历显示的元素选择器
  selectedDate: string | null // 当前选中的日期
}>()

// 定义组件的事件
const emit = defineEmits<{
  (e: 'dateSelected', date: string | null): void // 当日期被选中时触发
  (e: 'update:isVisible', value: boolean): void // 更新日历可见性
}>()

// 计算日历的属性，包括今天、选中日期和有笔记的日期
const attributes = computed(() => {
  const noteDates = new Set(props.noteDates)
  return [
    // 今天的样式
    {
      key: 'today',
      dates: new Date(),
      highlight: {
        fillMode: 'solid',
        class: 'today-highlight'
      }
    },
    // 选中日期的样式
    {
      key: 'selected',
      dates: props.selectedDate ? new Date(props.selectedDate) : null,
      highlight: {
        fillMode: 'outline',
        class: 'selected-highlight'
      }
    },
    // 有笔记的日期样式（显示小圆点）
    {
      dot: {
        class: 'custom-dot'
      },
      dates: Array.from(noteDates).map((dateString) => new Date(dateString))
    }
  ]
})

// 日历弹出框的 ref
const calendarRef = ref<HTMLDivElement | null>(null)

// 处理日期点击事件
const onDayClick = (day: { id: string }) => {
  const clickedDate = day.id
  if (props.selectedDate === clickedDate) {
    emit('dateSelected', null) // 如果点击已选中的日期，则取消选中
  } else {
    emit('dateSelected', clickedDate) // 选中新的日期
  }
  emit('update:isVisible', false) // 隐藏日历
}

// 更新日历弹出框的位置
const updateCalendarPosition = () => {
  const triggerElement = document.querySelector(props.triggerElementSelector)
  const calendar = calendarRef.value
  if (triggerElement && calendar) {
    const rect = triggerElement.getBoundingClientRect()
    calendar.style.top = `${rect.bottom + 5}px`
    calendar.style.left = `${rect.left - 210}px`
  }
}

// 处理点击日历外部的事件，用于关闭日历
const handleClickOutside = (event: MouseEvent) => {
  const calendar = calendarRef.value
  const triggerElement = document.querySelector(props.triggerElementSelector)

  if (
    calendar &&
    !calendar.contains(event.target as Node) &&
    triggerElement &&
    !triggerElement.contains(event.target as Node)
  ) {
    uiStore.closeCalendarPicker()
  }
}

// 组件挂载时添加事件监听器
onMounted(() => {
  window.addEventListener('resize', updateCalendarPosition)
  window.addEventListener('mousedown', handleClickOutside)
  // 监听 isVisible 的变化，当日历变为可见时更新位置
  watch(
    () => props.isVisible,
    (isVisible) => {
      if (isVisible) {
        updateCalendarPosition()
      }
    }
  )
})
// 组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', updateCalendarPosition)
  window.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped lang="scss">
.calendar-popup {
  position: fixed;
  background-color: var(--color-bg-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-primary);
  z-index: 1001;
  overflow: hidden;
}
:deep(.custom-dot) {
  width: 5px !important;
  height: 5px !important;
  border-radius: 50% !important;
  background-color: var(--color-primary) !important;
  border: none !important;
}
:deep(.vc-day) {
  &.vc-day-dots {
    .vc-dot {
      margin-top: 5px !important; // 调整点的垂直位置
    }
  }

  .custom-dot {
    background-color: var(--color-primary) !important;
    width: 5px !important;
    height: 5px !important;
    border-radius: 50% !important;
    border: none !important;
  }

  &.is-selected {
    .custom-dot {
      background-color: white !important; // 选中时改变点的颜色
    }
  }
}
.calendar-popup {
  :deep(.vc-highlight) {
    background-color: var(--color-primary) !important;
  }
  :deep(.vc-highlight) {
    background-color: transparent !important;
  }

  :deep(.today-highlight) {
    background-color: var(--color-primary) !important;
    border-radius: 50%;
  }

  :deep(.selected-highlight) {
    border: 2px solid var(--color-primary) !important;
    border-radius: 50%;
    background-color: transparent !important;
  }

  :deep(.vc-day) {
    &.is-today {
      .vc-day-content {
        color: white !important;
      }
    }
    .vc-highlight-content-outline,
    .vc-highlight-content-none {
      color: #0f172a !important;
      font-weight: 500 !important;
    }
  }
}
.calendar-popup {
  :deep(.vc-header) {
    .vc-title {
      font-weight: bold;
      color: var(--color-text-primary, #000);
      background: none !important;
    }
    .vc-arrow {
      background: transparent !important;
      &:hover,
      &:focus,
      &:active {
        background: transparent !important;
        opacity: 0.7;
      }
    }
  }
  :deep(.vc-nav-item.is-active) {
    background-color: var(--color-primary) !important;
  }
  :deep(.vc-focus:focus-within) {
    box-shadow: none !important;
  }
  :deep(.vc-nav-item.is-current) {
    color: var(--color-primary) !important;
  }
}
</style>
