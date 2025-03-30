// 向量存储接口
export interface NoteEmbedding {
  note_id: string
  embedding: Buffer
  keywords?: string[]
  created_at: number
  updated_at: number
  model_version: string
}

// 向量搜索结果
export interface VectorSearchResult {
  noteId: string
  score: number // 相似度分数
  distance: number // 向量距离
}

// 向量搜索参数
export interface VectorSearchParams {
  query: string
  limit?: number
  threshold?: number // 相似度阈值
  includeContent?: boolean // 是否包含笔记内容
}

// 向量搜索响应
export interface VectorSearchResponse {
  results: VectorSearchResult[]
  timing?: {
    vectorization: number
    search: number
    total: number
  }
}

// 关键词
export interface Keyword {
  word: string
  weight: number
}
