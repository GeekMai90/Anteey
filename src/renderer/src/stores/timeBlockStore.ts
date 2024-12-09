import { defineStore } from 'pinia'
import { format } from 'date-fns'
import type {
  TimeBlockDayWithBlocks,
  TimeBlockItemType,
  TaskStatus,
  TimeBlockItem
} from '../types/timeBlock'

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
  compareMode: boolean
  compareDay: TimeBlockDayWithBlocks | null
  prevDay: TimeBlockDayWithBlocks | null
  nextDay: TimeBlockDayWithBlocks | null
  cache: Map<string, TimeBlockDayWithBlocks>
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
    cache: new Map()
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
          this.currentDay = structuredClone(this.cache.get(date)!)
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
        this.cache.set(date, structuredClone(dayData))
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
            items: [],
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
              items: [],
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

    // 添加内容项
    async addTimeBlockItem(
      hour: number,
      data: {
        type: TimeBlockItemType
        content: string
        status?: TaskStatus
      }
    ): Promise<TimeBlockItem> {
      if (!this.currentDay?.blocks[hour]) {
        await this.updateTimeBlock(this.currentDay?.date || '', hour, '')
      }

      try {
        const block = this.currentDay!.blocks[hour]
        const newItem = await window.electronAPI.addTimeBlockItem(block.id, data)
        block.items.push(newItem)
        block.updatedAt = new Date()
        return newItem
      } catch (error) {
        console.error('添加内容项失败:', error)
        throw error
      }
    },

    // 更新内容项状态
    async updateItemStatus(hour: number, itemId: string, status: TaskStatus) {
      if (!this.currentDay?.blocks[hour]) return

      try {
        await window.electronAPI.updateItemStatus(itemId, status)
        const item = this.currentDay.blocks[hour].items.find((item) => item.id === itemId)
        if (item) {
          item.status = status
          item.updatedAt = new Date()
        }
      } catch (error) {
        console.error('更新内容项状态失败:', error)
        throw error
      }
    },

    // 迁移内容项
    async migrateItem(fromHour: number, toHour: number, itemId: string) {
      if (!this.currentDay?.blocks[fromHour] || !this.currentDay?.blocks[toHour]) {
        throw new Error('Invalid hours')
      }

      try {
        const targetBlock = this.currentDay.blocks[toHour]
        const newItem = await window.electronAPI.migrateItem(itemId, targetBlock.id)

        // 更新状态
        this.currentDay.blocks[fromHour].items = this.currentDay.blocks[fromHour].items.filter(
          (item) => item.id !== itemId
        )
        this.currentDay.blocks[toHour].items.push(newItem)

        return newItem
      } catch (error) {
        console.error('迁移内容项失败:', error)
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
            return this.cache.get(date)!
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
          this.cache.set(date, dayData)
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
    }
  }
})
