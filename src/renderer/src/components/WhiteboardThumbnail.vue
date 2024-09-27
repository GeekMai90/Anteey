<template>
  <div
    class="whiteboard-thumbnail"
    :style="thumbnailStyle"
    @mousedown.stop="startDrag"
    @dblclick.stop="$emit('click')"
  >
    <div class="topToolBar">
      <div class="icon">
        <More theme="outline" size="20" fill="#b6b6b6" />
      </div>
    </div>
    <div class="whiteboardName">
      <div class="icon">
        <Workbench theme="outline" size="20" fill="#b6b6b6" />
      </div>
      <div class="name">{{ whiteboard.name }}</div>
    </div>
    <div class="bottomToolBar">
      <div class="cardCount">{{ cardCount }}</div>
      <div class="cardCountText">张卡片</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Whiteboard } from '@renderer/types/Note'
import type { CSSProperties } from 'vue'
import { Workbench, More } from '@icon-park/vue-next'

const props = defineProps<{
  whiteboard: Whiteboard
  scale: number
}>()

const cardCount = 5

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'dragStart', whiteboard: Whiteboard, event: MouseEvent): void
}>()

const thumbnailStyle = computed(
  (): CSSProperties => ({
    transform: `translate(${props.whiteboard.position.x - props.whiteboard.size.width / 2}px, ${props.whiteboard.position.y - props.whiteboard.size.height / 2}px)`,
    position: 'absolute',
    cursor: 'move',
    width: `${props.whiteboard.size.width}px`,
    height: `${props.whiteboard.size.height}px`
  })
)

const startDrag = (event: MouseEvent) => {
  emit('dragStart', props.whiteboard, event)
}
</script>

<style lang="scss" scoped>
.whiteboard-thumbnail {
  border: none;
  border-radius: 12px;
  padding: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  user-select: none;
  display: flex;
  flex-direction: column;
  z-index: 10;

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }
}

.topToolBar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  .icon {
    background: none;
    border: none;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 18px;
      height: 18px;
    }
  }
}

.whiteboardName {
  display: flex;
  align-items: center;
  margin-bottom: 16px;

  .icon {
    background: none;
    border: none;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 25px;
      height: 25px;
      color: #4a4a4a;
    }
  }

  .name {
    color: #333;
    font-size: 18px;
    font-weight: 500;
    margin-left: 8px;
  }
}

.bottomToolBar {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  margin-top: auto;

  .cardCount {
    color: #4a4a4a;
    font-size: 24px;
    font-weight: 600;
    margin-right: 4px;
    line-height: 1;
    margin-bottom: -3px;
  }

  .cardCountText {
    color: #888;
    font-size: 14px;
    line-height: 1;
    display: flex; // 添加这行
    align-items: flex-end; // 添加这行，确保文字在flex容器中底部对齐
  }
}
</style>
