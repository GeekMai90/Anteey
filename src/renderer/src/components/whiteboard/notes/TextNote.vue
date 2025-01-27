<template>
  <div class="text-note" :class="{ 'not-editing': !props.isEditing }">
    <!-- 内容区域 -->
    <div class="content-area">
      <div class="content-wrapper">
        <TipTapEditor
          v-if="note"
          ref="tiptapEditor"
          v-model:content="note.content"
          :note-id="note.id"
          :editable="props.isEditing"
          :enable-drag-handle="false"
          @update:content="handleContentUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWhiteboardStore } from '@renderer/stores/whiteboardStore'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { debounce } from 'lodash-es'

const props = defineProps<{
  id: string
  content?: object
  isEditing: boolean
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
}>()

const whiteboardStore = useWhiteboardStore()
const tiptapEditor = ref()

// 计算属性获取笔记数据
const note = computed(() => {
  return whiteboardStore.getWhiteboardNoteById(props.id)
})

// 使用防抖处理内容更新
const handleContentUpdate = debounce(async (newContent: object) => {
  try {
    if (!note.value) return
    await whiteboardStore.updateWhiteboardNoteContent(props.id, newContent)
  } catch (error) {
    console.error('更新文本内容失败:', error)
  }
}, 500)
</script>

<style lang="scss" scoped>
.text-note {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: inherit;
  border-radius: 10px;
  // 性能优化，但可能导致模糊，让我们调整一下
  // backface-visibility: hidden;
  // // transform-style: preserve-3d; // 移除这个属性
  // will-change: transform; // 只在真正需要的时候使用

  &.not-editing {
    .content-area {
      overflow: hidden;
      pointer-events: none;
    }

    :deep(.tiptap-container) {
      overflow: hidden;
      pointer-events: none;
    }

    :deep(.tiptap) {
      overflow: hidden;
      pointer-events: none;
    }
  }

  .content-area {
    flex-grow: 1;
    display: flex;
    overflow-y: auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    // 添加以下属性来提高文本渲染质量
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      width: 100%;
    }
  }

  :deep(.tiptap-container) {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 10px;
    position: relative;
  }

  :deep(.tiptap) {
    padding-left: 10px;
    padding-right: 10px;
    p {
      margin-block-start: 5px;
      margin-block-end: 5px;
    }
    // 添加以下属性来提高文本渲染质量
    text-rendering: optimizeLegibility;
  }
}
</style>
