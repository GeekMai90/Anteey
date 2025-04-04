<template>
  <div
    class="expand-button"
    :class="{ 'expand-button--large': size === 'large' }"
    v-tooltip:[tooltipPlacement]="tooltipConfig"
    @click.stop="handleExpand"
  >
    <div class="icon">
      <ExpandTextInput
        theme="outline"
        :size="size === 'large' ? 18 : 16"
        fill="var(--color-icon-default)"
        :strokeWidth="3"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExpandTextInput } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    noteId: string
    size?: 'default' | 'large'
    tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  {
    size: 'default',
    tooltipPlacement: 'top'
  }
)

const noteStore = useNoteStore()
const tooltipPlacement = computed(() => props.tooltipPlacement)

// tooltip配置
const tooltipConfig = {
  content: '展开编辑',
  delay: { show: 1000 }
}

const router = useRouter()

const handleExpand = () => {
  router.push({ name: 'NoteExpandEditor', params: { id: props.noteId } })
  if (noteStore.isEditorOpen) {
    noteStore.closeNoteEditor()
  }
}
</script>

<style lang="scss" scoped>
.expand-button {
  position: relative;
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
  padding: 4px;
  margin: 2px;
  width: 28px;
  height: 28px;
  justify-content: center;

  // 大尺寸样式
  &--large {
    width: 32px;
    height: 32px;
  }

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  // 大尺寸时的图标样式
  &--large .icon {
    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }

  &:hover {
    background-color: var(--color-icon-hover-bg);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
