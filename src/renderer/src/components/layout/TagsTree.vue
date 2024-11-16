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
import { ref, onMounted, watch } from 'vue'
import { Down, Right } from '@icon-park/vue-next'
import { useTagStore } from '@renderer/stores/tagStore' // 需要创建
import { TagTreeNode } from '@renderer/types/Note'
import TagTreeItem from './TagTreeItem.vue' // 需要创建
import { useEventBus } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router/dist/vue-router'

const tagStore = useTagStore()
// 使用 storeToRefs 来保持响应性
const { tagTree: storeTagTree } = storeToRefs(tagStore)
const isExpanded = ref(true)
const tagTree = ref<TagTreeNode[]>([])
const router = useRouter()

// 切换展开/折叠
const toggleTagsTree = () => {
  isExpanded.value = !isExpanded.value
}

// 处理标签选择
const handleTagSelect = (tag: TagTreeNode) => {
  console.log('Selected tag:', tag)

  // 跳转到卡片盒页面，并设置标签筛选参数
  router.push({
    name: 'cardbox', // 确保这是卡片盒页面的路由名称
    query: {
      tags: tag.id, // 设置选中的标签ID
      box: 'all' // 默认显示所有卡片盒
    }
  })
}

// 监听 store 中的 tagTree 变化
watch(
  storeTagTree,
  (newValue) => {
    tagTree.value = JSON.parse(JSON.stringify(newValue))
  },
  { deep: true }
)
// 获取标签树数据的函数
const refreshTagTree = async () => {
  await tagStore.fetchTagTree()
  // 不需要手动赋值，watch 会处理
}
// 监听标签变化事件
const tagChangeEventBus = useEventBus('tagChange')
tagChangeEventBus.on(async () => {
  await refreshTagTree()
})

// 初始加载
onMounted(async () => {
  await refreshTagTree()
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
