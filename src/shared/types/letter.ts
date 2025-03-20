// 信件类型
export type LetterType = 'daily' | 'weekly'

// 信件内容接口
export interface Letter {
  id: string // 修改为 string 类型，使用 UUID
  type: LetterType
  content: string // 信件内容
  createTime: number // 创建时间戳
  readStatus: boolean // 阅读状态
  startTime: number // 统计开始时间
  endTime: number // 统计结束时间
}

// 创建信件的参数
export interface CreateLetterParams {
  type: LetterType
  content: string
  startTime: number
  endTime: number
}

// 获取信件列表的参数
export interface GetLetterListParams {
  page: number
  pageSize: number
  type?: LetterType
}

// 信件列表的返回结果
export interface GetLetterListResult {
  total: number
  list: Letter[]
}
