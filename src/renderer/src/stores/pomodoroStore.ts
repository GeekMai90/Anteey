import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PomodoroConfig, PomodoroStatus } from '@shared/types'

export const usePomodoroStore = defineStore('pomodoro', () => {
  // ==================== 状态 ====================
  const status = ref<PomodoroStatus>('idle')
  const currentTime = ref(0) // 当前剩余时间(秒)
  const todayCount = ref(0) // 今日完成数量
  const currentCount = ref(0) // 当前是第几个番茄
  const settings = ref<PomodoroConfig>({
    defaultDuration: 25,
    sound: 'none'
  })
  const timer = ref<ReturnType<typeof setInterval> | null>(null)
  const audio = ref<HTMLAudioElement | null>(null)

  // ==================== 计算属性 ====================
  const isRunning = computed(() => status.value === 'running')
  const isPaused = computed(() => status.value === 'paused')
  const formattedTime = computed(() => {
    const minutes = Math.floor(currentTime.value / 60)
    const seconds = currentTime.value % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  // ==================== 方法 ====================
  // 初始化
  const initialize = async () => {
    try {
      // 获取设置
      settings.value = await window.electronAPI.pomodoro.getPomodoroSettings()
      // 获取今日记录
      const record = await window.electronAPI.pomodoro.getTodayPomodoro()
      todayCount.value = record.count
    } catch (error) {
      console.error('初始化番茄钟失败:', error)
    }
  }

  // 开始番茄钟
  const start = async () => {
    if (status.value === 'idle') {
      currentTime.value = settings.value.defaultDuration * 60
      currentCount.value++
    }
    status.value = 'running'
    startTimer()
    await playSound()
  }

  // 暂停
  const pause = () => {
    status.value = 'paused'
    stopTimer()
    stopSound()
  }

  // 继续
  const resume = async () => {
    status.value = 'running'
    startTimer()
    await playSound()
  }

  // 停止
  const stop = () => {
    status.value = 'idle'
    stopTimer()
    stopSound()
    currentTime.value = 0
    currentCount.value = 0
  }

  // 完成
  const complete = async () => {
    try {
      status.value = 'completed'
      stopTimer()
      todayCount.value++
      // 更新数据库记录
      await window.electronAPI.pomodoro.updateTodayPomodoro(
        todayCount.value,
        settings.value.defaultDuration
      )
    } catch (error) {
      console.error('更新番茄钟记录失败:', error)
    }
  }

  // 更新设置
  const updateSettings = async (config: Partial<PomodoroConfig>) => {
    try {
      settings.value = await window.electronAPI.pomodoro.updatePomodoroSettings(config)
      if (config.sound !== undefined && isRunning.value) {
        await playSound()
      }
    } catch (error) {
      console.error('更新番茄钟设置失败:', error)
    }
  }

  // 获取统计数据
  const getStats = async () => {
    try {
      return await window.electronAPI.pomodoro.getPomodoroStats()
    } catch (error) {
      console.error('获取番茄钟统计数据失败:', error)
      throw error
    }
  }

  // ==================== 内部方法 ====================
  const startTimer = () => {
    if (timer.value) return

    timer.value = setInterval(() => {
      if (currentTime.value > 0) {
        currentTime.value--
      } else {
        complete()
      }
    }, 1000)
  }

  const stopTimer = () => {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  // 播放背景音乐
  const playSound = async () => {
    try {
      if (settings.value.sound === 'none') {
        stopSound()
        return
      }

      const soundPath = await window.electronAPI.pomodoro.getSoundFilePath(settings.value.sound)
      if (!soundPath) return

      // 添加 file:// 协议
      const audioUrl = `file://${soundPath}`

      if (!audio.value) {
        audio.value = new Audio(audioUrl)
        audio.value.loop = true // 循环播放
      } else {
        audio.value.src = audioUrl
      }

      await audio.value.play()
    } catch (error) {
      console.error('播放音频失败:', error)
    }
  }

  // 停止背景音乐
  const stopSound = () => {
    if (audio.value) {
      audio.value.pause()
      audio.value.currentTime = 0
    }
  }

  // 组件卸载时清理
  const cleanup = () => {
    stopTimer()
    stopSound()
    if (audio.value) {
      audio.value = null
    }
  }

  return {
    // 状态
    status,
    currentTime,
    todayCount,
    currentCount,
    settings,

    // 计算属性
    isRunning,
    isPaused,
    formattedTime,

    // 方法
    initialize,
    start,
    pause,
    resume,
    stop,
    complete,
    updateSettings,
    getStats,
    cleanup,
    playSound,
    stopSound
  }
})
