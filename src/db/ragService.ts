// src/db/ragService.ts
// 基于关键词和向量检索的RAG服务
import { db } from './config'
import { initEmbeddings } from './embeddingService'
import log from 'electron-log'
import { RAGContext, RAGResult } from '../renderer/src/types/RAG'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from '../services/llmService'
import { SimilarityService } from './utils/calculateSimilarity'
import { extractKeywords } from './similarityService'

// 初始化 LLM 服务
const llm = new LLMService(process.env.ZHIPU_API_KEY || '')

// 将数据库结果转换为前端需要的格式
function transformDBResult(result: any): RAGResult {
  return {
    noteId: result.id,
    title: result.title,
    content: result.content,
    similarity: result.similarity,
    createdAt: new Date(Number(result.createdAt)).toISOString()
  }
}

export async function retrieveContext(query: string, limit: number = 3): Promise<RAGContext> {
  try {
    // 1. 初始化向量模型并生成查询向量
    const embedder = await initEmbeddings()
    const queryVector = await embedder(query)
    const queryFloat32Array = new Float32Array(queryVector)

    // 从查询中提取关键词
    const queryKeywords = await extractKeywords(query)
    log.info('查询关键词:', queryKeywords)

    // 2. 获取所有笔记
    const notes = await db('note_embeddings')
      .join('notes', 'note_embeddings.note_id', 'notes.id')
      .select('notes.*', 'note_embeddings.embedding', 'note_embeddings.keywords')

    log.info('检索到的笔记:', {
      总数: notes.length,
      示例: notes.slice(0, 2).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content?.substring(0, 50) + '...',
        hasEmbedding: !!n.embedding,
        keywords: n.keywords
      }))
    })

    // 3. 计算相似度
    const results = notes
      .map((note) => {
        try {
          if (!note.embedding) {
            return null
          }

          const noteVector = SimilarityService.blobToFloat32Array(note.embedding)
          const noteKeywords = JSON.parse(note.keywords || '[]')

          const similarity = SimilarityService.calculateSimilarity(
            queryFloat32Array,
            noteVector,
            queryKeywords,
            noteKeywords
          )

          log.debug('相似度计算:', {
            笔记ID: note.id,
            标题: note.title,
            相似度: similarity
          })

          return {
            ...note,
            similarity
          }
        } catch (error) {
          log.error('处理笔记相似度失败:', { id: note.id, error })
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => {
        const SIMILARITY_THRESHOLD = 0.15
        return result !== null && result.similarity > SIMILARITY_THRESHOLD
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // 4. 转换结果
    const relevantDocs = results.map(transformDBResult)

    log.info('RAG检索结果:', {
      查询: query,
      关键词: queryKeywords,
      相关文档数: relevantDocs.length,
      相似度详情: relevantDocs.map((doc) => ({
        id: doc.noteId,
        title: doc.title,
        similarity: doc.similarity
      }))
    })

    return {
      query,
      timestamp: new Date().toISOString(),
      relevantDocs
    }
  } catch (error) {
    log.error('RAG检索失败:', error)
    throw error
  }
}

// 保存检索历史
export async function saveRAGHistory(context: RAGContext): Promise<void> {
  try {
    const now = Date.now()
    await db('rag_history').insert({
      id: uuidv4(),
      query: context.query,
      context: JSON.stringify(context),
      createdAt: now,
      updatedAt: now
    })
  } catch (error) {
    log.error('保存RAG历史失败:', error)
    throw error
  }
}

// 获取检索历史
export async function getRAGHistory(limit: number = 10): Promise<RAGContext[]> {
  try {
    const history = await db('rag_history').orderBy('createdAt', 'desc').limit(limit)

    return history.map((item) => ({
      ...JSON.parse(item.context),
      timestamp: new Date(Number(item.createdAt)).toISOString()
    }))
  } catch (error) {
    log.error('获取RAG历史失败:', error)
    throw error
  }
}

export async function generateAnswer(query: string): Promise<string> {
  try {
    // 1. 获取相关上下文
    const context = await retrieveContext(query)

    // 2. 构建中文提示词
    const prompt = buildPrompt(query, context)

    // 3. 调用大模型
    const response = await llm.generateResponse(prompt)

    // 4. 保存历史记录
    await saveRAGHistory({
      ...context,
      response: response
    })

    return response
  } catch (error) {
    log.error('生成回答失败:', error)
    throw error
  }
}

// 构建中文提示词
function buildPrompt(query: string, context: RAGContext): string {
  const contextText = context.relevantDocs
    .map((doc) => `【笔记标题】${doc.title}\n【笔记内容】${doc.content}`)
    .join('\n\n')

  return `
请基于以下笔记内容回答用户的问题：

${contextText}

用户问题：${query}

要求：
1. 仅使用提供的笔记内容作为信息来源
2. 如果笔记内容不足以完整回答问题，请明确说明
3. 回答要简洁清晰
4. 必要时可以引用具体的笔记内容作为依据
`
}
