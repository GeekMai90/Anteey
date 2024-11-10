// src/renderer/src/types/RAG.ts
export interface RAGResult {
  noteId: string
  title: string
  content: string
  similarity: number
  createdAt: string
}

export interface RAGContext {
  query: string
  timestamp: string
  relevantDocs: RAGResult[]
  response?: string // 添加可选的 response 字段
}

export interface RAGHistoryItem {
  id: string
  query: string
  context: RAGContext
  createdAt: string
  updatedAt: string
}
