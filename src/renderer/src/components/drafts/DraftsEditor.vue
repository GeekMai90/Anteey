<template>
  <div ref="editorContainer" class="editor-wrapper">
    <editor-content v-if="editor" :editor="editor" class="tiptap-container" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'

const props = defineProps({
  content: {
    type: [String, Object],
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:content'])
const editor = ref<Editor>()
const editorContainer = ref<HTMLElement | null>(null)

// 编辑器扩展
const editorExtensions = [
  StarterKit,
  Typography,
  Markdown,
  Placeholder.configure({
    placeholder: '开始输入...'
  })
]

onMounted(() => {
  editor.value = new Editor({
    extensions: editorExtensions,
    content: props.content,
    editable: props.editable,
    onUpdate: ({ editor }) => {
      emit('update:content', editor.getJSON())
    }
  })
})

const destroyEditor = () => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = undefined
  }
}

onBeforeUnmount(destroyEditor)

watch(
  () => props.editable,
  (newEditable) => {
    if (editor.value) {
      editor.value.setEditable(newEditable)
    }
  }
)

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

// 聚焦方法
const focus = (position: 'start' | 'end' = 'start') => {
  nextTick(() => {
    if (editor.value && props.editable) {
      editor.value.commands.focus(position)
    }
  })
}

defineExpose({
  editor,
  focus
})
</script>

<style lang="scss">
.editor-wrapper {
  position: relative;
  height: 100%;

  .tiptap-container {
    height: 100%;
    padding: 1rem;
    overflow-y: auto;

    &:focus {
      outline: none;
    }

    // 编辑器基础样式
    :deep(.ProseMirror) {
      > * + * {
        margin-top: 0.75em;
      }

      p {
        margin: 0;
      }

      ul,
      ol {
        padding: 0 1rem;
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        line-height: 1.1;
      }

      code {
        background-color: var(--color-bg-code);
        color: var(--color-text-code);
        padding: 0.2em 0.4em;
        border-radius: 0.3em;
      }
    }
  }
}
</style>
