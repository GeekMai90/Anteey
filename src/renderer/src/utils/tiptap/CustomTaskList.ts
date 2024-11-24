import TaskList from '@tiptap/extension-task-list'
import { wrappingInputRule } from '@tiptap/core'

export const CustomTaskList = TaskList.extend({
  addInputRules() {
    return [
      // 原有的规则
      wrappingInputRule({
        find: /^\s*\[ \]\s$/,
        type: this.type
      }),
      wrappingInputRule({
        find: /^\s*\[x\]\s$/i,
        type: this.type
      }),
      // 修改后的中文方括号规则 - 不要求中间有空格
      wrappingInputRule({
        find: /^\s*【】\s$/,
        type: this.type
      }),
      // 修改后的中文方括号已完成规则
      wrappingInputRule({
        find: /^\s*【x】\s$/i,
        type: this.type
      }),
      // 增加一些变体匹配
      wrappingInputRule({
        find: /^\s*【\s】\s$/,
        type: this.type
      }),
      wrappingInputRule({
        find: /^\s*【\s*】\s$/,
        type: this.type
      })
    ]
  }
})
