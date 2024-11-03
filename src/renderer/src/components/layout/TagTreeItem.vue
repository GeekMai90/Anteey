<template>
  <div class="tag-tree-item" :style="{ paddingLeft: `${level * 16}px` }">
    <div class="tag-content" @click="handleClick">
      <!-- 占位空间，保持对齐 -->
      <div class="expand-icon-wrapper">
        <div v-if="tag.children?.length" class="expand-icon" @click.stop="toggleExpand">
          <div class="icon">
            <Down v-if="isExpanded" theme="outline" size="16" fill="var(--color-icon-default)" />
            <Right v-else theme="outline" size="16" fill="var(--color-icon-default)" />
          </div>
        </div>
      </div>
      <!-- 标签图标 -->
      <div class="tag-icon">
        <div class="icon">
          <Pound theme="outline" size="16" :fill="tag.color || 'var(--color-icon-default)'" />
        </div>
      </div>
      <!-- 标签名称和数量 -->
      <span class="tag-name">{{ tag.name }}</span>
      <span class="tag-count">{{ tag.noteCount }}</span>
    </div>

    <!-- 递归渲染子标签 -->
    <div v-if="isExpanded && tag.children?.length" class="children">
      <TagTreeItem
        v-for="child in tag.children"
        :key="child.id"
        :tag="child"
        :level="level + 1"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Down, Right, Pound } from '@icon-park/vue-next'
import { TagTreeNode } from '@renderer/types/Note'

const props = defineProps<{
  tag: TagTreeNode
  level: number
}>()

const emit = defineEmits<{
  (e: 'select', tag: TagTreeNode): void
}>()

const isExpanded = ref(true)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handleClick = () => {
  emit('select', props.tag)
}
</script>

<style scoped lang="scss">
.tag-tree-item {
  .tag-content {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    gap: 4px;

    &:hover {
      background-color: var(--color-hover-sidebar);
    }

    // 添加固定宽度的展开图标包装器
    .expand-icon-wrapper {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;

      .expand-icon {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        .icon {
          background: none;
          border: none;
          cursor: pointer;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;

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
      }
    }

    .tag-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      .icon {
        background: none;
        border: none;
        cursor: pointer;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        padding: 0;

        // &:hover:not(:disabled) {
        //   background-color: rgba(0, 0, 0, 0.05);
        // }

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
          width: 13px;
          height: 13px;
        }
      }
    }

    .tag-name {
      flex-grow: 1;
      font-size: 13px;
      color: var(--color-text-primary);
      user-select: none;
    }

    .tag-count {
      font-size: 12px;
      color: var(--color-text-tertiary);
      margin-left: 4px;
      user-select: none;
    }
  }

  .children {
    margin-top: 2px;
  }
}
</style>
