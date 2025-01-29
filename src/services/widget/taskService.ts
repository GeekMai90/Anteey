import { db } from '../../db/config'
import { Task } from '@shared/types'

/**
 * 工具函数：从JSON内容中提取任务文本
 * 由于任务内容存储在嵌套的JSON结构中，这个函数用于安全地提取文本内容
 * @param content - JSON格式的任务内容
 * @returns 提取出的任务文本，如果提取失败则返回空字符串
 */
function extractTaskText(content: any): string {
  try {
    return content?.content?.[0]?.content?.[0]?.text || ''
  } catch (error) {
    console.error('解析任务文本失败:', error)
    return ''
  }
}

/**
 * 递归函数：深度遍历内容树，查找并收集所有任务项
 * @param node - 当前遍历的节点
 * @param note - 所属的笔记对象
 * @param tasks - 收集任务的数组
 * @param path - 当前节点在内容树中的路径
 */
function findTasks(node: any, note: any, tasks: Task[], path: string[] = []) {
  // 如果节点为空，直接返回
  if (!node) return

  // 如果当前节点是任务项（type === 'taskItem'）
  if (node.type === 'taskItem') {
    tasks.push({
      noteId: note.id, // 所属笔记的ID
      address: note.address, // 笔记的地址
      text: extractTaskText(node), // 任务文本内容
      isChecked: Boolean(node.attrs?.checked), // 任务是否已完成
      path: path // 任务在内容树中的路径
    })
    return
  }

  // 如果当前节点有子内容，递归遍历每个子节点
  if (Array.isArray(node.content)) {
    node.content.forEach((child: any, index: number) => {
      findTasks(child, note, tasks, [...path, 'content', index.toString()])
    })
  }
}

/**
 * 获取系统中的所有任务
 * 包括笔记中的任务和时间块中的任务
 * @param includeCompleted - 是否包含已完成的任务
 * @returns 任务数组
 */
export async function getAllTasks(includeCompleted: boolean = false): Promise<Task[]> {
  try {
    const tasks: Task[] = []

    // 1. 从笔记中获取任务
    // 查询未删除且内容为有效JSON的笔记
    const notes = await db('notes')
      .select(['id', 'address', 'content'])
      .where('isDeleted', false)
      .whereRaw('json_valid(content) = 1')

    // 遍历每个笔记，解析其内容并查找任务
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

    // 2. 从时间块中获取任务
    const timeBlocks = await db('time_blocks')
      .select(['id', 'dayId', 'hour', 'content'])
      .whereNotNull('content')

    // 遍历时间块，使用正则表达式匹配任务项
    for (const block of timeBlocks) {
      try {
        if (block.content) {
          // 正则表达式用于匹配HTML格式的任务项
          const taskRegex =
            /<div[^>]*data-type="bullet-task"[^>]*data-status="(pending|completed)"[^>]*class="[^"]*"[^>]*>(.*?)<\/div>/g
          let match

          // 循环匹配所有任务项
          while ((match = taskRegex.exec(block.content)) !== null) {
            const status = match[1] // 任务状态（pending或completed）
            const text = match[2].replace(/<[^>]*>/g, '').trim() // 清理HTML标签，获取纯文本

            // 获取时间块对应的日期信息
            const day = await db('time_block_days').select('date').where('id', block.dayId).first()

            // 将任务添加到任务列表
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
    return filteredTasks
  } catch (error) {
    console.error('获取任务失败:', error)
    throw error
  }
}

/**
 * 更新任务的完成状态
 * @param noteId - 任务所属笔记或时间块的ID
 * @param path - 任务在内容树中的路径
 * @param isChecked - 新的完成状态
 */
export async function updateTaskStatus(
  noteId: string,
  path: string[],
  isChecked: boolean
): Promise<void> {
  try {
    console.log('服务端→ 开始更新任务状态:', { noteId, path, isChecked })

    // 判断是否是时间块中的任务
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

    // console.log('任务状态更新成功')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    throw error
  }
}

/**
 * 获取所有未完成的任务
 * 这是一个便捷方法，实际调用 getAllTasks(false)
 */
export async function getUncompletedTasks(): Promise<Task[]> {
  return getAllTasks(false)
}

/**
 * 获取所有已完成的任务
 * 先获取所有任务，然后过滤出已完成的任务
 */
export async function getCompletedTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks(true)
    return tasks.filter((task) => task.isChecked)
  } catch (error) {
    console.error('获取已完成任务失败:', error)
    throw error
  }
}

/**
 * 按笔记分组获取任务
 * 返回一个对象，key是笔记ID，value是该笔记下的所有任务
 * @param includeCompleted - 是否包含已完成的任务
 * @returns 按笔记ID分组的任务映射对象
 */
export async function getTasksByNote(
  includeCompleted: boolean = false
): Promise<{ [noteId: string]: Task[] }> {
  try {
    const tasks = await getAllTasks(includeCompleted)
    // 使用reduce方法将任务按笔记ID分组
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
