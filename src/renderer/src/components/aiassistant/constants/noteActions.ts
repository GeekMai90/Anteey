import { FileFocus } from '@icon-park/vue-next'
import type { NoteAction } from '../../../types/assistant'

export const NOTE_ACTIONS: NoteAction[] = [
  {
    id: 'summarize',
    name: '生成摘要',
    description: '生成笔记的核心内容摘要',
    icon: FileFocus,
    type: 'summarize',
    prompt: '请生成这篇笔记的核心摘要，包含主要观点和关键信息'
  },
  {
    id: 'optimize',
    name: '优化结构',
    description: '改善笔记的组织结构',
    icon: FileFocus,
    type: 'optimize',
    prompt: '请分析并优化这篇笔记的结构，使其更清晰和有条理'
  },
  {
    id: 'expand',
    name: '内容扩充',
    description: '补充相关信息和示例',
    icon: FileFocus,
    type: 'expand',
    prompt: '请基于笔记内容，补充相关的信息、示例或案例'
  },
  {
    id: 'flashcards',
    name: '生成复习卡片',
    description: '创建基于内容的复习卡片',
    icon: FileFocus,
    type: 'flashcards',
    prompt: '请基于笔记内容，生成适合复习的问答卡片'
  }
]
