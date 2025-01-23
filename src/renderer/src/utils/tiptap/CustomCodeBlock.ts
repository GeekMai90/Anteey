import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import CodeBlockComponent from '@renderer/components/tiptap/CodeBlockComponent.vue'
import { all, createLowlight } from 'lowlight'
import { Component } from 'vue'
import { TextSelection } from '@tiptap/pm/state'
import { message } from '@renderer/utils/message'

const lowlight = createLowlight(all)

export const CustomCodeBlock = CodeBlockLowlight.extend({
  name: 'codeBlock',

  addNodeView() {
    return VueNodeViewRenderer(CodeBlockComponent as Component)
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        // 确保我们在代码块内
        if (!editor.isActive('codeBlock')) {
          return false
        }

        const { state, view } = editor
        const { selection, tr } = state

        // 如果有选中多行文本
        if (!selection.empty) {
          const { from, to } = selection
          const selectedText = state.doc.textBetween(from, to)
          const lines = selectedText.split('\n')
          const indentedText = lines.map((line) => '    ' + line).join('\n')

          tr.replaceSelectionWith(state.schema.text(indentedText))
          view.dispatch(tr)
          return true
        }

        // 如果是单行，直接插入4个空格
        const { from } = selection
        tr.insertText('    ', from)
        tr.setSelection(TextSelection.create(tr.doc, from + 4))
        view.dispatch(tr)

        return true
      },
      'Shift-Tab': ({ editor }) => {
        // 确保我们在代码块内
        if (!editor.isActive('codeBlock')) {
          return false
        }

        const { state, view } = editor
        const { selection, tr } = state

        // 如果有选中多行文本
        if (!selection.empty) {
          const { from, to } = selection
          const selectedText = state.doc.textBetween(from, to)
          const lines = selectedText.split('\n')
          // 移除每行开头的空格（最多4个）
          const unindentedText = lines
            .map((line) => {
              const match = line.match(/^( {1,4})(.*)$/)
              return match ? match[2] : line
            })
            .join('\n')

          tr.replaceSelectionWith(state.schema.text(unindentedText))
          view.dispatch(tr)
          return true
        }

        // 如果是单行，尝试删除光标前的空格（最多4个）
        const { from } = selection
        const before = state.doc.textBetween(Math.max(0, from - 4), from)
        const spaceMatch = before.match(/( {1,4})$/)

        if (spaceMatch) {
          const spacesToRemove = spaceMatch[1].length
          tr.delete(from - spacesToRemove, from)
          view.dispatch(tr)
        }

        return true
      },
      Enter: ({ editor }) => {
        // 确保我们在代码块内
        if (!editor.isActive('codeBlock')) {
          return false
        }

        const { state, view } = editor
        const { selection, doc, tr } = state
        const { from, to } = selection

        // 获取当前行的开始位置
        let lineStart = from
        while (lineStart > 0 && doc.textBetween(lineStart - 1, lineStart) !== '\n') {
          lineStart--
        }

        // 获取当前行的内容
        const currentLine = doc.textBetween(lineStart, from)

        // 检查前两行是否都是空行
        let emptyLineCount = 0
        let pos = lineStart - 1
        while (pos > 0) {
          const char = doc.textBetween(pos, pos + 1)
          if (char === '\n') {
            if (doc.textBetween(pos + 1, pos + 2) === '\n') {
              emptyLineCount++
            }
          } else {
            break
          }
          pos--
        }

        // 获取当前节点
        const node = doc.nodeAt(from)
        const isLastPosition = node ? from === to && from === node.nodeSize - 1 : false

        // 如果当前行是空行且前面有两个空行，或者当前行是空行且是代码块的最后一行
        if (currentLine.trim() === '' && (emptyLineCount >= 2 || isLastPosition)) {
          // 退出代码块
          editor.chain().focus().exitCode().run()
          return true
        }

        // 计算前导空格并插入新行
        let indent = ''
        for (let i = 0; i < currentLine.length; i++) {
          if (currentLine[i] === ' ' || currentLine[i] === '\t') {
            indent += currentLine[i]
          } else {
            break
          }
        }

        tr.insertText('\n' + indent, from)
        view.dispatch(tr)
        return true
      },
      'Mod-c': ({ editor }) => {
        // 如果有选中的文本，使用默认的复制行为
        if (!editor.state.selection.empty) {
          return false
        }

        // 确保我们在代码块内
        if (!editor.isActive('codeBlock')) {
          return false
        }

        // 获取当前代码块节点
        const { $from } = editor.state.selection
        const node = $from.node()

        // 复制整个代码块的内容
        if (node.type.name === 'codeBlock') {
          navigator.clipboard.writeText(node.textContent)
          message.success('已将代码复制到剪贴板')
          return true
        }

        return false
      }
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: 'plaintext',
        parseHTML: (element) => element.getAttribute('language') || 'plaintext',
        renderHTML: (attributes) => ({
          language: attributes.language
        })
      }
    }
  }
}).configure({
  lowlight,
  exitOnTripleEnter: true, // 使用 Tiptap 内置的三次回车退出功能
  exitOnArrowDown: true // 使用 Tiptap 内置的向下箭头退出功能
})
