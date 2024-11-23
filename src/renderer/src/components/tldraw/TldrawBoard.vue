<template>
  <div class="tldraw-board">
    <TldrawComponent :boardId="boardId" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { TldrawWrapper } from './TldrawWrapper'
import { applyReactInVue } from 'veaury'

export default defineComponent({
  name: 'TldrawBoard',
  props: {
    boardId: {
      type: String,
      required: true
    }
  },
  components: {
    TldrawComponent: applyReactInVue(TldrawWrapper)
  }
})
</script>

<style>
.tldraw-board {
  position: relative;
  width: 100%;
  height: 100%;
}

:deep(.tl-container) {
  position: absolute !important;
  inset: 0 !important;
}

/* 覆盖 reset.scss 中的 SVG 样式 */
:deep(svg) {
  overflow: visible !important;
}

/* 确保工具栏在正确的位置 */
:deep(.tl-toolbar) {
  z-index: 10;
}
</style>
