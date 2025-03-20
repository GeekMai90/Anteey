<template>
  <div
    v-tooltip.top="{ content: '每日来信', delay: { show: 1000 } }"
    class="daily-letter-btn"
    @click="handleClick"
  >
    <div class="icon">
      <Mail theme="outline" size="16" fill="var(--color-sidebar-text)" :strokeWidth="2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail } from '@icon-park/vue-next'
import { useDailyLetterStore } from '@renderer/stores/dailyLetterStore'

const dailyLetterStore = useDailyLetterStore()

const handleClick = async () => {
  try {
    // 1. 开始动画
    dailyLetterStore.startAnimation()

    // 2. 创建每日信件
    const letter = await dailyLetterStore.createLetter('daily')

    // 3. 设置当前信件
    await dailyLetterStore.getLetterById(letter.id)

    // 注意：不再在这里直接打开模态框
    // 模态框的显示由动画组件控制
  } catch (error) {
    console.error('生成每日信件失败:', error)
    // 如果失败，也要停止动画
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
}
</style>
