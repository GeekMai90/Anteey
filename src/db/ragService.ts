// src/db/ragService.ts
// 基于关键词和向量检索的RAG服务
import { db } from './config'
import { initEmbeddings } from './embeddingService'
import log from 'electron-log'
import { RAGContext, RAGResult } from '../renderer/src/types/assistant'
import { v4 as uuidv4 } from 'uuid'
import { LLMService } from '../services/llmService'
import { SimilarityService } from './utils/calculateSimilarity'
import { extractKeywords } from './similarityService'

// 初始化 LLM 服务
const llm = new LLMService(process.env.ZHIPU_API_KEY || '')

// 将数据库结果转换为前端需要的格式
function transformDBResult(result: any): RAGResult {
  // 解析 metadata 字符串为对象
  const metadata = result.metadata ? JSON.parse(result.metadata) : {}
  return {
    noteId: result.id,
    address: result.address,
    title: metadata.title,
    content: result.content,
    similarity: result.similarity,
    createdAt: new Date(Number(result.createdAt)).toISOString()
  }
}

export async function retrieveContext(query: string, limit: number = 5): Promise<RAGContext> {
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
        title: n.metadata?.title,
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
            标题: note.metadata?.title,
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
        const SIMILARITY_THRESHOLD = 0.2
        return result !== null && result.similarity > SIMILARITY_THRESHOLD
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    // 4. 转换结果
    const relevantDocs = results.map(transformDBResult)
    console.log('relevantDocs', relevantDocs)

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

export async function generateAnswer(query: string): Promise<{
  answer: string
  context: RAGContext
}> {
  try {
    // 1. 获取相关上下文
    const context = await retrieveContext(query)

    // 2. 构建中文提示词
    const prompt = buildPrompt(query, context)

    // 3. 调用大模型
    const answer = await llm.generateResponse(prompt)

    // 4. 保存历史记录
    await saveRAGHistory({
      ...context,
      response: answer
    })

    // 5. 返回答案和上下文
    return {
      answer,
      context
    }
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
# Role: RAG 笔记应用的 AI 助手安安

## Profile
-  description: 为用户提供基于笔记库和自身知识的智能问答服务

## Background
你的名字叫安安，是一位美丽、温柔、善良的笔记应用的 AI 助手，通过检索笔记库的内容来回答问题。助手需要在有相关笔记时优先使用笔记内容，并在没有相关笔记时利用自身知识进行回答。

## Goals
1. 检索用户笔记库中与问题相关的笔记
2. 优先使用相关笔记内容进行回答
3. 在无相关笔记时，基于自身知识进行回答
4. 提供简洁清晰的回答，不提及信息来源

## Constraints
1. 回答时不提及“根据相关笔记”或“没有相关笔记”的字样
2. 回答必须简洁清晰，通俗易懂
3. 在检索笔记时，确保隐私和数据安全

## Skills
1. 高效的笔记检索能力
2. 自然语言理解与生成能力
3. 知识整合与补充能力

## Workflows
1. 接收用户问题
2. 检索笔记库中相关的笔记
3. 如果有相关笔记，提取并整合笔记内容
4. 如果无相关笔记，基于自身知识生成回答
5. 提供简洁清晰的回答

## 格式
以 markdown 格式输出:
- **加粗**
- *斜体*
- \`代码\`
- 列表
- 引用
- 代码块（使用 \`\`\` 包裹）

## 上下文
${contextText}

## 问题
${query}
`
}
