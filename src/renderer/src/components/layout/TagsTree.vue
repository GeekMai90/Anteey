<template>
  <div class="tags-tree">
    <!-- 标签区域头部 -->
    <div class="tags-header" @click="toggleTagsTree">
      <span>标签</span>
      <div class="toggle-icon">
        <div class="icon">
          <Down
            v-if="isExpanded"
            theme="outline"
            size="18"
            fill="var(--color-icon-default)"
            :stroke-width="4"
          />
          <Right
            v-else
            theme="outline"
            size="18"
            fill="var(--color-icon-default)"
            :stroke-width="4"
          />
        </div>
      </div>
    </div>

    <!-- 标签树内容 -->
    <div v-if="isExpanded" class="tags-tree-container">
      <TagTreeItem
        v-for="tag in tagTree"
        :key="tag.id"
        :tag="tag"
        :level="0"
        @select="handleTagSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Down, Right } from '@icon-park/vue-next'
import { useTagStore } from '@renderer/stores/tagStore' // 需要创建
import { TagTreeNode } from '@renderer/types/Note'
import TagTreeItem from './TagTreeItem.vue' // 需要创建
import { useEventBus } from '@vueuse/core'

const tagStore = useTagStore()
const isExpanded = ref(true)
const tagTree = ref<TagTreeNode[]>([])

// 切换展开/折叠
const toggleTagsTree = () => {
  isExpanded.value = !isExpanded.value
}

// 处理标签选择
const handleTagSelect = (tag: TagTreeNode) => {
  console.log('Selected tag:', tag)
  // TODO: 实现标签选择逻辑
}

// 监听标签变化事件
const tagChangeEventBus = useEventBus('tagChange')
tagChangeEventBus.on(async () => {
  await tagStore.fetchTagTree()
  tagTree.value = tagStore.tagTree
})

// 获取标签树数据
onMounted(async () => {
  await tagStore.fetchTagTree()
  tagTree.value = tagStore.tagTree
})
</script>

<style scoped lang="scss">
.tags-tree {
  padding: 0 10px;
  border-radius: 8px;
  margin-top: 5px;

  .tags-header {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 6px 8px 6px 10px;
    border-radius: 8px;
    margin-bottom: 5px;
    user-select: none;
    color: var(--color-text-secondary);

    &:hover {
      background-color: var(--color-hover-sidebar);
    }

    span {
      flex-grow: 1;
      font-size: 12px;
    }

    .toggle-icon {
      transition: transform 0.3s ease;
      .icon {
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
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

  .tags-tree-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 10px;
  }
}
</style>
