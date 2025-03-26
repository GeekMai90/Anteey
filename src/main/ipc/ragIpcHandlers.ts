// // src/main/ipc/ragIpcHandlers.ts
// import { ipcMain } from 'electron'
// import {
//   retrieveContext,
//   generateAnswer,
//   getRAGHistory,
//   getRAGHistoryDetail,
//   updateRAGHistoryTitle,
//   toggleRAGHistoryPin,
//   deleteRAGHistory,
//   clearAllRAGHistory,
//   updateRAGHistory,
//   cleanupExpiredSessions,
//   trackRAGPerformance,
//   RAGPerformanceData,
//   generateAnswerWithReferences,
//   handleAskQuestion,
//   handleChat,
//   handleFindNotes,
//   handleAgentChat,
//   abortCurrentChat,
//   abortCurrentAskQuestion,
//   abortCurrentAgentChat,
//   abortCurrentRequest
// } from '@services/rag/ragService'
// import { checkAndInitializeEmbeddings } from '@services/rag/embeddingService'
// import log from 'electron-log'
// import { AssistantNoteReference, ChatMessage, ChatSession, RAGContext } from '@shared/types'

// export function setupRAGHandlers() {
//   // 检索相关上下文 - 支持会话
//   ipcMain.handle(
//     'retrieve-context',
//     async (_event, { query, session }: { query: string; session?: ChatSession }) => {
//       try {
//         const context = await retrieveContext(query, session)
//         return { success: true, context }
//       } catch (error) {
//         log.error('主进程→ 检索上下文失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 生成回答 - 支持会话和上下文
//   // 生成回答 - 支持会话和上下文
//   ipcMain.handle(
//     'generate-answer',
//     async (
//       _event,
//       {
//         query,
//         sessionId,
//         currentMessages,
//         currentContexts
//       }: {
//         query: string
//         sessionId: string | null
//         currentMessages: ChatMessage[]
//         currentContexts: RAGContext[]
//       }
//     ) => {
//       try {
//         // 直接解构参数
//         console.log('IPC处理器 - 生成回答:', {
//           query,
//           sessionId,
//           messagesCount: currentMessages?.length || 0,
//           contextsCount: currentContexts?.length || 0
//         })

//         const result = await generateAnswer(
//           query,
//           sessionId,
//           currentMessages || [],
//           currentContexts || []
//         )

//         return { success: true, ...result }
//       } catch (error) {
//         log.error('主进程→ 生成回答失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 更新或保存历史记录 - 支持元数据
//   ipcMain.handle(
//     'update-rag-history',
//     async (
//       _event,
//       {
//         sessionId,
//         messages,
//         contexts,
//         metadata
//       }: {
//         sessionId: string
//         messages: ChatMessage[]
//         contexts: RAGContext[]
//         metadata?: any
//       }
//     ) => {
//       try {
//         await updateRAGHistory(sessionId, messages, contexts, metadata)
//         return { success: true }
//       } catch (error) {
//         log.error('主进程→ 更新RAG历史失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )
//   // 更新历史记录标题
//   ipcMain.handle('update-rag-history-title', async (_event, id: string, title: string) => {
//     try {
//       await updateRAGHistoryTitle(id, title)
//       return { success: true }
//     } catch (error) {
//       log.error('主进程→ 更新RAG历史标题失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 更新置顶状态
//   ipcMain.handle('toggle-rag-history-pin', async (_event, id: string) => {
//     try {
//       await toggleRAGHistoryPin(id)
//       return { success: true }
//     } catch (error) {
//       log.error('主进程→ 更新RAG历史置顶状态失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })
//   // 删除历史记录
//   ipcMain.handle('delete-rag-history', async (_event, id: string) => {
//     try {
//       await deleteRAGHistory(id)
//       return { success: true }
//     } catch (error) {
//       log.error('主进程→ 删除RAG历史失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })
//   // 清空所有历史记录
//   ipcMain.handle('clear-all-rag-history', async () => {
//     try {
//       await clearAllRAGHistory()
//       return { success: true }
//     } catch (error) {
//       log.error('主进程→ 清空RAG历史失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })
//   // 获取历史记录列表 - 返回类型会自动更新
//   ipcMain.handle('get-rag-history', async () => {
//     try {
//       const history = await getRAGHistory()
//       return { success: true, history }
//     } catch (error) {
//       log.error('主进程→ 获取RAG历史失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 获取单条历史记录详情 - 返回类型会自动更新
//   ipcMain.handle('get-rag-history-detail', async (_event, id: string) => {
//     try {
//       const detail = await getRAGHistoryDetail(id)
//       // 添加日志记录
//       log.info('获取历史记录详情:', {
//         id,
//         isHistorical: detail?.metadata?.isHistorical,
//         messageCount: detail?.messages?.length
//       })
//       return { success: true, detail }
//     } catch (error) {
//       log.error('主进程→ 获取RAG历史详情失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 批量获取历史记录
//   ipcMain.handle('batch-get-rag-history', async (_event, ids: string[]) => {
//     try {
//       const details = await Promise.all(ids.map((id) => getRAGHistoryDetail(id)))
//       return { success: true, details }
//     } catch (error) {
//       log.error('批量获取RAG历史失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 会话清理
//   ipcMain.handle('cleanup-expired-sessions', async () => {
//     try {
//       await cleanupExpiredSessions()
//       return { success: true }
//     } catch (error) {
//       log.error('清理过期会话失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 性能监控
//   ipcMain.handle('track-rag-performance', async (_event, data: RAGPerformanceData) => {
//     try {
//       trackRAGPerformance(data.sessionId, data.method, data.duration)
//       return { success: true }
//     } catch (error) {
//       log.error('性能监控失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 生成带引用回答
//   ipcMain.handle(
//     'generate-answer-with-references',
//     async (
//       _event,
//       {
//         query,
//         sessionId,
//         assistantNoteReferences,
//         currentMessages,
//         currentContexts
//       }: {
//         query: string
//         sessionId: string | null
//         assistantNoteReferences: AssistantNoteReference[]
//         currentMessages: ChatMessage[]
//         currentContexts: RAGContext[]
//       }
//     ) => {
//       try {
//         // 直接解构参数
//         console.log('IPC处理器 - 生成带引用回答:', {
//           query,
//           sessionId,
//           referencesCount: assistantNoteReferences?.length || 0,
//           messagesCount: currentMessages?.length || 0,
//           contextsCount: currentContexts?.length || 0
//         })

