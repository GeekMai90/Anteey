<template>
  <div class="drag-handle-menu">
    <button @click="handleDelete">删除</button>
    <button @click="handleDuplicate">复制</button>
  </div>
</template>

<script setup>
import { useEditor } from '@tiptap/vue-3'
import { onMounted } from 'vue'

const props = defineProps({
  onClose: Function
})

const editor = useEditor()

onMounted(() => {
  if (!editor.value) {
    console.error('Editor is not available')
    return
  }
})

const handleDelete = () => {
  if (editor.value) {
    editor.value.chain().deleteSelection().run()
  }
  props.onClose()
}

const handleDuplicate = () => {
  if (editor.value) {
    // 实现复制逻辑
    console.log('Duplicate')
  }
  props.onClose()
}
</script>

<style scoped>
/* 样式保持不变 */
</style>
