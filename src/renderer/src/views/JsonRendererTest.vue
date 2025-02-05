<template>
  <div class="json-renderer-test">
    <div class="test-container">
      <!-- 原始 JSON 显示区域 -->
      <div class="json-panel">
        <h3>编辑器渲染</h3>
        <!-- <pre>{{ JSON.stringify(noteContent, null, 2) }}</pre> -->
        <TipTapEditor v-if="noteContent" :content="noteContent" />
      </div>

      <!-- 渲染结果区域 -->
      <div class="render-panel">
        <h3>渲染结果</h3>
        <JsonContentRenderer v-if="noteContent" :content="noteContent" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import JsonContentRenderer from '@renderer/components/common/JsonContentRenderer.vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import TipTapEditor from '../components/tiptap/TipTapEditor.vue'

const noteStore = useNoteStore()
const noteContent = ref<any>(null)

// 测试笔记 ID
const TEST_NOTE_ID = '1072219b-9965-43c0-945f-c325187328fc'

onMounted(async () => {
  try {
    const note = await noteStore.fetchNoteById(TEST_NOTE_ID)
    if (note) {
      noteContent.value = note.content
      console.log('Note Content:', note.content)
    }
  } catch (error) {
    console.error('Failed to load test note:', error)
  }
})
</script>

<style lang="scss" scoped>
.json-renderer-test {
  padding: 20px;
  height: 100vh;
  overflow: auto;
  background: var(--color-bg-base);

  .test-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;

    h3 {
      margin-bottom: 16px;
      color: var(--color-text-primary);
    }

    .json-panel {
      padding: 20px;
      background: var(--color-bg-note-card);
      border-radius: 8px;
      overflow: auto;

      pre {
        font-family: monospace;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-text-secondary);
      }
    }

    .render-panel {
      padding: 20px;
      background: var(--color-bg-note-card);
      border-radius: 8px;
      overflow: auto;
    }
  }
}
</style>
