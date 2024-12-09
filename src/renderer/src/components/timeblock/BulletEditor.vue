<template>
  <div class="bullet-editor">
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
import { Extension } from '@tiptap/core'
import type { Range } from '@tiptap/core'
import type { ChainedCommands } from '@tiptap/core'

interface Props {
  content?: string
  hour: number
  editable?: boolean
}

interface Emits {
  (e: 'update:content', value: string): void
  (e: 'finish'): void
  (e: 'cancel'): void
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  editable: false
})

const emit = defineEmits<Emits>()

// 创建一个专门的输入规则扩展
const BulletInputRule = Extension.create({
  name: 'bulletInputRule',

  addInputRules() {
    return [
      {
        find: /^[-] $/,
        handler: ({ range, chain }: { range: Range; chain: () => ChainedCommands }) => {
          chain().deleteRange(range).setNode('bulletTask').run()
        }
      }
    ]
  }
})

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      bulletList: false // 禁用默认的无序列表
    }),
    Typography,
    Placeholder.configure({
      placeholder: '输入 "- " 开始一个任务...'
    }),
    BulletInputRule,
    BulletTask
  ],
  content: props.content || '',
  editable: props.editable,
  editorProps: {
    attributes: {
      class: 'bullet-editor-content'
    },
    handleClick: () => {
      if (!props.editable) {
        emit('click')
        return true
      }
      return false
    },
    handleDOMEvents: {
      blur: () => {
        if (!props.editable) {
          emit('cancel')
        }
        return false
      }
    }
  },
  onUpdate: ({ editor }) => {
    if (!props.editable) return
    const content = editor.getHTML()
    emit('update:content', content)
  }
})

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    console.log('BulletEditor content changed:', newContent)
    // 确保编辑器内容与传入的内容同步
    if (newContent !== editor.getHTML()) {
      editor.commands.setContent(newContent || '')
    }
  },
  { immediate: true }
)

// 监听编辑状态变化
watch(
  () => props.editable,
  (editable) => {
    console.log('BulletEditor editable changed:', editable)
    editor.setEditable(editable)
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
.bullet-editor {
  width: 100%;

  .bullet-editor-content {
    width: 100%;
    min-height: 24px; // 减小最小高度
    padding: 8px 12px;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: 1.6;
    color: var(--color-text-1);
    outline: none;

    p {
      margin: 0;
      line-height: 1.6;
    }

    &.ProseMirror-focused {
      outline: none;
    }

    .ProseMirror-placeholder {
      color: var(--color-text-3);
      opacity: 0.4;
      pointer-events: none;
      white-space: pre-wrap;
    }

    &:not(.ProseMirror-focused):not(.editing) {
      cursor: pointer;
    }
  }

  // 添加任务相关样式
  .bullet-task {
    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>
