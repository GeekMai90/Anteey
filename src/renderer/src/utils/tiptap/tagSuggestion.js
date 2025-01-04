import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import TagList from '@renderer/components/tiptap/TagList.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Tag as TagIcon, AddOne } from '@icon-park/vue-next'
import { markRaw } from 'vue'

export const tagSuggestion = {
  items: async ({ query }) => {
    // 将函数改为 async
    const noteStore = useNoteStore()
    const items = []

    try {
      // 等待获取所有标签
      const existingTags = await noteStore.fetchAllTags() // 使用 await 等待 Promise 解析

      // 确保 existingTags 是数组并在前端进行过滤
      const tagsArray = Array.isArray(existingTags)
        ? existingTags.filter(
            (tag) =>
              // 如果没有查询词，返回所有标签
              !query || tag.name.toLowerCase().includes(query.toLowerCase())
          )
        : []

      console.log('Query:', query)
      console.log('Existing tags:', existingTags)
      console.log('Filtered tags:', tagsArray)

      // 添加现有标签
      tagsArray.forEach((tag) => {
        items.push({
          title: tag.name,
          icon: markRaw(TagIcon),
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent(`#${tag.name} `).run()
            noteStore.addTagToNote({
              noteId: editor.options.noteId,
              tagName: tag.name,
              tagId: tag.id,
              metadata: tag.metadata,
              path: tag.path
            })
          }
        })
      })

      // 如果有查询内容且没有完全匹配的标签，才添加"新建标签"选项
      const existingTagNames = tagsArray.map((tag) => tag.name)
      if (query && !existingTagNames.some((name) => name.toLowerCase() === query.toLowerCase())) {
        items.unshift({
          title: `新建标签 "${query}"`,
          icon: markRaw(AddOne),
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent(`#${query} `).run()
            noteStore
              .createTag({
                name: query,
                path: [query],
                metadata: {
                  count: 0,
                  lastUsed: new Date().toISOString()
                }
              })
              .then((newTag) => {
                noteStore.addTagToNote({
                  noteId: editor.options.noteId,
                  tagName: query,
                  tagId: newTag.id,
                  metadata: newTag.metadata,
                  path: newTag.path
                })
              })
          }
        })
      }
    } catch (error) {
      console.error('Error processing tags:', error)
    }

    return items
  },

  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(TagList, {
          props: {
            items: props.items || [],
            selected: props.items?.[0] || null,
            command: props.command
          },
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
        component.updateProps({
          items: props.items || [],
          selected: props.items?.[0] || null,
          command: props.command
        })

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
