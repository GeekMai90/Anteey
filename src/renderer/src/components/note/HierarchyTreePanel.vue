<template>
  <div class="hierarchy-tree-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <div class="icon" :class="{ collapsed: isCollapsed }">
          <BranchTwo
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
          />
        </div>
        <div class="name">笔记关系</div>
      </div>
    </div>

    <div v-show="!isCollapsed" class="tree-container">
      <svg ref="svgRef" class="tree-graph" :width="width" :height="height"></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { BranchTwo } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useLocalTreeStore } from '@renderer/stores/localTreeStore'
import * as d3 from 'd3'
import type { Note } from '@renderer/types/Note'

const props = defineProps<{
  noteId: string
}>()

const router = useRouter()
const localTreeStore = useLocalTreeStore()
const isCollapsed = ref(true)
const svgRef = ref<SVGElement>()

const width = 600 // 设置固定宽度
const height = 400 // 设置固定高度
const nodeRadius = 30 // 节点半径
const horizontalGap = 150 // 水平间距
const verticalGap = 100 // 垂直间距

const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

const renderHierarchyTree = () => {
  if (!svgRef.value || !localTreeStore.treeData) return

  const svg = d3.select(svgRef.value)

  // 清空现有内容
  svg.selectAll('*').remove()

  // 创建主容器组，并设置居中偏移
  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`)

  // 准备数据
  const treeData = localTreeStore.treeData
  const currentNote = treeData.current

  // 创建连接线组和节点组
  const linesGroup = g.append('g').attr('class', 'lines')
  const nodesGroup = g.append('g').attr('class', 'nodes')

  // 绘制当前节点（在中心）
  const currentNode = nodesGroup
    .append('g')
    .attr('transform', 'translate(0,0)')
    .attr('class', 'node current')
    .on('click', () => handleNodeClick(currentNote))

  currentNode
    .append('circle')
    .attr('r', nodeRadius)
    .attr('fill', 'var(--color-primary)')
    .attr('stroke', 'var(--color-border)')
    .attr('stroke-width', 2)

  currentNode
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .attr('fill', 'white')
    .text(currentNote.address)

  // 绘制父节点（在上方）
  if (treeData.parent) {
    // 先画连接线
    linesGroup
      .append('line')
      .attr('x1', 0)
      .attr('y1', -verticalGap + nodeRadius)
      .attr('x2', 0)
      .attr('y2', -nodeRadius)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    // 再画节点
    const parentNode = nodesGroup
      .append('g')
      .attr('transform', `translate(0,${-verticalGap})`)
      .attr('class', 'node parent')
      .on('click', () => handleNodeClick(treeData.parent!))

    parentNode
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', 'var(--color-bg-secondary)')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    parentNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .text(treeData.parent.address)
  }

  // 绘制兄弟节点（在右侧）
  treeData.siblings.forEach((sibling, index) => {
    const siblingX = (index + 1) * horizontalGap

    // 先画连接线
    linesGroup
      .append('line')
      .attr('x1', nodeRadius)
      .attr('y1', 0)
      .attr('x2', siblingX - nodeRadius)
      .attr('y2', 0)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    // 再画节点
    const siblingNode = nodesGroup
      .append('g')
      .attr('transform', `translate(${siblingX},0)`)
      .attr('class', 'node sibling')
      .on('click', () => handleNodeClick(sibling))

    siblingNode
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', 'var(--color-bg-secondary)')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    siblingNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .text(sibling.address)
  })

  // 绘制子节点（在下方）
  const childrenCount = treeData.children.length
  treeData.children.forEach((child, index) => {
    const childX = (index - (childrenCount - 1) / 2) * horizontalGap

    // 先画连接线
    linesGroup
      .append('line')
      .attr('x1', 0)
      .attr('y1', nodeRadius)
      .attr('x2', childX)
      .attr('y2', verticalGap - nodeRadius)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    // 再画节点
    const childNode = nodesGroup
      .append('g')
      .attr('transform', `translate(${childX},${verticalGap})`)
      .attr('class', 'node child')
      .on('click', () => handleNodeClick(child))

    childNode
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', 'var(--color-bg-secondary)')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    childNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', 'white')
      .text(child.address)
  })
}

const handleNodeClick = (note: Note) => {
  router.push({
    name: 'note',
    params: { id: note.id }
  })
}

watch(
  () => localTreeStore.treeData,
  () => renderHierarchyTree()
)

watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      await localTreeStore.fetchLocalTree(newId)
    }
  },
  { immediate: true }
)

onMounted(() => {
  renderHierarchyTree()
})
</script>

<style lang="scss" scoped>
.hierarchy-tree-panel {
  margin-top: 24px;
  padding: 0 24px;
  user-select: none;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s ease;

      &:hover {
        background: var(--color-hover-bg);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;

        &.collapsed {
          transform: rotate(-90deg);
        }
      }

      .name {
        font-size: 13px;
        color: var(--color-text-secondary);
        font-weight: 500;
      }
    }
  }

  .tree-container {
    padding: 24px;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 500px;

    .tree-graph {
      width: 100%;
      height: 100%;
      min-width: 600px;
      min-height: 400px;

      :deep(.node) {
        cursor: pointer;

        &:hover circle {
          filter: brightness(0.95);
        }

        text {
          font-size: 12px;
          pointer-events: none;
        }
      }
    }
  }
}
</style>
