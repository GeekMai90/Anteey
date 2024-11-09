// 文本块相关类型
export interface TextChunk {
  text: string
  metadata: ChunkMetadata
}

export interface ChunkMetadata {
  startPos: number
  endPos: number
  source?: {
    noteId?: string
    section?: string
    path?: string
  }
  highlights?: string[]
}

// 搜索相关类型
export interface SearchOptions {
  limit?: number
  minSimilarity?: number
  includeMetadata?: boolean
  rerank?: boolean
}

export interface SearchResult {
  noteId: string
  text: string
  similarity: number
  similarityLevel: string
  metadata: ChunkMetadata
}

export interface EnhancedSearchResult {
  results: SearchResult[]
  totalFound: number
  timeTaken: number
  metadata: {
    query: string
    strategy: string
    filters?: any
  }
}

// 向量相关类型
export interface VectorData {
  vector: number[]
  metadata: ChunkMetadata
}

export interface IndexedVector extends VectorData {
  id: string
  timestamp: number
}
