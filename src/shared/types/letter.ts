import { ModelConfig } from './llm'

// 信件类型
export type LetterType = 'daily' | 'weekly'

// 信件内容接口
export interface Letter {
  id: string
  type: LetterType
  content: string
  createTime: number
  readStatus: boolean
  startTime: number
  endTime: number
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

// 信件全局配置接口
export interface LetterConfig {
  // 基础配置
  recipient: string // 收件人
  sender: string // 寄件人
  useNickname: boolean // 是否启用爱称

  // 笔记获取配置
  dailyNotesLimit: number // 每日获取笔记的数量
  weeklyNotesLimit: number // 每周获取笔记的数量

  // AI 生成配置
  modelId: ModelConfig['id'] // 大模型ID
  temperature: number // 温度参数 (0-1)

  // 自定义提示词
  customPrompt: string // 每日来信自定义提示词
  weeklyCustomPrompt: string // 每周来信自定义提示词
}

// 配置验证规则
export const LETTER_CONFIG_RULES = {
  dailyNotesLimit: {
    min: 1,
    max: 20
  },
  weeklyNotesLimit: {
    min: 1,
    max: 50
  },
  temperature: {
    min: 0,
    max: 1
  }
}

// 验证配置的错误信息
export interface ConfigValidationError {
  field: keyof LetterConfig
  message: string
}

// 验证配置的结果
export interface ConfigValidationResult {
  isValid: boolean
  errors: ConfigValidationError[]
}

// 获取配置的响应
export interface GetLetterConfigResult extends LetterConfig {
  createdAt: number
  updatedAt: number
}

// 更新配置的参数
export type UpdateLetterConfigParams = Partial<LetterConfig>
