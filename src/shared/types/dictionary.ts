// 接口定义
export interface DictWord {
  word: string
  weight: number
  frequency: number
  documents: number
  lastSeen: number
  cooccurrences: string // JSON 字符串
  source: 'auto' | 'manual'
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WordSuggestion {
  word: string
  weight: number
  score: number
  reason: string // JSON 字符串
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
  processedAt?: Date
}
