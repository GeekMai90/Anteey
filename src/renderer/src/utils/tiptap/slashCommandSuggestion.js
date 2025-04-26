// src/renderer/src/tiptap/slashCommandSuggestion.js
import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import CommandList from '@renderer/components/tiptap/CommandList.vue'
import {
  DividingLine,
  H1,
  H2,
  H3,
  LevelFourTitle,
  ListTwo,
  OrderedList,
  Quote,
  ListSuccess,
  Code,
  Form,
  ParagraphRectangle,
  NewspaperFolding,
  Info,
  Success,
  Bug,
  AlignTextBothOne,
  Tips,
  Alarm
} from '@icon-park/vue-next'
import { markRaw, ref } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'

// 存储片段列表的缓存
const snippetsCache = ref([])
const isLoading = ref(false)

// 加载片段函数
const loadSnippets = async () => {
  if (isLoading.value) return // 避免重复加载

  try {
    isLoading.value = true
    // 不清空缓存，保留现有数据供展示

    const noteStore = useNoteStore()

    // 优先使用 noteStore 中已缓存的片段数据
    let snippets = noteStore.getSnippetNotes()

    // 如果缓存数据为空，则尝试刷新获取
    if (snippets.length === 0) {
      console.log('slashCommand → 缓存片段为空，尝试刷新获取')
      snippets = await noteStore.refreshSnippetNotes()
    } else {
      console.log('slashCommand → 使用缓存片段数据，数量:', snippets.length)
    }

    if (snippets && snippets.length > 0) {
      // 将片段转换为命令格式
      snippetsCache.value = snippets.map((snippet) => ({
        title: snippet.address || '未命名片段',
        icon: markRaw(ParagraphRectangle),
        keywords: ['snippet', 'paragraph', '片段', snippet.address || ''],
        snippetId: snippet.id, // 存储片段ID用于后续插入
        snippetCommand: true, // 改用专用标记，避免与separator的type冲突
        command: async ({ editor, range }) => {
          try {
            // 首先删除斜杠命令
            editor.chain().focus().deleteRange(range).run()

            // 获取片段笔记内容
            const noteStore = useNoteStore()
            const snippetNote = await noteStore.fetchNote(snippet.id)

            if (!snippetNote) {
              console.error('无法获取片段内容')
              message.error('无法获取片段内容')
              return
            }

            if (snippetNote.cardType !== 'Snippetcard') {
              console.error('所选笔记不是片段类型')
              message.error('所选笔记不是片段类型')
              return
            }

            const snippetContent = snippetNote.content.content || []
            if (snippetContent.length === 0) {
              message.error('片段内容为空')
              return
            }

            console.log('前端→ 获取到片段内容:', {
              snippetId: snippet.id,
              contentLength: snippetContent.length
            })

            // 直接插入片段内容到编辑器当前位置
            // 将片段内容插入到当前位置
            editor.chain().focus().insertContent(snippetContent).run()

            // 成功提示
            message.success('插入片段成功')
          } catch (error) {
            message.error('插入片段失败: ' + (error.message || '未知错误'))
            console.error('前端→ 插入片段失败:', error)
          }
        }
      }))

      console.log('片段数据处理完成，数量:', snippetsCache.value.length)
    } else {
      // 如果没有片段，则清空
      snippetsCache.value = []
    }
  } catch (error) {
    console.error('加载片段失败:', error)
  } finally {
    isLoading.value = false
  }
}

