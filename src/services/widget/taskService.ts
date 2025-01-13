import { db } from '../../db/config'
import { Task } from '@shared/types'

// 工具函数：从JSON内容中提取任务文本
function extractTaskText(content: any): string {
  try {
    return content?.content?.[0]?.content?.[0]?.text || ''
  } catch (error) {
    console.error('解析任务文本失败:', error)
    return ''
  }
}

// 递归函数：遍历内容查找任务项
function findTasks(node: any, note: any, tasks: Task[], path: string[] = []) {
  if (!node) return

  // 如果是任务项
  if (node.type === 'taskItem') {
    tasks.push({
      noteId: note.id,
      address: note.address,
      text: extractTaskText(node),
      isChecked: Boolean(node.attrs?.checked),
      path: path
    })
    return
  }

  // 如果有子内容，继续遍历
  if (Array.isArray(node.content)) {
    node.content.forEach((child: any, index: number) => {
      findTasks(child, note, tasks, [...path, 'content', index.toString()])
    })
  }
}

// 获取所有任务
export async function getAllTasks(includeCompleted: boolean = false): Promise<Task[]> {
  try {
    console.log('服务端→ 开始获取任务:', { includeCompleted })
    const tasks: Task[] = []

    // 1. 获取笔记中的任务
    const notes = await db('notes')
      .select(['id', 'address', 'content'])
      .where('isDeleted', false)
      .whereRaw('json_valid(content) = 1')

    // 遍历笔记内容
    notes.forEach((note) => {
      try {
        const content = JSON.parse(note.content)
        if (Array.isArray(content.content)) {
          content.content.forEach((block: any, index: number) => {
            findTasks(block, note, tasks, ['content', index.toString()])
          })
        }
      } catch (error) {
        console.error('解析笔记内容失败:', error)
      }
    })

    // 2. 获取时间块中的任务
    const timeBlocks = await db('time_blocks')
      .select(['id', 'dayId', 'hour', 'content'])
      .whereNotNull('content')

    // 遍历时间块内容
    for (const block of timeBlocks) {
      try {
        if (block.content) {
          // 使用正则表达式匹配任务项
          const taskRegex =
            /<div[^>]*data-type="bullet-task"[^>]*data-status="(pending|completed)"[^>]*class="[^"]*"[^>]*>(.*?)<\/div>/g
          let match

          while ((match = taskRegex.exec(block.content)) !== null) {
            const status = match[1]
            const text = match[2].replace(/<[^>]*>/g, '').trim() // 移除可能的HTML标签

            // 获取时间块对应的日期
            const day = await db('time_block_days').select('date').where('id', block.dayId).first()

            tasks.push({
              noteId: block.id,
              address: `${day?.date} ${block.hour}:00`,
              text: text,
              isChecked: status === 'completed',
              path: ['timeBlock'],
              timeBlock: {
                date: day?.date,
                hour: block.hour
              }
            })
          }
        }
      } catch (error) {
        console.error('解析时间块内容失败:', error)
      }
    }

    // 根据参数决定是否过滤已完成任务
    const filteredTasks = includeCompleted ? tasks : tasks.filter((task) => !task.isChecked)

    console.log('处理完成，任务数量:', filteredTasks.length)
    return filteredTasks
  } catch (error) {
    console.error('获取任务失败:', error)
    throw error
  }
}

// 更新任务状态
export async function updateTaskStatus(
  noteId: string,
  path: string[],
  isChecked: boolean
): Promise<void> {
  try {
    console.log('服务端→ 开始更新任务状态:', { noteId, path, isChecked })

    // 判断是否是时光记任务
    if (path[0] === 'timeBlock') {
      // 获取时间块内容
      const timeBlock = await db('time_blocks').where('id', noteId).first()
      if (!timeBlock) {
        throw new Error(`时间块不存在: ${noteId}`)
      }

      // 更新 HTML 内容中的任务状态
      const content = timeBlock.content
      const newStatus = isChecked ? 'completed' : 'pending'
      const updatedContent = content.replace(
        /(data-type="bullet-task"[^>]*data-status=")[^"]*(")/,
        `$1${newStatus}$2`
      )

      // 保存更新后的内容
      await db('time_blocks').where('id', noteId).update({
        content: updatedContent,
        updatedAt: new Date()
      })
    } else {
      // 处理普通笔记任务
      const note = await db('notes').where('id', noteId).first()
      if (!note) {
        throw new Error(`笔记不存在: ${noteId}`)
      }

      // 解析内容
      const content = JSON.parse(note.content)

      // 根据路径更新任务状态
      let current = content
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i]
        if (current[key] === undefined) {
          throw new Error(`无效的路径: ${path.join('.')}`)
        }
        current = current[key]
      }

      // 获取最后一个节点
      const lastKey = path[path.length - 1]
      if (!current[lastKey]) {
        throw new Error(`无效的路径: ${path.join('.')}`)
      }

      // 更新checked状态
      if (!current[lastKey].attrs) {
        current[lastKey].attrs = {}
      }
      current[lastKey].attrs.checked = isChecked

      // 保存更新后的内容
      await db('notes')
        .where('id', noteId)
        .update({
          content: JSON.stringify(content),
          updatedAt: new Date()
        })
    }

    console.log('任务状态更新成功')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    throw error
  }
}

// 获取未完成的任务
export async function getUncompletedTasks(): Promise<Task[]> {
  return getAllTasks(false)
}

// 获取已完成的任务
export async function getCompletedTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks(true) // 获取所有任务
    return tasks.filter((task) => task.isChecked)
  } catch (error) {
    console.error('获取已完成任务失败:', error)
    throw error
  }
}

// 按笔记分组获取任务
export async function getTasksByNote(
  includeCompleted: boolean = false
): Promise<{ [noteId: string]: Task[] }> {
  try {
    const tasks = await getAllTasks(includeCompleted)
    return tasks.reduce(
      (acc, task) => {
        if (!acc[task.noteId]) {
          acc[task.noteId] = []
        }
        acc[task.noteId].push(task)
        return acc
      },
      {} as { [noteId: string]: Task[] }
    )
  } catch (error) {
    console.error('按笔记分组获取任务失败:', error)
    throw error
  }
}
