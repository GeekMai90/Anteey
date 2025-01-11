import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PomodoroConfig, PomodoroStatus } from '@shared/types'

export const usePomodoroStore = defineStore('pomodoro', () => {
  // ==================== 状态 ====================
  const status = ref<PomodoroStatus>('idle')
  const currentTime = ref(0) // 当前剩余时间(秒)
  const todayCount = ref(0) // 今日完成数量
  const currentCount = ref(0) // 当前是第几个番茄
  const isBreakTime = ref(false) // 是否处于休息时间
  const settings = ref<PomodoroConfig>({
    defaultDuration: 25,
    breakDuration: 5,
    sound: 'none'
  })
  const timer = ref<ReturnType<typeof setInterval> | null>(null)
  const audio = ref<HTMLAudioElement | null>(null)

  // ==================== 计算属性 ====================
  const isRunning = computed(() => status.value === 'running')
  const isPaused = computed(() => status.value === 'paused')
  const isInBreak = computed(() => status.value === 'break')
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

  // 初始化番茄钟数据
  const initPomodoroData = async () => {
    try {
      const todayRecord = await window.electronAPI.pomodoro.getTodayPomodoro()
      if (todayRecord) {
        todayCount.value = todayRecord.count
        // 如果有需要，也可以更新其他状态
      }
    } catch (error) {
      console.error('初始化番茄钟数据失败:', error)
    }
  }

  // 在 store 定义的开头调用初始化
  initPomodoroData()

  // 开始番茄钟
  const start = async () => {
    if (status.value !== 'idle') {
      return
    }

    currentTime.value = settings.value.defaultDuration * 60
    currentCount.value++
    status.value = 'running'
    startTimer()
    await playSound()
  }

  // 暂停
  const pause = () => {
    console.log('执行暂停...')
    stopTimer()
    stopSound()
    status.value = 'paused'
    console.log('暂停完成，当前状态:', status.value)
  }

  // 继续
  const resume = async () => {
    console.log('执行继续...当前状态:', {
      status: status.value,
      currentTime: currentTime.value,
      timer: timer.value
    })

    status.value = 'running'
    startTimer()
    await playSound()

    console.log('继续完成,新状态:', {
      status: status.value,
      timer: timer.value
    })
  }

  // 停止
  const stop = () => {
    status.value = 'idle'
    stopTimer()
    stopSound()
    currentTime.value = 0
    currentCount.value = 0
  }

  // 开始休息
  const startBreak = async () => {
    isBreakTime.value = true
    currentTime.value = settings.value.breakDuration * 60
    status.value = 'break'
    startTimer()
    await playSound()
  }

  // 完成休息
  const completeBreak = async () => {
    status.value = 'break_completed'
    stopTimer()
    stopSound()
    isBreakTime.value = false
    currentTime.value = 0
    await playCompleteSound()
    status.value = 'idle'
  }

  // 完成
  const complete = async () => {
    try {
      status.value = 'completed'
      stopTimer()
      stopSound()
      todayCount.value++
      await playCompleteSound()
      await window.electronAPI.pomodoro.updateTodayPomodoro(
        todayCount.value,
        settings.value.defaultDuration
      )
      status.value = 'idle'
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
    console.log('开始计时器...')
    // 如果已有计时器，先清除
    if (timer.value) {
      console.log('已有计时器，先清除')
      clearInterval(timer.value)
      timer.value = null
    }

    timer.value = setInterval(() => {
      if (currentTime.value > 0) {
        currentTime.value--
      } else {
        if (status.value === 'break') {
          completeBreak()
        } else {
          complete()
        }
      }
    }, 1000)
    console.log('计时器已创建:', timer.value)
  }

  const stopTimer = () => {
    console.log('停止计时器, 当前timer:', timer.value)
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
      console.log('计时器已清除')
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

  // 播放完成音效
  const playCompleteSound = async () => {
    try {
      const soundPath = await window.electronAPI.pomodoro.getSoundFilePath('complete')
      if (!soundPath) return

      const completeAudio = new Audio(`file://${soundPath}`)
      await completeAudio.play()
    } catch (error) {
      console.error('播放完成音效失败:', error)
    }
  }

  return {
    // 状态
    status,
    currentTime,
    todayCount,
    currentCount,
    settings,
    isBreakTime,

    // 计算属性
    isRunning,
    isPaused,
    isInBreak,
    formattedTime,

    // 方法
    initialize,
    start,
    pause,
    resume,
    stop,
    complete,
    startBreak,
    completeBreak,
    updateSettings,
    getStats,
    cleanup,
    playSound,
    stopSound,
    playCompleteSound
  }
})
