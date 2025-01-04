import { VueRenderer } from '@tiptap/vue-3'
import tippy, { Instance as TippyInstance, Props, GetReferenceClientRect } from 'tippy.js'
import { useNoteStore } from '../../stores/noteStore'
import MentionList from '@renderer/components/tiptap/MentionList.vue'

import type { SuggestionProps } from '@tiptap/suggestion'
import type { MentionResult } from './CustomMention' // 导入 MentionResult 类型

interface SearchNoteResult {
  id: string
  title: string
  address: string
  cardType?: string
  blocks: Array<{ content: string }>
}

export const mentionSuggestion = {
  items: async ({ query }: { query: string }) => {
    const noteStore = useNoteStore()
    try {
      // 使用现有的搜索功能
      const results = (await noteStore.searchNotes({
        mode: 'all',
        term: query
      })) as SearchNoteResult[]

      // 转换搜索结果为建议项
      return results
        .map(
          (note) =>
            ({
              id: note.id,
              title: note.title || '未命名笔记',
              address: note.address || '未设置编码地址',
              cardType: note.cardType
            }) as MentionResult
        )
        .slice(0, 5) // 限制显示数量
    } catch (error) {
      console.error('Error searching notes:', error)
      return []
    }
  },

  render: () => {
    let component: VueRenderer
    let popup: TippyInstance<Props>[]

    return {
      onStart: (props: SuggestionProps<MentionResult>) => {
        component = new VueRenderer(MentionList, {
          props,
          editor: props.editor
        })

        if (component.element) {
          popup = [
            tippy(document.body, {
              getReferenceClientRect: props.clientRect as GetReferenceClientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start'
            })
          ]
        }
      },

      onUpdate(props: SuggestionProps<MentionResult>) {
        component.updateProps(props)

        if (popup?.[0]) {
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect
          })
        }
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide()
          return true
        }
        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup?.[0]?.destroy()
        component.destroy()
      }
    }
  }
}
