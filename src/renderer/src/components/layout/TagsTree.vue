<template>
  <div class="tags-tree">
    <!-- 标签树内容 -->
    <div class="tags-tree-container">
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
import { useTagStore } from '@renderer/stores/tagStore'
import { TagTreeNode } from '@shared/types'
import TagTreeItem from './TagTreeItem.vue'
import { useEventBus } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router/dist/vue-router'

const tagStore = useTagStore()
const { tagTree: storeTagTree } = storeToRefs(tagStore)
const tagTree = ref<TagTreeNode[]>([])
const router = useRouter()

// 添加 props 定义
const props = defineProps<{
  active: boolean
}>()

// 监听 active 变化
watch(
  () => props.active,
  async (newActive) => {
    if (newActive) {
      // 当组件被激活时，刷新数据
      await refreshTagTree()
    }
  }
)

// 处理标签选择
const handleTagSelect = (tag: TagTreeNode) => {
  router.push({
    name: 'cardbox',
    query: {
      tags: tag.id,
      box: 'all'
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

const refreshTagTree = async () => {
  await tagStore.fetchTagTree()
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
  border-radius: 8px;
}

.tags-tree-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
}
</style>
