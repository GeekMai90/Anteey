import { db } from '../../db/config'
import {
  ConfigValidationError,
  ConfigValidationResult,
  GetLetterConfigResult,
  Letter,
  LETTER_CONFIG_RULES,
  LetterConfig,
  LetterType,
  UpdateLetterConfigParams
} from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from '../rag/llmService'
import { getNotesByOneDate } from '../notes/notesService'

// 工具函数：将数据库记录转换为 Letter 对象
function convertToLetter(record: any): Letter {
  return {
    id: record.id, // 直接使用 UUID
    type: record.type,
    content: record.content,
    createTime: new Date(record.createTime).getTime(),
    readStatus: Boolean(record.readStatus),
    startTime: new Date(record.startTime).getTime(),
    endTime: new Date(record.endTime).getTime()
  }
}

// 添加重试函数
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 2000
): Promise<T> {
  let lastError: any
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.log(`尝试第 ${i + 1} 次失败，${maxRetries - i - 1} 次重试机会剩余`)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// 解析笔记内容为纯文本
function parseNoteContent(content: any): string {
  if (!content) return ''

  function extractText(node: any): string {
    if (!node) return ''

    // 如果是文本节点，处理文本和标记
    if (node.type === 'text') {
      let text = node.text || ''
      // 处理文本标记（marks）
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**` // 保留加粗标记
              break
            case 'italic':
              text = `*${text}*` // 保留斜体标记
              break
            // 可以添加其他标记的处理
          }
        })
      }
      return text
    }

    // 处理子内容
    let result = ''
    if (Array.isArray(node.content)) {
      result = node.content.map((child: any) => extractText(child)).join('')
    }

    // 根据节点类型添加适当的格式
    switch (node.type) {
      case 'doc':
        return result

      case 'heading': {
        const level = node.attrs?.level || 1
        const prefix = '#'.repeat(level) + ' '
        return `${prefix}${result}\\n\\n`
      }

      case 'paragraph':
        return `${result}\\n\\n`

      case 'bulletList':
        return result + '\\n'

      case 'orderedList':
        return result + '\\n'

      case 'listItem':
        return `• ${result}`

      case 'taskList':
        return result + '\\n'

      case 'taskItem': {
        const checkbox = node.attrs?.checked ? '[x]' : '[ ]'
        return `${checkbox} ${result}`
      }

      case 'image':
        // 直接跳过图片
        return ''

      case 'table':
        // 简化表格内容，只保留文本
        return `[表格内容]\\n${result}\\n`

      case 'tableRow':
        return result + '\\n'

      case 'tableCell':
      case 'tableHeader':
        return result + ' | '

      case 'codeBlock':
        // 直接跳过代码块
        return ''

      default:
        return result
    }
  }

  try {
    // 如果内容是字符串，尝试解析为 JSON
    const contentObj = typeof content === 'string' ? JSON.parse(content) : content
    const text = extractText(contentObj)

    // 清理格式
    return text
      .replace(/\|\s*\n/g, '\\n') // 清理表格末尾的竖线
      .replace(/\\n\\n+/g, '\\n\\n') // 清理多余的换行
      .replace(/\s+/g, ' ') // 清理多余的空格
      .trim()
  } catch (e) {
    console.error('解析笔记内容失败:', e)
    return '内容解析失败'
  }
}

// 获取前一天的笔记
async function getFilteredNotes(dateStr: string) {
  const notes = await getNotesByOneDate(dateStr)

  // 按创建时间倒序排序
  notes.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime()
    const timeB = new Date(b.createdAt || 0).getTime()
    return timeB - timeA
  })

  // 只取最新的6条笔记
  const MAX_NOTES = 6
  const filteredNotes = notes.slice(0, MAX_NOTES)

  return filteredNotes
}

// 处理笔记内容，限制长度
function processNoteContent(content: string): string {
  const MAX_CONTENT_LENGTH = 500 // 每条笔记最多500字
  const processed =
    content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) + '...' : content
  return processed
}

// 系统默认提示词模板
const DEFAULT_LETTER_PROMPT = `你是一位知性女生，温柔、善解人意，对生活充满美好的期待。请以这个身份，根据以下的笔记内容，写一封温暖的回信。这封信是关于昨天（{date}）的笔记回顾与思考。{notesCountInfo}

以下是昨天的笔记内容：

{notesContent}

角色特质：
1. 知性优雅，措辞得体但不过分文艺
2. 性格温暖，善于发现生活中的美好
3. 思维细腻，能够捕捉到细节中的闪光点
4. 富有同理心，能够体会他人的想法
5. 乐观积极，但不失理性思考

要求：
1. 直接开始正文，不要添加"亲爱的"等开头语，也不要在结尾添加"你的朋友"等署名
2. 字数严格控制在250字以内
3. 语气要温暖自然，像闺蜜间的深度交流
4. 内容要体现出对笔记内容的理解和思考
5. 每个段落要自然流畅，避免生硬的总结

表达风格（随机选择一种，但不要明确提及）：
1. 凯文·凯利式的好奇与长期思考
2. 乔布斯式的简洁与直觉连接
3. 奥斯汀·克莱恩式的实验精神
4. 苏菲·钟式的观察与反思
5. 日常朋友式的轻松与支持

行文结构：
1. 开场：
   - 避免直接描述天气，改用更富有诗意的意象或个人感受
   - 可以从一个细微的生活观察、一个独特的感悟、一个有趣的联想开始
   - 善用比喻和意象，但要自然不做作
   - 可以联系季节特征，但要表达独特的体验和感受
   - 开场要简洁有力，点到为止，不要过分铺陈
2. 正文：
   - 从笔记中找到有趣的思考点
   - 分享一个相关的小洞察或个人经验
   - 提出一个轻量级的思考方向
3. 结尾：用温暖期待的语言结束，为下次交流预留空间

表达技巧：
1. 开场灵感来源（请根据当下感受选择一个方向，用自己的语言表达）：
   - 生活观察：可以是一个微小的生活场景、一个意外的发现、一个有趣的巧合
   - 感官体验：可以是一缕光、一个声音、一缕香气带来的联想
   - 时间流动：可以是某个时刻的独特韵律、季节更替的细微变化
   - 空间感受：可以是居所的一角、窗外的景致、都市的某个片段
   - 情绪触动：可以是某个瞬间的心情、突然的感悟、温暖的回忆

2. 语言风格：
   - 用优雅自然的表达，不需要过分华丽
   - 用具体的意象代替抽象的形容
   - 用个人化的视角展现独特的观察
   - 避免使用陈词滥调和过度修饰

3. 引导方式：
   - 使用"我发现..."、"这让我想起..."等柔和引导语
   - 通过具体的场景或细节展开对话
   - 用自然的联想建立共鸣
   - 保持语气的轻松与真诚

4. 注意事项：
   - 每次开场都应该是独特的，不要重复使用相似的表达
   - 避免过于刻意的文学腔调
   - 保持表达的简洁和自然
   - 让开场与后文形成自然的连接

严格避免：
1. 陈词滥调的天气描述（如"天气晴朗"、"阳光明媚"等）
2. 生硬的问候语和结尾署名
3. 过于直白或缺乏美感的表达
4. 任何形式的开头问候语和结尾署名
5. 机械化的内容总结
6. 说教式的建议
7. 过于复杂的理论分析
8. 生硬的过渡和结构
9. 重复性的表达方式
10. 过分感性或矫情的表达

请确保整封信读起来自然流畅，体现出一个知性女生的思考深度和情感温度。`

// 修改生成每日信件内容的函数
async function generateDailyLetterContent(date: Date): Promise<string> {
  const llmService = new LLMService()

  // 获取来信配置
  const letterConfig = await getLetterConfig()

  // 获取前一天的日期
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // 获取处理后的笔记
  const notes = await getFilteredNotes(yesterdayStr)

  // 如果没有笔记，返回特定消息
  if (notes.length === 0) {
    return `昨天似乎是一个安静的日子，没有留下笔记的痕迹。这也是一种选择，有时沉淀和思考同样重要。\\n\\n不过我还是想和你分享一个小想法：有时最好的灵感往往来自于平凡的日常观察。也许今天，我们可以试着记录下一个微小但有趣的发现？\\n\\n期待在下一封信中遇见你的思考。`
  }

  // 准备笔记内容摘要
  const notesContent = notes
    .map((note) => {
      const metadata = note.metadata || {}
      const title = metadata.title || '无标题'
      const content = processNoteContent(parseNoteContent(note.content))
      return `标题：${title}\\n内容：${content}`
    })
    .join('\\n\\n')

  // 添加笔记数量信息
  const totalNotes = await getNotesByOneDate(yesterdayStr)
  const notesCountInfo =
    totalNotes.length > notes.length
      ? `（从${totalNotes.length}条笔记中精选了${notes.length}条最新的记录）`
      : ''

  // 根据配置选择使用的提示词
  let prompt = letterConfig.customPrompt ? letterConfig.customPrompt : DEFAULT_LETTER_PROMPT

  // 替换模板变量
  prompt = prompt
    .replace('{date}', yesterdayStr)
    .replace('{notesContent}', notesContent)
    .replace('{notesCountInfo}', notesCountInfo)

  // 使用重试机制调用 LLM
  return await retryOperation(async () => {
    try {
      // 尝试使用配置的模型
      return await llmService.generateResponse(prompt, letterConfig.modelId, {
        temperature: letterConfig.temperature
      })
    } catch (error) {
      console.error('使用自定义模型失败，切换到默认模型:', error)
      // 如果失败，使用默认模型（不传参数）
      return await llmService.generateResponse(prompt)
    }
  })
}

// 获取一周的笔记并智能筛选
async function getFilteredWeeklyNotes(startDate: Date, endDate: Date) {
  interface Note {
    id: string
    createdAt: string | Date
    content: any
    metadata?: {
      title?: string
    }
  }

  const notes: Note[] = []
  const dailyNotes = new Map<string, Note[]>()

  // 收集每天的笔记
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayNotes = await getNotesByOneDate(dateStr)
    if (dayNotes.length > 0) {
      dailyNotes.set(dateStr, dayNotes)
    }
  }

  // 智能筛选策略
  const MAX_NOTES_PER_DAY = 3 // 每天最多取3条笔记
  const MAX_TOTAL_NOTES = 12 // 一周最多取12条笔记

  // 1. 首先确保每天都有代表性的笔记
  for (const [, dayNotes] of dailyNotes) {
    // 按创建时间排序
    const sorted = dayNotes.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime()
      const timeB = new Date(b.createdAt || 0).getTime()
      return timeB - timeA
    })

    // 每天取最新的笔记
    notes.push(...sorted.slice(0, MAX_NOTES_PER_DAY))
  }

  // 2. 如果总数超过限制，进行二次筛选
  if (notes.length > MAX_TOTAL_NOTES) {
    // 按时间均匀分布选择笔记
    const step = Math.ceil(notes.length / MAX_TOTAL_NOTES)
    return notes.filter((_, index) => index % step === 0).slice(0, MAX_TOTAL_NOTES)
  }

  return notes
}

// 处理周报的笔记内容
function processWeeklyNoteContent(content: string): string {
  const MAX_CONTENT_LENGTH = 250 // 每条笔记最多250字
  const processed =
    content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) + '...' : content
  return processed
}

// 修改每周信件生成函数
async function generateWeeklyLetterContent(date: Date): Promise<string> {
  const llmService = new LLMService()

  // 获取过去一周的日期范围
  const endDate = new Date(date)
  const startDate = new Date(date)
  startDate.setDate(startDate.getDate() - 7)

  // 获取处理后的笔记
  const notes = await getFilteredWeeklyNotes(startDate, endDate)

  // 如果没有笔记，返回特定消息
  if (notes.length === 0) {
    return `这一周似乎比较特别，没有留下笔记的痕迹。有时放慢脚步，给思考一些沉淀的空间也是很好的。\\n\\n每周的积累就像是在编织一张思维的网，即使有些网格暂时是空的，也为未来的思考预留了位置。\\n\\n新的一周即将开始，也许我们可以尝试用一个新的视角来观察和记录？期待在下周的信中看到你的发现。`
  }

  // 按日期分组处理笔记
  const notesByDate = new Map<string, any[]>()
  notes.forEach((note) => {
    const date = new Date(note.createdAt).toISOString().split('T')[0]
    if (!notesByDate.has(date)) {
      notesByDate.set(date, [])
    }
    notesByDate.get(date)?.push(note)
  })

  // 准备笔记内容摘要
  const notesContent = Array.from(notesByDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, dayNotes]) => {
      const processedNotes = dayNotes
        .map((note) => {
          const metadata = note.metadata || {}
          const title = metadata.title || '无标题'
          const content = processWeeklyNoteContent(parseNoteContent(note.content))
          return `标题：${title}\\n内容：${content}`
        })
        .join('\\n')
      return `${date}:\\n${processedNotes}`
    })
    .join('\\n\\n')

  // 添加笔记统计信息
  const totalNotesDays = notesByDate.size
  const totalNotesCount = notes.length
  const statsInfo = `（在过去的一周中，你在 ${totalNotesDays} 天记录了笔记，共精选了 ${totalNotesCount} 条有意义的记录）`

  // 获取来信配置
  const letterConfig = await getLetterConfig()

  // 提取默认周报提示词模板
  const DEFAULT_WEEKLY_PROMPT = `你是一位知性女生，温柔、善解人意，对生活充满美好的期待。请以这个身份，根据以下的笔记内容，写一封温暖的周报信，回顾过去一周（{startDate} 到 {endDate}）的笔记积累。{statsInfo}

以下是这一周的笔记内容（按时间顺序排列）：

{notesContent}

角色特质：
1. 知性优雅，措辞得体但不过分文艺
2. 性格温暖，善于发现生活中的美好
3. 思维细腻，能够捕捉到细节中的闪光点
4. 富有同理心，能够体会他人的想法
5. 乐观积极，但不失理性思考

要求：
1. 直接开始正文，不要添加"亲爱的"等开头语，也不要在结尾添加"你的朋友"等署名
2. 字数严格控制在250字以内
3. 语气要温暖自然，像闺蜜间的深度交流
4. 内容要体现出对一周笔记的整体理解和思考脉络
5. 每个段落要自然流畅，避免机械式的总结

表达风格（随机选择一种，但不要明确提及）：
1. 凯文·凯利式的好奇与长期思考
2. 乔布斯式的简洁与直觉连接
3. 奥斯汀·克莱恩式的实验精神
4. 苏菲·钟式的观察与反思
5. 日常朋友式的轻松与支持

行文结构：
1. 开场：
   - 避免直接描述天气，改用更富有诗意的意象或个人感受
   - 可以从一个细微的生活观察、一个独特的感悟、一个有趣的联想开始
   - 善用比喻和意象，但要自然不做作
   - 可以联系季节特征，但要表达独特的体验和感受
   - 开场要简洁有力，点到为止，不要过分铺陈
2. 正文：
   - 找出这周笔记中的思考主线
   - 发现笔记之间有趣的连接点
   - 分享一个关于知识积累的小洞察
3. 结尾：用温暖期待的语言结束，为下周的思考预留空间

表达技巧：
1. 开场灵感来源（请根据当下感受选择一个方向，用自己的语言表达）：
   - 生活观察：可以是一个微小的生活场景、一个意外的发现、一个有趣的巧合
   - 感官体验：可以是一缕光、一个声音、一缕香气带来的联想
   - 时间流动：可以是某个时刻的独特韵律、季节更替的细微变化
   - 空间感受：可以是居所的一角、窗外的景致、都市的某个片段
   - 情绪触动：可以是某个瞬间的心情、突然的感悟、温暖的回忆

2. 语言风格：
   - 用优雅自然的表达，不需要过分华丽
   - 用具体的意象代替抽象的形容
   - 用个人化的视角展现独特的观察
   - 避免使用陈词滥调和过度修饰

3. 引导方式：
   - 使用"我发现..."、"这让我想起..."等柔和引导语
   - 通过具体的场景或细节展开对话
   - 用自然的联想建立共鸣
   - 保持语气的轻松与真诚

4. 注意事项：
   - 每次开场都应该是独特的，不要重复使用相似的表达
   - 避免过于刻意的文学腔调
   - 保持表达的简洁和自然
   - 让开场与后文形成自然的连接

严格避免：
1. 陈词滥调的天气描述（如"天气晴朗"、"阳光明媚"等）
2. 生硬的问候语和结尾署名
3. 过于直白或缺乏美感的表达
4. 任何形式的开头问候语和结尾署名
5. 机械化的按日期总结
6. 说教式的建议
7. 过于复杂的理论分析
8. 生硬的过渡和结构
9. 重复性的表达方式
10. 过分感性或矫情的表达

请确保整封信读起来自然流畅，体现出一个知性女生的思考深度和情感温度。`

  // 根据配置选择使用的提示词
  let prompt = letterConfig.customPrompt ? letterConfig.customPrompt : DEFAULT_WEEKLY_PROMPT

  // 替换模板变量
  prompt = prompt
    .replace('{startDate}', startDate.toISOString().split('T')[0])
    .replace('{endDate}', endDate.toISOString().split('T')[0])
    .replace('{notesContent}', notesContent)
    .replace('{statsInfo}', statsInfo)

  // 使用重试机制调用 LLM
  return await retryOperation(async () => {
    try {
      // 尝试使用配置的模型
      return await llmService.generateResponse(prompt, letterConfig.modelId, {
        temperature: letterConfig.temperature
      })
    } catch (error) {
      console.error('使用自定义模型失败，切换到默认模型:', error)
      // 如果失败，使用默认模型（不传参数）
      return await llmService.generateResponse(prompt)
    }
  })
}

// 修改创建信件函数
export async function createLetter(type: LetterType): Promise<Letter> {
  try {
    const now = new Date()
    const id = uuidv4()

    // 设置统计的时间范围
    let startTime: Date
    let endTime: Date
    if (type === 'daily') {
      startTime = new Date(now)
      startTime.setDate(startTime.getDate() - 1)
      startTime.setHours(0, 0, 0, 0)
      endTime = new Date(startTime)
      endTime.setHours(23, 59, 59, 999)
    } else {
      endTime = new Date(now)
      endTime.setHours(23, 59, 59, 999)
      startTime = new Date(endTime)
      startTime.setDate(startTime.getDate() - 7)
      startTime.setHours(0, 0, 0, 0)
    }

    // 生成信件内容（带重试机制）
    const content = await retryOperation(async () => {
      return type === 'daily'
        ? await generateDailyLetterContent(now)
        : await generateWeeklyLetterContent(now)
    })

    // 创建信件记录
    const letter: Letter = {
      id,
      type,
      content,
      createTime: now.getTime(),
      readStatus: false,
      startTime: startTime.getTime(),
      endTime: endTime.getTime()
    }

    // 在数据库中插入记录
    await db('letters').insert({
      id: letter.id,
      type: letter.type,
      content: letter.content,
      createTime: new Date(letter.createTime).toISOString(),
      readStatus: letter.readStatus,
      startTime: new Date(letter.startTime).toISOString(),
      endTime: new Date(letter.endTime).toISOString()
    })

    return letter
  } catch (error) {
    console.error('后端→ 创建信件失败:', error)
    throw error
  }
}

// 获取信件列表
export async function getLetters(
  page: number = 1,
  limit: number = 10
): Promise<{ letters: Letter[]; total: number }> {
  try {
    const [{ count }] = await db('letters').count('* as count')

    const letters = await db('letters')
      .orderBy('createTime', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)

    return {
      letters: letters.map(convertToLetter),
      total: Number(count)
    }
  } catch (error) {
    console.error('后端→ 获取信件列表失败:', error)
    throw error
  }
}

// 获取单个信件
export async function getLetterById(id: string): Promise<Letter | null> {
  try {
    const letter = await db('letters').where({ id }).first()
    return letter ? convertToLetter(letter) : null
  } catch (error) {
    console.error('后端→ 获取信件失败:', error)
    throw error
  }
}

// 更新信件阅读状态
export async function updateLetterReadStatus(id: string, readStatus: boolean): Promise<Letter> {
  try {
    const [updatedLetter] = await db('letters').where({ id }).update({ readStatus }).returning('*')

    if (!updatedLetter) {
      throw new Error(`信件不存在: ${id}`)
    }

    return convertToLetter(updatedLetter)
  } catch (error) {
    console.error('后端→ 更新信件阅读状态失败:', error)
    throw error
  }
}

// 获取最新的信件
export async function getLatestLetter(): Promise<Letter | null> {
  try {
    const letter = await db('letters').orderBy('createTime', 'desc').first()

    return letter ? convertToLetter(letter) : null
  } catch (error) {
    console.error('后端→ 获取最新信件失败:', error)
    throw error
  }
}

// 获取未读信件数量
export async function getUnreadLettersCount(): Promise<number> {
  try {
    const [{ count }] = await db('letters').where({ readStatus: false }).count('* as count')

    return Number(count)
  } catch (error) {
    console.error('后端→ 获取未读信件数量失败:', error)
    throw error
  }
}

// 检查今天是否已经收到过信件
export async function checkTodayLetter(): Promise<boolean> {
  try {
    // 获取今天的开始和结束时间
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    // 查询今天的 daily 类型信件
    const [{ count }] = await db('letters')
      .where('type', 'daily')
      .whereBetween('createTime', [startOfDay.toISOString(), endOfDay.toISOString()])
      .count('* as count')
    //todo:记得改回去
    console.log('count', count)
    // return Number(count) > 0
    return false
  } catch (error) {
    console.error('后端→ 检查今日信件状态失败:', error)
    throw error
  }
}

// ==================== 来信配置相关方法 ====================

// 工具函数：将数据库记录转换为 LetterConfig 对象
function convertToLetterConfig(record: any): GetLetterConfigResult {
  return {
    recipient: record.recipient,
    sender: record.sender,
    useNickname: Boolean(record.use_nickname),
    dailyNotesLimit: Number(record.daily_notes_limit),
    weeklyNotesLimit: Number(record.weekly_notes_limit),
    modelId: record.model_id,
    temperature: Number(record.temperature),
    customPrompt: record.custom_prompt,
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime()
  }
}

// 获取来信配置
export async function getLetterConfig(): Promise<GetLetterConfigResult> {
  try {
    const config = await db('letter_config').first()

    if (!config) {
      throw new Error('来信配置不存在')
    }

    return convertToLetterConfig(config)
  } catch (error) {
    console.error('后端→ 获取来信配置失败:', error)
    throw error
  }
}

// 更新来信配置
export async function updateLetterConfig(
  params: UpdateLetterConfigParams
): Promise<GetLetterConfigResult> {
  try {
    // 构建更新对象
    const updateData: any = {}

    if (params.recipient !== undefined) updateData.recipient = params.recipient
    if (params.sender !== undefined) updateData.sender = params.sender
    if (params.useNickname !== undefined) updateData.use_nickname = params.useNickname
    if (params.dailyNotesLimit !== undefined) updateData.daily_notes_limit = params.dailyNotesLimit
    if (params.weeklyNotesLimit !== undefined)
      updateData.weekly_notes_limit = params.weeklyNotesLimit
    if (params.modelId !== undefined) updateData.model_id = params.modelId
    if (params.temperature !== undefined) updateData.temperature = params.temperature
    if (params.customPrompt !== undefined) updateData.custom_prompt = params.customPrompt

    // 更新时间戳
    updateData.updated_at = new Date().toISOString()

    // 执行更新
    const [updatedConfig] = await db('letter_config').update(updateData).returning('*')

    if (!updatedConfig) {
      throw new Error('更新来信配置失败')
    }

    return convertToLetterConfig(updatedConfig)
  } catch (error) {
    console.error('后端→ 更新来信配置失败:', error)
    throw error
  }
}

// 验证配置
export function validateLetterConfig(config: Partial<LetterConfig>): ConfigValidationResult {
  const errors: ConfigValidationError[] = []

  // 验证笔记数量限制
  if (config.dailyNotesLimit !== undefined) {
    const { min, max } = LETTER_CONFIG_RULES.dailyNotesLimit
    if (config.dailyNotesLimit < min || config.dailyNotesLimit > max) {
      errors.push({
        field: 'dailyNotesLimit',
        message: `每日笔记数量必须在 ${min} 到 ${max} 之间`
      })
    }
  }

  if (config.weeklyNotesLimit !== undefined) {
    const { min, max } = LETTER_CONFIG_RULES.weeklyNotesLimit
    if (config.weeklyNotesLimit < min || config.weeklyNotesLimit > max) {
      errors.push({
        field: 'weeklyNotesLimit',
        message: `每周笔记数量必须在 ${min} 到 ${max} 之间`
      })
    }
  }

  // 验证温度参数
  if (config.temperature !== undefined) {
    const { min, max } = LETTER_CONFIG_RULES.temperature
    if (config.temperature < min || config.temperature > max) {
      errors.push({
        field: 'temperature',
        message: `温度参数必须在 ${min} 到 ${max} 之间`
      })
    }
  }

  // 验证收件人和寄件人不能为空
  if (config.recipient !== undefined && !config.recipient.trim()) {
    errors.push({
      field: 'recipient',
      message: '收件人不能为空'
    })
  }

  if (config.sender !== undefined && !config.sender.trim()) {
    errors.push({
      field: 'sender',
      message: '寄件人不能为空'
    })
  }

  // 验证模型ID不能为空
  if (config.modelId !== undefined && !config.modelId.trim()) {
    errors.push({
      field: 'modelId',
      message: '必须选择一个模型'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 重置来信配置
export async function resetLetterConfig(defaultModelId: string): Promise<GetLetterConfigResult> {
  try {
    const defaultConfig = {
      recipient: '亲爱的我',
      sender: '未来的自己',
      use_nickname: true,
      daily_notes_limit: 6,
      weekly_notes_limit: 12,
      model_id: defaultModelId,
      temperature: 0.7,
      custom_prompt: '',
      updated_at: new Date().toISOString()
    }

    const [resetConfig] = await db('letter_config').update(defaultConfig).returning('*')

    if (!resetConfig) {
      throw new Error('重置来信配置失败')
    }

    return convertToLetterConfig(resetConfig)
  } catch (error) {
    console.error('后端→ 重置来信配置失败:', error)
    throw error
  }
}

// 添加删除信件的方法
export async function deleteLetter(id: string): Promise<boolean> {
  try {
    // 删除指定 id 的信件
    const deletedCount = await db('letters').where({ id }).delete()

    // 如果删除数量为 0，说明信件不存在
    if (deletedCount === 0) {
      throw new Error(`信件不存在: ${id}`)
    }

    return true
  } catch (error) {
    console.error('后端→ 删除信件失败:', error)
    throw error
  }
}
