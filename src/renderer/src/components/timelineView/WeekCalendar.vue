<template>
  <div class="week-calendar">
    <div
      v-for="day in weekDays"
      :key="day.date"
      :class="['day-item', { active: isActiveDay(day.date) }]"
      @click="selectDay(day.date)"
    >
      <div class="day-number">{{ day.dayOfMonth }}</div>
      <div class="day-name">{{ day.dayName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

const props = defineProps<{
  activeDate: string
}>()

const emit = defineEmits<{
  (e: 'select', date: string): void
}>()

// 生成最近7天的日期数据
const weekDays = computed(() => {
  const days = []
  const today = dayjs()

  for (let i = -3; i <= 3; i++) {
    const date = today.add(i, 'day')
    days.push({
      date: date.format('YYYY/MM/DD'),
      dayOfMonth: date.format('D'),
      dayName: date.locale('zh-cn').format('ddd')
    })
  }
  return days
})

const isActiveDay = (date: string) => {
  return props.activeDate === date
}

const selectDay = (date: string) => {
  emit('select', date)
}
</script>

<style lang="scss" scoped>
.week-calendar {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);

  .day-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;

    &.active {
      background: var(--color-primary);
      color: white;
    }

    .day-number {
      font-size: 16px;
      font-weight: bold;
    }

    .day-name {
      font-size: 12px;
      margin-top: 4px;
    }
  }
}
</style>
