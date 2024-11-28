import { Extension } from '@tiptap/core'
import { markPasteRule } from '@tiptap/core'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Underline from '@tiptap/extension-underline'
import { Plugin, PluginKey } from 'prosemirror-state' // 添加这一行

// 定义自定义粘贴规则的正则表达式
const boldPasteRegex = /(?:^|\s)((?:\*\*)((?:[^\*]+))(?:\*\*))/g
const italicPasteRegex = /(?:^|\s)((?:\*)((?:[^\*]+))(?:\*))/g
const strikePasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g
const codePasteRegex = /(?:^|\s)((?:`)((?:[^`]+))(?:`))/g
const underlinePasteRegex = /(?:^|\s)((?:__)((?:[^_]+))(?:__))/g

// 扩展每个插件
// const CustomBold = Bold.extend({
//   addPasteRules() {
//     return [
//       markPasteRule({
//         find: boldPasteRegex,
//         type: this.type,
//       }),
//     ];
//   },
// });
const CustomBold = Bold.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      autoUnset: true // 默认启用自动取消加粗
    }
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: boldPasteRegex,
        type: this.type
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: () => {
        if (this.options.autoUnset && this.editor.isActive('bold')) {
          this.editor.chain().splitBlock().unsetBold().run()
          return true
        }
        return false
      }
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || []

    if (this.options.autoUnset) {
      const plugin = new Plugin({
        key: new PluginKey('autoUnsetBold'),
        appendTransaction: (transactions, oldState, newState) => {
          const tr = newState.tr
          let modified = false

          newState.doc.nodesBetween(0, newState.doc.content.size, (node, pos) => {
            if (
              node.isTextblock &&
              node.type.name === 'paragraph' &&
              node.marks.some((mark) => mark.type.name === 'bold')
            ) {
              const $pos = newState.doc.resolve(pos)
              if ($pos.nodeBefore && $pos.nodeBefore.type.name === 'paragraph') {
                tr.removeMark(pos, pos + node.nodeSize, newState.schema.marks.bold)
                modified = true
              }
            }
          })

          return modified ? tr : null
        }
      })

      plugins.push(plugin)
    }

    return plugins
  }
})

const CustomItalic = Italic.extend({
  addPasteRules() {
    return [
      markPasteRule({
        find: italicPasteRegex,
        type: this.type
      })
    ]
  }
})

const CustomStrike = Strike.extend({
  addPasteRules() {
    return [
      markPasteRule({
        find: strikePasteRegex,
        type: this.type
      })
    ]
  }
})

const CustomCode = Code.extend({
  addPasteRules() {
    return [
      markPasteRule({
        find: codePasteRegex,
        type: this.type
      })
    ]
  }
})

const CustomUnderline = Underline.extend({
  addPasteRules() {
    return [
      markPasteRule({
        find: underlinePasteRegex,
        type: this.type
      })
    ]
  }
})

export default Extension.create({
  name: 'markdownPaste',

  addExtensions() {
    return [
      // CustomBold,
      CustomBold.configure({ autoUnset: true }), // 可以在这里控制是否启用自动取消加粗
      CustomItalic,
      CustomStrike,
      CustomCode,
      CustomUnderline
    ]
  }
})
