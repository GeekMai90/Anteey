import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task } from '@shared/types'
import { useEventBus } from '@vueuse/core'

export const useTaskStore = defineStore('task', () => {
  // ==================== 状态 ====================
  const tasks = ref<Task[]>([])
  const tasksByNote = ref<{ [noteId: string]: Task[] }>({})
  const isTaskWidgetOpen = ref(false)

  // ==================== 计算属性 ====================
  const uncompletedTasks = computed(() => tasks.value.filter((task) => !task.isChecked))
  const completedTasks = computed(() => tasks.value.filter((task) => task.isChecked))
  const totalTaskCount = computed(() => tasks.value.length)
  const completedTaskCount = computed(() => completedTasks.value.length)
  const completionRate = computed(() => {
    if (totalTaskCount.value === 0) return 0
    return (completedTaskCount.value / totalTaskCount.value) * 100
  })

  // ==================== 操作方法 ====================
  // 获取所有任务
  const fetchAllTasks = async () => {
    try {
      const fetchedTasks = await window.electronAPI.task.getAllTasks()
      tasks.value = fetchedTasks
    } catch (error) {
      console.error('获取所有任务失败:', error)
      throw error
    }
  }

  // 创建事件总线
  const taskUpdatedBus = useEventBus<string>('task-updated')
  const timeBlockTaskUpdatedBus = useEventBus<{ date: string; hour: number }>(
    'timeblock-task-updated'
  )

  // 更新任务状态
  const updateTaskStatus = async (noteId: string, path: string[], isChecked: boolean) => {
    try {
      // 确保传递的是简单数据类型
      const pathArray = path.map(String)
      await window.electronAPI.task.updateTaskStatus(noteId, pathArray, isChecked)
      await fetchAllTasks() // 重新获取所有任务以保持同步

      // 根据任务类型发送不同的事件通知
      if (path[0] === 'timeBlock') {
        const task = tasks.value.find((t) => t.noteId === noteId)
        if (task?.timeBlock) {
          timeBlockTaskUpdatedBus.emit({
            date: task.timeBlock.date,
            hour: task.timeBlock.hour
          })
        }
      } else {
        taskUpdatedBus.emit(noteId)
      }
    } catch (error) {
      console.error('更新任务状态失败:', error)
      throw error
    }
  }

  // 获取未完成的任务
  const fetchUncompletedTasks = async () => {
    try {
      const fetchedTasks = await window.electronAPI.task.getUncompletedTasks()
      return fetchedTasks
    } catch (error) {
      console.error('获取未完成任务失败:', error)
      throw error
    }
  }

  // 获取已完成的任务
  const fetchCompletedTasks = async () => {
    try {
      const fetchedTasks = await window.electronAPI.task.getCompletedTasks()
      return fetchedTasks
    } catch (error) {
      console.error('获取已完成任务失败:', error)
      throw error
    }
  }

  // 按笔记分组获取任务
  const fetchTasksByNote = async () => {
    try {
      const groupedTasks = await window.electronAPI.task.getTasksByNote()
      tasksByNote.value = groupedTasks
      return groupedTasks
    } catch (error) {
      console.error('按笔记分组获取任务失败:', error)
      throw error
    }
  }

  // 小组件控制
  const openTaskWidget = () => (isTaskWidgetOpen.value = true)
  const closeTaskWidget = () => (isTaskWidgetOpen.value = false)
  const toggleTaskWidget = () => (isTaskWidgetOpen.value = !isTaskWidgetOpen.value)

  return {
    // 状态
    tasks,
    tasksByNote,
    isTaskWidgetOpen,

    // 计算属性
    uncompletedTasks,
    completedTasks,
    totalTaskCount,
    completedTaskCount,
    completionRate,

    // 方法
    fetchAllTasks,
    updateTaskStatus,
    fetchUncompletedTasks,
    fetchCompletedTasks,
    fetchTasksByNote,
    openTaskWidget,
    closeTaskWidget,
    toggleTaskWidget
  }
})
