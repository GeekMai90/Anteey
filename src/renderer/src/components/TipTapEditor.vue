<template>
  <editor-content ref="editorRootRef" :editor="editorInstance" class="tiptap-container" />
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import DragHandle from '@tiptap-pro/extension-drag-handle'
import NodeRange from '@tiptap-pro/extension-node-range'
import Heading from '@tiptap/extension-heading'
import StarterKit from '@tiptap/starter-kit'
import Hightlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Emoji, { gitHubEmojis } from '@tiptap-pro/extension-emoji'
import suggestion from '../tiptap/suggestion.js'
// import HardBreak from '@tiptap/extension-hard-break'

const props = defineProps({
  content: {
    type: [String, Object],
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  },
  enableDragHandle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:content'])
const editor = ref(null)
const editorInstance = computed(() => editor.value)

const editorRootRef = ref(null)

const editorExtensions = computed(() => {
  const extensions = [
    StarterKit.configure({
      heading: false
    }),
    Heading.configure({
      levels: [1, 2, 3]
    }),
    Hightlight,
    Link.configure({
      openOnClick: true,
      defaultProtocol: 'https',
      linkOnPaste: true
    }),
    Underline,
    Emoji.configure({
      emojis: gitHubEmojis,
      enableEmoticons: true,
      suggestion
    }),
    NodeRange.configure({
      key: null,
      depth: undefined
    })
  ]
  if (props.enableDragHandle) {
    extensions.push(
      DragHandle.configure({
        render() {
          const element = document.createElement('div')
          element.classList.add('custom-drag-handle')
          return element
        }
      })
    )
  }
  return extensions
})

onMounted(() => {
  editor.value = new Editor({
    extensions: editorExtensions.value,
    content: props.content,
    editable: props.editable,
    onUpdate: ({ editor }) => {
      emit('update:content', editor.getJSON())
    }
  })
  if (props.editable) {
    nextTick(() => {
      focus()
    })
  }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

watch(
  () => props.editable,
  (newEditable) => {
    if (editor.value) {
      editor.value.setEditable(newEditable)
      if (newEditable) {
        nextTick(() => {
          focus()
        })
      }
    }
  },
  { immediate: true }
)

const focus = () => {
  nextTick(() => {
    if (editor.value && props.editable) {
      editor.value.commands.focus('end')
    }
  })
}

defineExpose({
  focus
})

watch(
  () => props.content,
  (newContent) => {
    if (editor.value && newContent !== undefined) {
      const editorContent = editor.value.getJSON()
      if (JSON.stringify(editorContent) !== JSON.stringify(newContent)) {
        editor.value.commands.setContent(newContent, false)
      }
    }
  },
  { deep: true }
)
</script>

<style lang="scss">
/* 样式保持不变 */
</style>
