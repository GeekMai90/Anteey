import { defineStore } from 'pinia'
import type { TimeBlockDayWithBlocks } from '@renderer/types/timeBlock'

interface TimeBlockState {
  currentDay: TimeBlockDayWithBlocks | null
  isLoading: boolean
  settings: {
    enabled: boolean
    startTime: number
    endTime: number
  }
  defaultWeather: string
  defaultMood: string
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
    defaultMood: '😊'
  }),

  actions: {
    // 加载某天的数据
    async loadTimeBlockDay(date: string) {
      this.isLoading = true
      try {
        const day = await window.electronAPI.getTimeBlockDay(date)
        this.currentDay = day
      } catch (error) {
        console.error('加载时间块数据失败:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // 更新时间块内容
    async updateTimeBlock(hour: number, content: string) {
      if (!this.currentDay) return
      try {
        await window.electronAPI.updateTimeBlock(this.currentDay.id, hour, content)
        if (!this.currentDay.blocks) {
          this.currentDay.blocks = {}
        }
        const now = new Date()
        this.currentDay.blocks[hour] = {
          content,
          createdAt: this.currentDay.blocks[hour]?.createdAt || now,
          updatedAt: now
        }
        this.currentDay.updatedAt = now
      } catch (error) {
        console.error('更新时间块失败:', error)
        throw error
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
    }
  }
})
