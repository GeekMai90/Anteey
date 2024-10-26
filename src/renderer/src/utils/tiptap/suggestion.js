import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import EmojiList from '@renderer/components/tiptap/EmojiList.vue'
import CommandList from '@renderer/components/tiptap/CommandList.vue'

const emojiSuggestion = {
  items: ({ editor, query }) => {
    return editor.storage.emoji.emojis
      .filter(({ shortcodes, tags }) => {
        return (
          shortcodes.find((shortcode) => shortcode.startsWith(query.toLowerCase())) ||
          tags.find((tag) => tag.startsWith(query.toLowerCase()))
        )
      })
      .slice(0, 5)
  },

  render: () => createSuggestion(EmojiList)
}

const slashCommandSuggestion = {
  items: ({ query }) => {
    const commands = [
      {
        title: 'Heading 1',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        }
      },
      {
        title: 'Heading 2',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        }
      },
      {
        title: 'Bullet List',
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run()
        }
      }
      // 添加更多命令...
    ]
    return commands.filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
  },

  render: () => createSuggestion(CommandList)
}

function createSuggestion(ComponentClass) {
  let component
  let popup

  return {
    onStart: (props) => {
      component = new VueRenderer(ComponentClass, {
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
        component.destroy()

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

export { emojiSuggestion, slashCommandSuggestion }
