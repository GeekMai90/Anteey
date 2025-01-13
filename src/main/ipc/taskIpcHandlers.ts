import { ipcMain } from 'electron'
import {
  getAllTasks,
  updateTaskStatus,
  getUncompletedTasks,
  getCompletedTasks,
  getTasksByNote
} from '../../services/widget/taskService'

export function setupTaskHandlers() {
  // 获取所有任务
  ipcMain.handle('get-all-tasks', async () => {
    try {
      const tasks = await getAllTasks()
      return { success: true, tasks }
    } catch (error) {
      console.error('主进程→ 获取所有任务失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 更新任务状态
  ipcMain.handle(
    'update-task-status',
    async (
      _event,
      { noteId, path, isChecked }: { noteId: string; path: string[]; isChecked: boolean }
    ) => {
      try {
        await updateTaskStatus(noteId, path, isChecked)
        return { success: true }
      } catch (error) {
        console.error('主进程→ 更新任务状态失败:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 获取未完成的任务
  ipcMain.handle('get-uncompleted-tasks', async () => {
    try {
      const tasks = await getUncompletedTasks()
      return { success: true, tasks }
    } catch (error) {
      console.error('主进程→ 获取未完成任务失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 获取已完成的任务
  ipcMain.handle('get-completed-tasks', async () => {
    try {
      const tasks = await getCompletedTasks()
      return { success: true, tasks }
    } catch (error) {
      console.error('主进程→ 获取已完成任务失败:', error)
      return { success: false, error: String(error) }
    }
  })

  // 按笔记分组获取任务
  ipcMain.handle('get-tasks-by-note', async () => {
    try {
      const tasksByNote = await getTasksByNote()
      return { success: true, tasksByNote }
    } catch (error) {
      console.error('主进程→ 按笔记分组获取任务失败:', error)
      return { success: false, error: String(error) }
    }
  })
}
