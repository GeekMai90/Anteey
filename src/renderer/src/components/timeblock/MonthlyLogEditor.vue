<template>
  <div class="monthly-log-editor-wrapper">
    <editor-content :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch, onMounted } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { BulletTask } from '@renderer/extensions/BulletTask'
import { BulletEvent } from '@renderer/extensions/BulletEvent'
import { Extension } from '@tiptap/core'
import type { Range } from '@tiptap/core'
import type { ChainedCommands } from '@tiptap/core'

interface Props {
  content?: string
  placeholder?: string
  editable?: boolean
}

interface Emits {
  (e: 'update:content', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  placeholder: '开始记录本月计划...',
  editable: true
})

const emit = defineEmits<Emits>()

// 创建输入规则扩展
const BulletInputRule = Extension.create({
  name: 'bulletInputRule',

  addInputRules() {
    return [
      {
        find: /^[-] $/,
        handler: ({ range, chain }: { range: Range; chain: () => ChainedCommands }) => {
          chain().deleteRange(range).setNode('bulletTask').run()
        }
      },
      {
        find: /^[=] $/,
        handler: ({ range, chain }: { range: Range; chain: () => ChainedCommands }) => {
          chain().deleteRange(range).setNode('bulletEvent').run()
        }
      }
    ]
  }
})

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      bulletList: false
    }),
    Typography,
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    BulletInputRule,
    BulletTask,
    BulletEvent
  ],
  content: props.content,
  editable: props.editable,
  editorProps: {
    attributes: {
      class: 'monthly-log-editor-content'
    }
  },
  onUpdate: ({ editor }) => {
    const content = editor.getHTML()
    emit('update:content', content)
  }
})

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (newContent !== editor.getHTML()) {
      editor.commands.setContent(newContent || '')
    }
  },
  { immediate: true }
)

// 监听 editable 属性变化
watch(
  () => props.editable,
  (newEditable) => {
    editor.setEditable(newEditable)
  }
)

onMounted(() => {
  if (props.content !== editor.getHTML()) {
    editor.commands.setContent(props.content || '')
  }
})

onBeforeUnmount(() => {
  editor.destroy()
})
</script>

<style lang="scss">
.monthly-log-editor-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .monthly-log-editor-content {
    height: 100%;
    background: transparent;
    font-family: var(--font-family);
    font-size: 15px;
    line-height: 1.7;
    color: var(--color-text-primary);
    outline: none;

    &.ProseMirror {
      height: 100%;
      overflow-y: auto;
      padding: 8px;

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-track {
        background: var(--color-scrollbar-track-bg);
      }

      &::-webkit-scrollbar-thumb {
        background-color: var(--color-scroll-thumb);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: padding-box;

        &:hover {
          background-color: var(--color-scrollbar-thumb-hover);
        }
      }
    }

    p {
      margin: 0;
      padding: 6px 0;
      line-height: 1.7;

      &.ProseMirror-focused {
        outline: none;
      }

      .ProseMirror-placeholder {
        color: var(--color-text-placeholder);
        opacity: 0.6;
        pointer-events: none;
        white-space: pre-wrap;
        font-style: italic;
      }

      .bullet-task {
        position: relative;
        padding-left: 1.5rem;
        margin: 4px 0;

        &:first-child {
          margin-top: 0;
        }

        &:last-child {
          margin-bottom: 0;
        }

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          border: 2px solid var(--color-primary);
          border-radius: 4px;
          transition: all 0.2s ease;
          background-color: var(--color-bg-primary);
        }

        &:hover::before {
          background-color: var(--color-primary-light);
          transform: translateY(-50%) scale(1.1);
        }

        &[data-done='true'] {
          color: var(--color-text-secondary);
          text-decoration: line-through;
          opacity: 0.8;

          &::before {
            background-color: var(--color-primary);
            border-color: var(--color-primary);
          }
        }
      }
    }
  }
}
</style>
