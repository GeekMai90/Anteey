<template>
  <div class="future-log-editor-wrapper">
    <editor-content :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch, onMounted } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { BulletTask } from './extensions/BulletTask'
import { BulletEvent } from './extensions/BulletEvent'
import { Extension } from '@tiptap/core'
import type { Range } from '@tiptap/core'
import type { ChainedCommands } from '@tiptap/core'

interface Props {
  content?: string
  placeholder?: string
}

interface Emits {
  (e: 'update:content', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  placeholder: '开始记录未来的计划...'
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
  editable: true,
  editorProps: {
    attributes: {
      class: 'future-log-editor-content'
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
    // 确保编辑器内容与传入的内容同步
    if (newContent !== editor.getHTML()) {
      editor.commands.setContent(newContent || '')
    }
  },
  { immediate: true }
)

// 组件挂载时确保内容同步
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
.future-log-editor-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  .future-log-editor-content {
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
