import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDailyLetterStore = defineStore('dailyLetter', () => {
  const isAnimating = ref(false)
  const isBicycleAnimating = ref(false)
  const isMailboxShaking = ref(false)

  const startAnimation = () => {
    endAnimation()
    console.log('开始整体动画')
    isAnimating.value = true
    isBicycleAnimating.value = true
    isMailboxShaking.value = false
  }

  const startMailboxShake = () => {
    console.log('开始邮箱抖动')
    isAnimating.value = true
    isBicycleAnimating.value = false
    isMailboxShaking.value = true
  }

  const endAnimation = () => {
    console.log('结束整体动画')
    isAnimating.value = false
    isBicycleAnimating.value = false
    isMailboxShaking.value = false
  }

  return {
    isAnimating,
    isBicycleAnimating,
    isMailboxShaking,
    startAnimation,
    startMailboxShake,
    endAnimation
  }
})
