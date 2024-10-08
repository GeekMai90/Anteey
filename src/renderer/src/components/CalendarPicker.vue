<template>
  <Teleport to="body">
    <div v-show="isVisible" ref="calendarRef" class="calendar-popup">
      <DatePicker
        v-model="internalSelectedDate"
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

const props = defineProps<{
  notes: Array<{ createdAt: string }>
  isVisible: boolean
  triggerElementSelector: string
  selectedDate: string | null
}>()

const emit = defineEmits<{
  (e: 'dateSelected', date: string | null): void
}>()

const internalSelectedDate = computed({
  get: () => props.selectedDate,
  set: (value) => emit('dateSelected', value)
})

const attributes = computed(() => {
  const noteDates = new Set(props.notes.map((note) => new Date(note.createdAt).toDateString()))
  return [
    {
      key: 'today',
      dates: new Date(),
      highlight: {
        fillMode: 'solid',
        class: 'today-highlight'
      }
    },
    {
      key: 'selected',
      dates: internalSelectedDate.value ? new Date(internalSelectedDate.value) : null,
      highlight: {
        fillMode: 'outline',
        class: 'selected-highlight'
      }
    },
    {
      dot: {
        class: 'custom-dot'
      },
      dates: Array.from(noteDates).map((dateString) => new Date(dateString))
    }
  ]
})

const calendarRef = ref<HTMLDivElement | null>(null)

const onDayClick = (day: { id: string }) => {
  internalSelectedDate.value = day.id
  // uiStore.closeCalendarPicker()
}

const updateCalendarPosition = () => {
  const triggerElement = document.querySelector(props.triggerElementSelector)
  const calendar = calendarRef.value
  if (triggerElement && calendar) {
    const rect = triggerElement.getBoundingClientRect()
    calendar.style.top = `${rect.bottom + 5}px`
    calendar.style.left = `${rect.left - 210}px`
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const calendar = calendarRef.value
  const triggerElement = document.querySelector(props.triggerElementSelector)

  // 检查点击是否发生在日历内部
  if (calendar && calendar.contains(event.target as Node)) {
    return // 如果点击在日历内部,不做任何操作
  }

  // 检查点击是否发生在触发元素上
  if (triggerElement && triggerElement.contains(event.target as Node)) {
    return // 如果点击在触发元素上,不做任何操作
  }

  // 如果点击既不在日历内部也不在触发元素上,则关闭日历
  uiStore.closeCalendarPicker()
}

onMounted(() => {
  window.addEventListener('resize', updateCalendarPosition)
  window.addEventListener('mousedown', handleClickOutside)
  watch(
    () => props.isVisible,
    (isVisible) => {
      if (isVisible) {
        updateCalendarPosition()
      }
    }
  )
})

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
