// 任务数据结构
export interface Task {
  noteId: string
  address: string
  text: string
  isChecked: boolean
  path: string[]
  timeBlock?: {
    date: string
    hour: number
  }
}

// 任务服务接口
export interface TaskService {
  // 获取所有任务
  getAllTasks(): Promise<Task[]>
  // 更新任务状态
  updateTaskStatus(noteId: string, path: string[], isChecked: boolean): Promise<void>
}
