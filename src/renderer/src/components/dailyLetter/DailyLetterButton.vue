<template>
  <div
    v-tooltip.top="{ content: '每日来信', delay: { show: 1000 } }"
    class="daily-letter-btn"
    @click="handleClick"
  >
    <div class="icon">
      <Mail theme="outline" size="20" fill="var(--color-sidebar-text)" :strokeWidth="2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail } from '@icon-park/vue-next'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'

const dailyLetterStore = useDailyLetterStore()

const handleClick = () => {
  dailyLetterStore.startAnimation()
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
}
</style>
