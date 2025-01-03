<template>
  <div v-if="parentPath.length > 0" class="breadcrumb">
    <span
      v-for="(node, index) in parentPath"
      :key="node.id"
      class="breadcrumb-item"
      @click="handleClick(node)"
    >
      {{ node.address }} - {{ node.title }}
      <span v-if="index < parentPath.length - 1" class="separator">/</span>
    </span>
    <button v-if="parentPath.length > 1" class="back-button" @click="handleBack">返回上层</button>
  </div>
</template>

<script setup lang="ts">
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@shared/types'
import { computed } from 'vue'

const store = useKnowledgeTreeStore()
const parentPath = computed(() => store.parentPath)

const handleClick = (node: KnowledgeTreeNode) => {
  store.focusNodeWithChildren(node)
}

const handleBack = () => {
  store.backToParent()
}
</script>

<style scoped>
.breadcrumb {
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.breadcrumb-item {
  cursor: pointer;
  color: var(--color-text-secondary);
}

.breadcrumb-item:hover {
  color: var(--color-primary);
}

.separator {
  margin: 0 8px;
  color: #d9d9d9;
}

.back-button {
  margin-left: 16px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
</style>