//         const result = await generateAnswerWithReferences(
//           query,
//           assistantNoteReferences,
//           sessionId,
//           currentMessages || [],
//           currentContexts || []
//         )

//         return { success: true, ...result }
//       } catch (error) {
//         log.error('主进程→ 生成带引用回答失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 问一问模式
//   ipcMain.handle('handle-ask-question', async (_event, params) => {
//     try {
//       const { query, noteReferences, sessionId, currentMessages, currentContexts } = params
//       const result = await handleAskQuestion(
//         query,
//         noteReferences,
//         sessionId,
//         currentMessages,
//         currentContexts
//       )
//       if (result.error) {
//         return {
//           success: false,
//           error: result.error,
//           ...result
//         }
//       }
//       return { success: true, ...result }
//     } catch (error) {
//       log.error('主进程→ 问一问模式失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 聊一聊模式
//   ipcMain.handle(
//     'handle-chat',
//     async (
//       _event,
//       {
//         query,
//         sessionId,
//         currentMessages,
//         currentContexts
//       }: {
//         query: string
//         sessionId: string | null
//         currentMessages: ChatMessage[]
//         currentContexts: RAGContext[]
//       }
//     ) => {
//       try {
//         console.log('IPC处理器 - 聊一聊:', {
//           query,
//           sessionId,
//           messagesCount: currentMessages?.length || 0,
//           contextsCount: currentContexts?.length || 0
//         })

//         const result = await handleChat(
//           query,
//           sessionId,
//           currentMessages || [],
//           currentContexts || []
//         )

//         if (result.error) {
//           return {
//             success: false,
//             error: result.error,
//             ...result
//           }
//         }
//         return { success: true, ...result }
//       } catch (error) {
//         log.error('主进程→ 聊一聊模式失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 找一找模式
//   ipcMain.handle(
//     'handle-find-notes',
//     async (
//       _event,
//       {
//         query,
//         sessionId,
//         currentMessages,
//         currentContexts
//       }: {
//         query: string
//         sessionId: string | null
//         currentMessages: ChatMessage[]
//         currentContexts: RAGContext[]
//       }
//     ) => {
//       try {
//         const result = await handleFindNotes(
//           query,
//           sessionId,
//           currentMessages || [],
//           currentContexts || []
//         )

//         return { success: true, ...result }
//       } catch (error) {
//         log.error('主进程→ 找一找模式失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 添加新的 IPC 处理器
//   ipcMain.handle('initialize-embeddings', async () => {
//     try {
//       const result = await checkAndInitializeEmbeddings()
//       return { success: true, ...result }
//     } catch (error) {
//       log.error('初始化向量化失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 添加 Agent 聊天处理器
//   ipcMain.handle(
//     'handle-agent-chat',
//     async (
//       _event,
//       {
//         query,
//         agentId,
//         noteId,
//         sessionId,
//         currentMessages,
//         currentContexts
//       }: {
//         query?: string
//         agentId: string
//         noteId?: string
//         sessionId: string | null
//         currentMessages: ChatMessage[]
//         currentContexts: RAGContext[]
//       }
//     ) => {
//       try {
//         console.log('IPC处理器 - Agent聊天:', {
//           query,
//           agentId,
//           noteId,
//           sessionId,
//           messagesCount: currentMessages?.length || 0,
//           contextsCount: currentContexts?.length || 0
//         })

//         const result = await handleAgentChat({
//           query,
//           agentId,
//           noteId,
//           sessionId,
//           currentMessages: currentMessages || [],
//           currentContexts: currentContexts || []
//         })

//         if (result.error) {
//           return {
//             success: false,
//             error: result.error,
//             ...result
//           }
//         }
//         return { success: true, ...result }
//       } catch (error) {
//         log.error('主进程→ Agent聊天模式失败:', error)
//         return { success: false, error: String(error) }
//       }
//     }
//   )

//   // 添加中断请求的处理器
//   ipcMain.handle('abort-current-chat', () => {
//     try {
//       console.log('主进程 → 收到中断Chat聊天请求')
//       abortCurrentChat()
//       return { success: true }
//     } catch (error) {
//       log.error('中断聊天请求失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   ipcMain.handle('abort-current-ask-question', () => {
//     try {
//       abortCurrentAskQuestion()
//       return { success: true }
//     } catch (error) {
//       log.error('中断问一问请求失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   ipcMain.handle('abort-current-agent-chat', () => {
//     try {
//       console.log('主进程 → 收到中断 Agent 聊天请求')
//       abortCurrentAgentChat()
//       return { success: true }
//     } catch (error) {
//       log.error('中断 Agent 聊天请求失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })

//   // 通用的中断当前请求处理器
//   ipcMain.handle('abort-current-request', () => {
//     try {
//       abortCurrentRequest()
//       return { success: true }
//     } catch (error) {
//       log.error('中断当前请求失败:', error)
//       return { success: false, error: String(error) }
//     }
//   })
// }
