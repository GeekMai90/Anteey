// src/renderer/src/tiptap/slashCommandSuggestion.js
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandList from '@renderer/components/tiptap/CommandList.vue'
import {
  DividingLine,
  H1,
  H2,
  H3,
  ListTwo,
  OrderedList,
  Quote,
  ListSuccess,
  Code,
  Table
} from '@icon-park/vue-next'
import { markRaw } from 'vue'
export const slashCommandSuggestion = {
  items: ({ query }) => {
    const commands = [
      {
        title: '主标题',
        icon: markRaw(H1),
        keywords: ['h', 'h1', '标题', '一级标题'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        }
      },
      {
        title: '副标题',
        icon: markRaw(H2),
        keywords: ['h', 'h2', '标题', '二级标题'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        }
      },
      {
        title: '中标题',
        icon: markRaw(H3),
        keywords: ['h', 'h3', '标题', '三级标题'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        }
      },
      {
        title: '表格',
        icon: markRaw(Table),
        keywords: ['table', 'tb', '表'],
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      },
      {
        title: '无序列表',
        icon: markRaw(ListTwo),
        keywords: ['list', 'ul', '列表', '清单'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        }
      },
      {
        title: '有序列表',
        icon: markRaw(OrderedList),
        keywords: ['list', 'ol', '列表', '数字列表', '编号'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        }
      },
      {
        title: '任务列表',
        icon: markRaw(ListSuccess),
        keywords: ['todo', 'task', '待办', '任务'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        }
      },
      {
        title: '引述',
        icon: markRaw(Quote),
        keywords: ['quote', 'blockquote', '引用', '引文'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        }
      },
      {
        title: '代码块',
        icon: markRaw(Code),
        keywords: ['code', 'cb', '代码', 'coding'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        }
      },
      {
        title: '分隔线',
        icon: markRaw(DividingLine),
        keywords: ['hr', 'line', '分割线', '横线'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        }
      }
    ]
    return commands.filter((item) => {
      if (item.type === 'separator') return true
      const searchText = query.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchText) ||
        (item.keywords &&
          item.keywords.some((keyword) => keyword.toLowerCase().includes(searchText)))
      )
    })
  },

  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(CommandList, {
          props,
          editor: props.editor
        })

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start'
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        popup[0].setProps({
          getReferenceClientRect: props.clientRect
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      }
    }
  }
}
