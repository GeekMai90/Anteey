import { ipcRenderer } from 'electron'
import type { Task } from '@shared/types'

export const taskApi = {
  // 获取所有任务
  getAllTasks: async (): Promise<Task[]> => {
    try {
      const result = await ipcRenderer.invoke('get-all-tasks')
      if (!result.success) throw new Error(result.error)
      return result.tasks
    } catch (error) {
      console.error('预加载脚本 → 获取所有任务失败:', error)
      throw error
    }
  },

  // 更新任务状态
  updateTaskStatus: async (noteId: string, path: string[], isChecked: boolean): Promise<void> => {
    try {
      const result = await ipcRenderer.invoke('update-task-status', {
        noteId,
        path,
        isChecked
      })
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('预加载脚本 → 更新任务状态失败:', error)
      throw error
    }
  },

  // 获取未完成的任务
  getUncompletedTasks: async (): Promise<Task[]> => {
    try {
      const result = await ipcRenderer.invoke('get-uncompleted-tasks')
      if (!result.success) throw new Error(result.error)
      return result.tasks
    } catch (error) {
      console.error('预加载脚本 → 获取未完成任务失败:', error)
      throw error
    }
  },

  // 获取已完成的任务
  getCompletedTasks: async (): Promise<Task[]> => {
    try {
      const result = await ipcRenderer.invoke('get-completed-tasks')
      if (!result.success) throw new Error(result.error)
      return result.tasks
    } catch (error) {
      console.error('预加载脚本 → 获取已完成任务失败:', error)
      throw error
    }
  },

  // 按笔记分组获取任务
  getTasksByNote: async (): Promise<{ [noteId: string]: Task[] }> => {
    try {
      const result = await ipcRenderer.invoke('get-tasks-by-note')
      if (!result.success) throw new Error(result.error)
      return result.tasksByNote
    } catch (error) {
      console.error('预加载脚本 → 按笔记分组获取任务失败:', error)
      throw error
    }
  }
}
