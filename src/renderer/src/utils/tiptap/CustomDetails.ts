/**
 * CustomDetails 扩展
 * 基于Tiptap Details扩展，增加了Callout/标注功能
 * 支持不同类型的标注，如信息、警告、提示等
 */

import { Details } from '@tiptap-pro/extension-details'
import { mergeAttributes } from '@tiptap/core'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { Transaction } from 'prosemirror-state'
import { EditorState } from 'prosemirror-state'

// 定义Callout类型
export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'note' | 'tip'

// 默认类型
const DEFAULT_CALLOUT_TYPE = 'info'

export const CustomDetails = Details.extend({
  name: 'details',

  addAttributes() {
    const parentAttributes = this.parent?.() || {}

    return {
      ...parentAttributes,
      // 添加calloutType属性
      calloutType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-callout-type'),
        renderHTML: (attributes) => {
          if (!attributes.calloutType) {
            return {}
          }

          return {
            'data-callout-type': attributes.calloutType
          }
        }
      },
      // 是否作为callout使用
      isCallout: {
        default: false,
        parseHTML: (element) => element.hasAttribute('data-is-callout'),
        renderHTML: (attributes) => {
          if (!attributes.isCallout) {
            return {}
          }

          return {
            'data-is-callout': ''
          }
        }
      },
      // 明确添加class属性以支持样式
      class: {
        default: 'details',
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return { class: 'details' }
          }
          return { class: attributes.class }
        }
      }
    }
  },

  parseHTML() {
    const rules = this.parent?.() || []

    return rules.map((rule) => ({
      ...rule,
      getAttrs: (node: HTMLElement) => {
        const attrs =
          typeof rule.getAttrs === 'function' ? rule.getAttrs(node) : rule.getAttrs || {}

        // 解析callout相关属性
        let calloutType = node.getAttribute('data-callout-type')
        const isCallout = node.classList.contains('callout')

        // 也可以从class中获取类型
        if (!calloutType && isCallout) {
          const classList = node.classList
          for (let i = 0; i < classList.length; i++) {
            const className = classList[i]
            if (className.startsWith('callout-')) {
              calloutType = className.replace('callout-', '')
              break
            }
          }
        }

        // 获取完整的class属性值
        const classAttr = node.getAttribute('class') || 'details'

        return {
          ...attrs,
          calloutType,
          isCallout: isCallout || node.hasAttribute('data-is-callout'),
          class: classAttr
        }
      }
    }))
  },

  renderHTML({ HTMLAttributes }) {
    const { isCallout, calloutType, ...otherAttrs } = HTMLAttributes

    // 构建class列表
    let classes = 'details'
    if (isCallout) {
      classes += ' callout'
      if (calloutType) {
        classes += ` callout-${calloutType}`
      }
    }

    // 合并现有class和新class
    if (otherAttrs.class && otherAttrs.class !== 'details') {
      classes = otherAttrs.class
      if (!classes.includes('details')) classes = 'details ' + classes
      if (isCallout && !classes.includes('callout')) classes += ' callout'
      if (isCallout && calloutType && !classes.includes(`callout-${calloutType}`)) {
        classes += ` callout-${calloutType}`
      }
    }

    // 构建属性对象，确保class属性正确设置
    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      {
        class: classes
      },
      { ...otherAttrs, class: undefined } // 避免class被重复添加
    )

    // 如果是callout类型，添加自定义属性
    if (isCallout) {
      attrs['data-is-callout'] = ''
      if (calloutType) {
        attrs['data-callout-type'] = calloutType
      }
    }

    return ['details', attrs, 0]
  },

  // 添加创建callout的命令
  addCommands() {
    const parentCommands = this.parent?.() || {}

    return {
      ...parentCommands,

      // 设置Callout的命令，使用any类型避免TypeScript错误
      setCallout:
        (attributes: Record<string, any> = {}) =>
        ({ commands }: { commands: any }) => {
          const calloutType = attributes.calloutType || DEFAULT_CALLOUT_TYPE
          return commands.setDetails({
            isCallout: true,
            calloutType: calloutType,
            class: `details callout callout-${calloutType} callout-always-show-button`,
            ...attributes
          })
        },

      // 更改Callout类型的命令
      updateCalloutType:
        (type: CalloutType) =>
        ({
          tr,
          state,
          dispatch
        }: {
          tr: Transaction
          state: EditorState
          dispatch: ((tr: Transaction) => void) | undefined
        }) => {
          const { selection } = state
          const { from, to } = selection

          let hasChanged = false

          tr.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (node.type.name === 'details' && node.attrs.isCallout) {
              // 构建新的class值
              let newClass = node.attrs.class || 'details'
              if (!newClass.includes('details')) newClass = 'details ' + newClass
              if (!newClass.includes('callout')) newClass += ' callout'

              // 移除旧的callout类型类
              const classes = newClass.split(' ')
              newClass = classes
                .filter((c: any) => !c.startsWith('callout-') || c === 'callout-always-show-button')
                .join(' ')

              // 添加新的callout类型类
              newClass += ` callout-${type}`

              // 确保添加保持按钮可见的类名
              if (!newClass.includes('callout-always-show-button')) {
                newClass += ' callout-always-show-button'
              }

              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                calloutType: type,
                class: newClass
              })
              hasChanged = true
            }
            return true
          })

          if (hasChanged && dispatch) {
            dispatch(tr)
            return true
          }

          return false
        }
    }
  }
})
