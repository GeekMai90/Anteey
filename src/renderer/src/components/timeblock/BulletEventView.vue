<template>
  <node-view-wrapper class="bullet-event">
    <span class="bullet-icon" contenteditable="false">
      <span class="icon-inner">◆</span>
    </span>
    <node-view-content class="bullet-content" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import type { NodeViewProps } from '@tiptap/vue-3'

defineProps<NodeViewProps>()
</script>

<style lang="scss" scoped>
.bullet-event {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
  padding: 0.2em 0;
  line-height: 1.5;
  position: relative;

  .bullet-icon {
    flex-shrink: 0;
    width: 1.5em;
    height: 1.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    color: var(--color-primary);
    font-size: 0.9em;
    line-height: 1;
    margin-top: 0.15em;
    position: absolute;
    left: 0;
  }

  .bullet-content {
    flex: 1;
    min-width: 0;
    line-height: inherit;
    padding: 0.1em 0;
    margin-left: 2em; /* 给内容添加左边距，与图标大小+间距相匹配 */
  }
}
</style>
