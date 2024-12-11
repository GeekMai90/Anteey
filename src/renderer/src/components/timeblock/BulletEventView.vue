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
</script>

<style lang="scss" scoped>
.bullet-event {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.2em 0;
  line-height: 1.5;

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
  }

  .bullet-content {
    flex: 1;
    min-width: 0;
    line-height: inherit;
    padding: 0.1em 0;
  }
}
</style>