export const slashCommandSuggestion = {
  items: ({ query }) => {
    // 每次菜单打开时加载片段，优先使用缓存数据
    loadSnippets()

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
        title: '小标题',
        icon: markRaw(LevelFourTitle),
        keywords: ['h', 'h4', '标题', '四级标题', '小标题'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run()
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
        title: '表格',
        icon: markRaw(Form),
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
        title: '分隔线',
        icon: markRaw(DividingLine),
        keywords: ['hr', 'line', '分割线', '横线'],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setHorizontalRule().run()
        }
      },
      {
        type: 'separator',
        title: '标注'
      },
      {
        title: '思考标注',
        icon: markRaw(Tips),
        keywords: ['callout', 'tip', '标注', '思考', '提示', '技巧'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'tip',
                class: 'details callout callout-tip'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '思考'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },

      {
        title: '信息标注',
        icon: markRaw(Info),
        keywords: ['callout', 'info', '标注', '信息'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'info',
                class: 'details callout callout-info'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '信息'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },
      {
        title: '成功标注',
        icon: markRaw(Success),
        keywords: ['callout', 'success', '标注', '成功'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'success',
                class: 'details callout callout-success'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '成功'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },
      {
        title: '笔记标注',
        icon: markRaw(AlignTextBothOne),
        keywords: ['callout', 'note', '标注', '笔记'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'note',
                class: 'details callout callout-note'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '笔记'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },
      {
        title: '警告标注',
        icon: markRaw(Alarm),
        keywords: ['callout', 'warning', '标注', '警告', '注意'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'warning',
                class: 'details callout callout-warning'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '警告'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },

      {
        title: '错误标注',
        icon: markRaw(Bug),
        keywords: ['callout', 'error', '标注', '错误'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 一步创建callout
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true,
                isCallout: true,
                calloutType: 'error',
                class: 'details callout callout-error'
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '错误'
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      },

      {
        title: '折叠标注',
        icon: markRaw(NewspaperFolding),
        keywords: ['details', 'collapse', 'callout', '折叠', '展开', '详情', '标注'],
        command: ({ editor, range }) => {
          // 首先删除斜杠命令
          editor.chain().focus().deleteRange(range).run()

          // 创建 details 块的结构并插入
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'details',
              attrs: {
                open: true // 默认展开状态
              },
              content: [
                {
                  type: 'detailsSummary',
                  content: [
                    {
                      type: 'text',
                      text: '点击展开/折叠' // 默认的摘要文本
                    }
                  ]
                },
                {
                  type: 'detailsContent',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        textAlign: 'left'
                      }
                    }
                  ]
                }
              ]
            })
            .run()
        }
      }
    ]

    // 添加片段命令到commands数组
    if (snippetsCache.value.length > 0) {
      commands.push(...snippetsCache.value)
    }

    // 先过滤所有命令
    const searchText = query.toLowerCase()
    const filteredCommands = commands.filter((item) => {
      if (item.type === 'separator') return false

      return (
        item.title.toLowerCase().includes(searchText) ||
        (item.keywords &&
          item.keywords.some((keyword) => keyword.toLowerCase().includes(searchText)))
      )
    })

    // 如果没有任何匹配项且有搜索条件，返回"无匹配项"提示
    if (filteredCommands.length === 0 && query.trim() !== '') {
      return [
        {
          title: `无匹配项 "${query}"`,
          icon: null,
          command: () => {}, // 空函数，不执行任何操作
          noMatch: true // 标记为无匹配项
        }
      ]
    }

    // 检查是否有符合条件的标注命令
    const hasCallouts = filteredCommands.some(
      (item) => item.keywords && item.keywords.includes('callout')
    )

    // 检查是否有符合条件的片段
    const hasMatchingSnippets = filteredCommands.some((item) => item.snippetCommand)

    // 准备结果，先添加非片段的命令
    const result = filteredCommands.filter((item) => !item.snippetCommand)

    // 如果有标注命令匹配，添加标注分隔符并重新整理结果
    if (hasCallouts && query.trim() === '') {
      // 找到标注分隔符在原始commands中的位置
      const separatorIndex = commands.findIndex(
        (item) => item.type === 'separator' && item.title === '标注'
      )

      if (separatorIndex !== -1) {
        // 获取标注分隔符
        const calloutSeparator = commands[separatorIndex]

        // 获取所有标注命令
        const calloutCommands = commands
          .slice(separatorIndex + 1)
          .filter((item) => item.keywords && item.keywords.includes('callout'))
          .filter(
            (item) =>
              item.title.toLowerCase().includes(searchText) ||
              (item.keywords &&
                item.keywords.some((keyword) => keyword.toLowerCase().includes(searchText)))
          )

        // 非标注命令
        const nonCalloutCommands = result.filter(
          (item) => !item.keywords || !item.keywords.includes('callout')
        )

        // 重组结果：先非标注命令，再标注分隔符，最后标注命令
        result.length = 0 // 清空数组
        result.push(...nonCalloutCommands)

        if (calloutCommands.length > 0) {
          result.push(calloutSeparator)
          result.push(...calloutCommands)
        }
      }
    }

    // 如果有匹配的片段，添加分隔符和片段
    if (hasMatchingSnippets) {
      // 添加分隔符
      result.push({
        type: 'separator',
        title: '片段'
      })

      // 添加所有匹配的片段
      result.push(...filteredCommands.filter((item) => item.snippetCommand))
    }

    console.log('过滤后命令数量:', result.length)
    return result
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
