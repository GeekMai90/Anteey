import { defineStore } from 'pinia'
import { format } from 'date-fns'
import type { TimeBlockDayWithBlocks, TimeBlockSettings, FutureLog } from '../types/timeBlock'

interface TimeBlockState {
  currentDay: TimeBlockDayWithBlocks | null
  isLoading: boolean
  settings: TimeBlockSettings
  defaultWeather: string
  defaultMood: string
  compareMode: boolean
  compareDay: TimeBlockDayWithBlocks | null
  prevDay: TimeBlockDayWithBlocks | null
  nextDay: TimeBlockDayWithBlocks | null
  cache: Map<string, TimeBlockDayWithBlocks>
  futureLog: FutureLog | null
}

export const useTimeBlockStore = defineStore('timeBlock', {
  state: (): TimeBlockState => ({
    currentDay: null,
    isLoading: false,
    settings: {
      enabled: true,
      startTime: 5,
      endTime: 23
    },
    defaultWeather: '🌤️',
    defaultMood: '😊',
    compareMode: false,
    compareDay: null,
    prevDay: null,
    nextDay: null,
    cache: new Map(),
    futureLog: null
  }),

  actions: {
    // 加载某天的数据
    async loadTimeBlockDay(date: string) {
      this.isLoading = true
      this.currentDay = null

      try {
        // 先检查缓存
        if (this.cache.has(date)) {
          console.log('Store: 从缓存加载数据:', date)
          this.currentDay = JSON.parse(JSON.stringify(this.cache.get(date)!))
          return
        }

        console.log('Store: 开始加载日期数据:', date)
        const day = await window.electronAPI.getTimeBlockDay(date)
        console.log('Store: 获取到的数据:', day)

        const dayData = day || {
          id: '',
          date: date,
          blocks: {},
          weather: this.defaultWeather,
          mood: this.defaultMood,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // 更新缓存
        this.cache.set(date, JSON.parse(JSON.stringify(dayData)))
        this.currentDay = dayData
      } catch (error) {
        console.error('加载时间块数据失败:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 更新时间块内容
    async updateTimeBlock(date: string, hour: number, content: string): Promise<string> {
      try {
        // 根据日期获取对应的 day 对象
        let targetDay = this.currentDay
        if (date === format(new Date(this.currentDay?.date || ''), 'yyyy-MM-dd')) {
          targetDay = this.currentDay
        } else if (date === format(new Date(this.prevDay?.date || ''), 'yyyy-MM-dd')) {
          targetDay = this.prevDay
        } else if (date === format(new Date(this.nextDay?.date || ''), 'yyyy-MM-dd')) {
          targetDay = this.nextDay
        }

        if (!targetDay) throw new Error('No target day')

        const blockId = await window.electronAPI.updateTimeBlock(targetDay.id, hour, content)

        if (!targetDay.blocks[hour]) {
          targetDay.blocks[hour] = {
            id: blockId,
            content: content,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } else {
          targetDay.blocks[hour].content = content
          targetDay.blocks[hour].updatedAt = new Date()
        }

        // 更新缓存
        if (this.cache.has(date)) {
          const cachedDay = this.cache.get(date)!
          if (!cachedDay.blocks[hour]) {
            cachedDay.blocks[hour] = {
              id: blockId,
              content: content,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          } else {
            cachedDay.blocks[hour].content = content
            cachedDay.blocks[hour].updatedAt = new Date()
          }
        }

        return blockId
      } catch (error) {
        console.error('更新时间块失败:', error)
        throw error
      }
    },

    // 新增：加载对比日期数据
    async loadCompareDay(date: string) {
      try {
        const day = await window.electronAPI.getTimeBlockDay(date)
        this.compareDay = day
        this.compareMode = true
      } catch (error) {
        console.error('加载对比数据失败:', error)
        throw error
      }
    },

    // 新增：切换对比模式
    async toggleCompareMode() {
      this.compareMode = !this.compareMode
      if (this.compareMode && this.currentDay) {
        // 加载前后一天的数据
        await this.loadCompareData(this.currentDay.date)
      } else {
        // 退出对比模式时清空数据
        this.prevDay = null
        this.nextDay = null
      }
    },

    // 加载对比数据
    async loadCompareData(currentDate: string) {
      const prevDate = new Date(currentDate)
      prevDate.setDate(prevDate.getDate() - 1)

      const nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + 1)

      try {
        this.isLoading = true
        const prevDateStr = format(prevDate, 'yyyy-MM-dd')
        const nextDateStr = format(nextDate, 'yyyy-MM-dd')

        console.log('Loading data for dates:', { prevDateStr, currentDate, nextDateStr })

        // 先检查缓存
        const loadDayData = async (date: string) => {
          if (this.cache.has(date)) {
            return JSON.parse(JSON.stringify(this.cache.get(date)!))
          }
          const day = await window.electronAPI.getTimeBlockDay(date)
          const dayData = day || {
            id: '',
            date: date,
            blocks: {},
            weather: this.defaultWeather,
            mood: this.defaultMood,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          this.cache.set(date, JSON.parse(JSON.stringify(dayData)))
          return dayData
        }

        // 并行加载所有三天的数据
        const [prev, current, next] = await Promise.all([
          loadDayData(prevDateStr),
          loadDayData(currentDate),
          loadDayData(nextDateStr)
        ])

        // 更新状态
        this.prevDay = prev
        this.currentDay = current
        this.nextDay = next

        console.log('Loaded data:', {
          prev: this.prevDay,
          current: this.currentDay,
          next: this.nextDay
        })
      } catch (error) {
        console.error('加载对比数据失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    // 更新日期状态
    async updateDayStatus(status: { weather?: string; mood?: string }) {
      if (!this.currentDay) return
      try {
        await window.electronAPI.updateTimeBlockDayStatus(this.currentDay.id, status)
        if (status.weather !== undefined) {
          this.currentDay.weather = status.weather
        }
        if (status.mood !== undefined) {
          this.currentDay.mood = status.mood
        }
        this.currentDay.updatedAt = new Date()
      } catch (error) {
        console.error('更新状态失败:', error)
        throw error
      }
    },

    // 获取时间块设置
    async fetchSettings() {
      try {
        const result = await window.electronAPI.getTimeBlockSettings()
        this.settings = result
        return result
      } catch (error) {
        console.error('获取时间块设置失败:', error)
        throw error
      }
    },

    // 更新时间块设置
    async updateSettings(newSettings: { enabled?: boolean; startTime?: number; endTime?: number }) {
      try {
        const result = await window.electronAPI.updateTimeBlockSettings(newSettings)
        this.settings = result
        return result
      } catch (error) {
        console.error('更新时间块设置失败:', error)
        throw error
      }
    },

    // 获取未来日志
    async getFutureLog() {
      try {
        const log = await window.electronAPI.getFutureLog()
        console.log('Store: 获取到的未来日志:', log)
        this.futureLog = log
        return log
      } catch (error) {
        console.error('获取未来日志失败:', error)
        throw error
      }
    },

    // 更新未来日志
    async updateFutureLog(content: string) {
      try {
        const id = await window.electronAPI.updateFutureLog(content)
        if (this.futureLog) {
          this.futureLog.content = content
          this.futureLog.updatedAt = new Date()
        } else {
          this.futureLog = {
            id,
            content,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
        return id
      } catch (error) {
        console.error('更新未来日志失败:', error)
        throw error
      }
    }
  }
})
