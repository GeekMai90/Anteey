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
  Code
} from '@icon-park/vue-next'
import { markRaw } from 'vue'
export const slashCommandSuggestion = {
  items: ({ query }) => {
    const commands = [
      // { type: 'separator', title: '样式' }, // 这是分隔符
      {
        title: '主标题',
        icon: markRaw(H1),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        }
      },
      {
        title: '副标题',
        icon: markRaw(H2),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        }
      },

      {
        title: '中标题',
        icon: markRaw(H3),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
        }
      },
      {
        title: '无序列表',
        icon: markRaw(ListTwo),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        }
      },
      //有序列表
      {
        title: '有序列表',
        icon: markRaw(OrderedList),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run()
        }
      },
      // 任务列表
      {
        title: '任务列表',
        icon: markRaw(ListSuccess),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run()
        }
      },
      {
        title: '引述',
        icon: markRaw(Quote),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run()
        }
      },
      {
        title: '代码块',
        icon: markRaw(Code),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
        }
      },
      // { type: 'separator', title: '插入' }, // 这是分隔符
      {
        title: '分隔线',
        icon: markRaw(DividingLine),
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        }
      }
    ]
    return commands.filter(
      (item) =>
        item.type === 'separator' || item.title.toLowerCase().startsWith(query.toLowerCase())
    )
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
