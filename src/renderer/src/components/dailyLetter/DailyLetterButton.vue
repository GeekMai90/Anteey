//!dailyLetterStore.canReceiveToday
<template>
  <div
    v-tooltip.top="{
      content: dailyLetterStore.canReceiveToday ? '每日来信' : '今日已收信',
      delay: { show: 1000 }
    }"
    class="daily-letter-btn"
    :class="{ disabled: !dailyLetterStore.canReceiveToday }"
    @click="handleClick"
  >
    <div class="icon">
      <Mail
        v-if="dailyLetterStore.canReceiveToday"
        theme="outline"
        size="16"
        fill="var(--color-sidebar-text)"
        :strokeWidth="2"
      />
      <MailOpen
        v-else
        theme="outline"
        size="16"
        fill="var(--color-sidebar-text)"
        :strokeWidth="2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail, MailOpen } from '@icon-park/vue-next'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'
import { onMounted } from 'vue'

const dailyLetterStore = useDailyLetterStore()

onMounted(async () => {
  await dailyLetterStore.checkTodayLetter()
})

const handleClick = async () => {
  if (!dailyLetterStore.canReceiveToday) {
    return
  }

  try {
    // 1. 开始动画
    dailyLetterStore.startAnimation()

    // 2. 创建每日信件
    const letter = await dailyLetterStore.createLetter('daily')

    // 3. 设置当前信件
    await dailyLetterStore.getLetterById(letter.id)
  } catch (error) {
    console.error('生成每日信件失败:', error)
    dailyLetterStore.endAnimation()
  }
}
</script>

<style lang="scss" scoped>
.daily-letter-btn {
  width: 30px;
  height: 30px;
  justify-content: center;
  align-items: center;
  margin-left: 2px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;

  .icon {
    width: 20px;
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 6px;
    transition: all 0.2s ease;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  &:hover {
    background: rgba(var(--color-sidebar-icon-bg), 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &.disabled:hover {
    background: none;
  }
}
</style>
