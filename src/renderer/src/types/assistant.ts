// src/renderer/src/types/assistant.ts
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}
