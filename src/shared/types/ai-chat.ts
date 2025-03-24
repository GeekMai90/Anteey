export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

// ============= 基础类型定义 =============
export type MessageRole = 'system' | 'user' | 'assistant'
export type SourceType = 'note' | 'image' | 'pdf'

// ============= 消息相关接口 =============
export interface MessageMetadata {
  references?: {
    /** 笔记引用数组 */
    notes?: {
      /** 笔记ID */
      noteId: string
      /** 笔记标题 */
      title: string
      /** 笔记地址 */
      address: string
    }[]
    /** 图片引用数组 */
    images?: {
      /** 图片文件名 */
      fileName: string
      /** 图片文件类型 */
      fileType: string
      /** 图片预览URL */
      previewUrl?: string
    }[]
    /** PDF引用数组 */
    pdfs?: {
      /** PDF文件名 */
      fileName: string
      /** PDF文件类型 */
      fileType: string
      /** PDF页码 */
      pageNumber?: number
      /** 引用的文本内容 */
      snippet?: string
    }[]
  }
  sourceTypes?: {
    /** 是否使用了笔记内容 */
    hasNotes: boolean
    /** 是否处理了图片 */
    hasImages: boolean
    /** 是否处理了PDF */
    hasPdfs: boolean
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface MessageRecord extends MessageMetadata {
  id: string
  conversationId: string
  parentMessageId: string | null
  role: MessageRole
  content: string
  createdAt: Date
}

// ============= 会话相关接口 =============
export interface Conversation {
  id: string
  title: string
  agentId: string | null
  status: ConversationStatus
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
  messageCount: number
  messages?: MessageRecord[] // 可选的消息列表
}

/**
 * 聊天请求接口
 * 用于发送给AI的请求，可以包含文本查询、笔记引用、文件附件等
 */
export interface ChatRequest {
  /** 用户输入的文本内容 */
  query?: string

  /** 会话ID，用于维护对话上下文的连续性 */
  conversationId?: string

  /**
   * 父消息ID，用于消息的树状结构
   * 目前可以不使用，为未来扩展预留
   */
  parentMessageId?: string

  /** 笔记相关引用配置 */
  references?: {
    /** 要引用的笔记ID数组 */
    noteIds?: string[]
    /** 是否搜索笔记库 */
    shouldSearchNotes?: boolean
  }

  /**
   * AI助手的角色ID
   * 可以用来切换不同的AI角色和对话风格
   */
  agentId?: string

  /** 文件附件 */
  attachments?: {
    /** 图片文件数组 */
    images?: AttachmentFile[]
    /** PDF文件数组 */
    pdfs?: AttachmentFile[]
    /** 其他类型文件数组 */
    other?: AttachmentFile[]
  }
}

/**
 * 文件附件接口
 * 用于处理上传的文件信息
 */
export interface AttachmentFile {
  /** 原始文件对象 */
  file: File
  /** 文件名 */
  fileName: string
  /** 文件MIME类型（例如：'image/jpeg', 'application/pdf'） */
  fileType: string
}

/**
 * 聊天响应接口
 * AI助手的响应内容，包含回答内容和相关引用信息
 */
export interface ChatResponse {
  /** 消息唯一标识符 */
  messageId: string
  /** AI的回答内容 */
  content: string
  /** 消息创建时间戳 */
  createdAt: number
  /** 消息角色，固定为'assistant' */
  role: 'assistant'

  /** 引用的资源信息 */
  references?: {
    /** 笔记引用数组 */
    notes?: {
      /** 笔记ID */
      noteId: string
      /** 笔记标题 */
      title: string
      /** 笔记地址 */
      address: string
    }[]

    /** 图片引用数组 */
    images?: {
      /** 图片文件名 */
      fileName: string
      /** 图片文件类型 */
      fileType: string
      /** 图片预览URL */
      previewUrl?: string
    }[]

    /** PDF引用数组 */
    pdfs?: {
      /** PDF文件名 */
      fileName: string
      /** PDF文件类型 */
      fileType: string
      /** PDF页码 */
      pageNumber?: number
      /** 引用的文本内容 */
      snippet?: string
    }[]
  }

  /** 处理的内容类型标记 */
  sourceTypes: {
    /** 是否使用了笔记内容 */
    hasNotes: boolean
    /** 是否处理了图片 */
    hasImages: boolean
    /** 是否处理了PDF */
    hasPdfs: boolean
  }

  /** 错误信息 */
  error?: {
    /** 错误代码 */
    code: string
    /** 错误消息 */
    message: string
    /** 详细错误信息 */
    details?: string
  }

  /** Token使用统计 */
  usage?: {
    /** 提示词使用的token数量 */
    promptTokens: number
    /** 生成回答使用的token数量 */
    completionTokens: number
    /** token总量 */
    totalTokens: number
  }

  /** 会话ID */
  conversationId: string

  /** 用户消息ID */
  userMessageId: string
}
