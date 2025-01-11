// 每日金句数据结构
export interface DailyQuote {
  id: string
  content: string // 金句内容
  author: string // 作者
}

// 小组件类型
export interface DailyQuoteWidget {
  type: 'daily-quote'
  data: DailyQuote
}
