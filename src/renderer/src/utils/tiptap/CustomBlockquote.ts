import Blockquote from '@tiptap/extension-blockquote'
import { wrappingInputRule } from '@tiptap/core'

// 创建自定义的 Blockquote 扩展
export const CustomBlockquote = Blockquote.extend({
  addInputRules() {
    return [
      // 保留原有的 > 规则
      wrappingInputRule({
        find: /^\s*>\s$/,
        type: this.type
      }),
      // 添加新的 》规则
      wrappingInputRule({
        find: /^\s*》\s$/,
        type: this.type
      })
    ]
  }
})
