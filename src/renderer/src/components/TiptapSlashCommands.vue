<template>
  <div v-if="editor && editor.isReady">
    <mention-list
      v-if="items && items.length"
      :items="items"
      :command="command"
      :editor="editor"
      :range="range"
    />
  </div>
</template>

<script setup>
import { ref, watchEffect, nextTick } from 'vue'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import MentionList from './MentionList.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  }
})

const items = ref([])
const command = ref(null)
const range = ref(null)

const slashCommands = [
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

const SlashCommandsExtension = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        items: ({ query }) => {
          return slashCommands.filter((item) =>
            item.title.toLowerCase().startsWith(query.toLowerCase())
          )
        },
        render: () => {
          return {
            onStart: (props) => {
              items.value = props.items || []
              command.value = props.command
              range.value = props.range
            },
            onUpdate(props) {
              items.value = props.items || []
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                items.value = []
                return true
              }
              return false
            },
            onExit() {
              items.value = []
              command.value = null
              range.value = null
            }
          }
        }
      }
    }
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ]
  }
})

watchEffect(() => {
  if (props.editor && props.editor.isReady) {
    nextTick(() => {
      props.editor.registerPlugin(SlashCommandsExtension)
    })
  }
})

watchEffect(() => {
  if (props.editor && props.editor.isReady) {
    return () => {
      props.editor.unregisterPlugin(SlashCommandsExtension)
    }
  }
})
</script>
