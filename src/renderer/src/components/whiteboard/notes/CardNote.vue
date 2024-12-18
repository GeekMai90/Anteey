<template>
  <div class="card-note">
    <div class="address-input" :class="{ 'not-editing': !isEditing }">
      <!-- 笔记类型指示器 -->
      <div ref="indicatorButton" class="note-indicator" :class="cardTypeClass"></div>
      <!-- 地址输入框 -->
      <input
        v-if="currentNote"
        ref="addressInput"
        v-model="localAddress"
        type="text"
        placeholder="输入编码地址"
        @input="handleAddressInput"
        @keyup.enter="handleAddressEnter"
      />
    </div>
    <!-- 编辑器内容 -->
    <div class="content-area" :style="contentAreaStyle">
      <TipTapEditor
        v-if="currentNote"
        ref="tiptapEditor"
        v-model:content="currentNote.content"
        :note-id="currentNote.id"
        :editable="isEditing"
        :enable-drag-handle="true"
        @update:content="handleContentUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TipTapEditor from '@renderer/components/tiptap/TipTapEditor.vue'
import { useNoteStore } from '@renderer/stores/noteStores'
import type { Note } from '@renderer/types/Note'

const props = defineProps<{
  noteId?: string
  isEditing: boolean
  isAutoHeight: boolean
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
  }
}>()

const emit = defineEmits<{
  (e: 'update:content', content: string): void
}>()

const noteStore = useNoteStore()
const currentNote = ref<Note | null>(null)
const localAddress = ref('')
const addressInput = ref<HTMLInputElement | null>(null)
const tiptapEditor = ref<any>(null)

const cardTypeClass = computed(() => ({
  maincard: currentNote.value?.cardType === 'Maincard',
  bibcard: currentNote.value?.cardType === 'Bibcard',
  indexcard: currentNote.value?.cardType === 'Indexcard'
}))

const contentAreaStyle = computed(() => ({
  // 定义内容区域样式
}))

// 添加必要的方法
const handleAddressInput = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (currentNote.value) {
    await noteStore.updateNoteAddress(currentNote.value.id, input.value)
  }
}

const handleAddressEnter = (event: KeyboardEvent) => {
  event.preventDefault()
  addressInput.value?.blur()
}

const handleContentUpdate = (content: string) => {
  emit('update:content', content)
}

// 初始化笔记数据
const initializeNote = async () => {
  if (props.noteId) {
    const note = await noteStore.fetchNote(props.noteId)
    if (note) {
      currentNote.value = note as Note
      localAddress.value = note.address
    }
  }
}

// 监听 noteId 变化
watch(() => props.noteId, initializeNote, { immediate: true })
</script>
