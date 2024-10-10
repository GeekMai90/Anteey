<template>
  <editor-content ref="editorRootRef" :editor="editorInstance as any" class="tiptap-container" />
  <div v-if="uploadProgress > 0" class="upload-progress">上传进度: {{ uploadProgress }}%</div>
  <div v-if="uploadError" class="upload-error">
    {{ uploadError }}
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import type { Editor as CoreEditor, Extension } from '@tiptap/core'
import DragHandle from '@tiptap-pro/extension-drag-handle'
import NodeRange from '@tiptap-pro/extension-node-range'
import FileHandler from '@tiptap-pro/extension-file-handler'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  content: string | object
  editable: boolean
  enableDragHandle: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  editable: true,
  enableDragHandle: true
})

const emit = defineEmits(['update:content'])
const editor = ref<CoreEditor | null>(null)
const editorInstance = computed(() => editor.value)
const uploadProgress = ref<number>(0)
const uploadError = ref<string | null>(null)

const editorRootRef = ref<HTMLElement | null>(null)

const uploadFile = async (file: File): Promise<string> => {
  uploadProgress.value = 0
  uploadError.value = null

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('文件大小不能超过 5MB')
  }

  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    throw new Error('只支持 JPEG, PNG, GIF 和 WebP 格式的图片')
  }

  const formData = new FormData()
  formData.append('image', file)

  try {
    const response = await fetch('http://localhost:3000/upload/image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.url) {
      throw new Error('服务器响应中没有文件 URL')
    }
    const fullUrl = new URL(data.url, 'http://localhost:3000').href

    return fullUrl
  } catch (error) {
    console.error('Upload failed:', error)
    uploadError.value = '上传失败: ' + (error as Error).message
    throw error
  } finally {
    uploadProgress.value = 0
  }
}

const editorExtensions = computed(() => {
  const extensions: Extension[] = [
    StarterKit.configure({
      italic: false,
      strike: false,
      code: false,
      heading: false
    }),
    Heading.configure({
      levels: [1, 2, 3]
    }) as Extension,
    Image as Extension,
    NodeRange.configure({
      key: null,
      depth: undefined
    }),
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      onDrop: async (currentEditor: CoreEditor, files: File[], pos: number) => {
        for (const file of files) {
          try {
            const url = await uploadFile(file)
            if (url) {
              currentEditor
                .chain()
                .insertContentAt(pos, {
                  type: 'image',
                  attrs: { src: url }
                })
                .focus()
                .run()
            }
          } catch (error) {
            console.error('File upload failed:', error)
            uploadError.value = '文件上传失败: ' + (error as Error).message
          }
        }
      },
      onPaste: async (currentEditor: CoreEditor, files: File[]) => {
        for (const file of files) {
          try {
            const url = await uploadFile(file)
            if (url) {
              currentEditor
                .chain()
                .insertContentAt(currentEditor.state.selection.anchor, {
                  type: 'image',
                  attrs: { src: url }
                })
                .focus()
                .run()
            }
          } catch (error) {
            console.error('File upload failed:', error)
            uploadError.value = '文件上传失败: ' + (error as Error).message
          }
        }
      }
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
