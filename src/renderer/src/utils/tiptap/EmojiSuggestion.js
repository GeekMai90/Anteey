import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import EmojiList from '@renderer/components/tiptap/EmojiList.vue'
import emojiMap from './emojiMap'

// 获取emoji资源的基础路径
const getEmojiPath = (fileName) => {
  return new URL(`../../assets/emoji/${fileName}`, import.meta.url).href
}

const emojiSuggestion = {
  items: ({ query }) => {
    // 从本地 emojiMap 中过滤和转换数据
    return Object.entries(emojiMap)
      .filter(([shortName]) => shortName.toLowerCase().includes(query.toLowerCase()))
      .map(([shortName, data]) => ({
        shortName,
        src: getEmojiPath(data.fileName),
        name: data.name,
        shortcodes: [shortName],
        tags: [data.name]
      }))
      .slice(0, 5)
  },

  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(EmojiList, {
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
          placement: 'bottom-start',
          theme: 'emoji-menu' // 可选：添加自定义主题
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
}

export { emojiSuggestion }
