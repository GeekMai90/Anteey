// 番茄钟状态
export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'completed'

// 背景音乐类型
export type BackgroundSound = 'ocean' | 'rain' | 'fire' | 'none'

// 番茄钟配置
export interface PomodoroConfig {
  defaultDuration: number // 默认时长(分钟)
  sound: BackgroundSound // 当前选择的背景音乐
}

// 番茄钟数据
export interface PomodoroData {
  id: string
  status: PomodoroStatus
  currentTime: number // 当前剩余时间(秒)
  todayCount: number // 今日完成数量
  currentCount: number // 当前是第几个番茄
  config: PomodoroConfig
}

// 番茄钟小组件
export interface PomodoroWidget {
  type: 'pomodoro'
  data: PomodoroData
}
