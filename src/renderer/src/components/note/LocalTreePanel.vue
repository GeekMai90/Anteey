<template>
  <div class="local-tree-panel">
    <div class="panel-header">
      <div class="title" @click="togglePanel">
        <div class="icon" :class="{ collapsed: isCollapsed }">
          <BranchTwo
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
          />
        </div>
        <div class="name">本地树</div>
      </div>
    </div>

    <div v-show="!isCollapsed" class="tree-container">
      <svg ref="svgRef" class="tree-graph"></svg>
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
import type { SimulationNodeDatum } from 'd3'

// 扩展 d3 的类型定义
interface TreeNode extends SimulationNodeDatum {
  id: string
  address: string
  children?: TreeNode[]
  type?: 'parent' | 'sibling' | 'child' | 'incoming' | 'outgoing'
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface LinkDatum {
  source: TreeNode
  target: TreeNode
  type: 'address' | 'reference'
}

const props = defineProps<{
  noteId: string
}>()

const router = useRouter()
const localTreeStore = useLocalTreeStore()
const isCollapsed = ref(true)
const svgRef = ref<SVGElement>()

const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

const renderGraph = () => {
  if (!svgRef.value || !localTreeStore.treeDataWithRefs) return

  const svg = d3.select(svgRef.value)
  const width = svgRef.value.clientWidth || 800
  const height = 400
  const padding = 60

  // 清空现有内容
  svg.selectAll('*').remove()

  const treeData = localTreeStore.treeDataWithRefs

  // 准备数据，并为不同类型的节点设置初始位置
  const data: TreeNode = {
    id: treeData.current.id,
    address: treeData.current.address,
    x: width / 2,
    y: height / 2,
    children: []
  }

  // 分别处理父节点、兄弟节点和子节点
  if (treeData.parent) {
    data.children?.push({
      ...treeData.parent,
      x: width / 2,
      y: padding + 30,
      type: 'parent'
    } as TreeNode)
  }

  // 兄弟节点在左侧
  treeData.siblings.forEach((sibling, index) => {
    data.children?.push({
      ...sibling,
      x: padding + 100,
      y: height / 2 + (index - treeData.siblings.length / 2) * 50,
      type: 'sibling'
    } as TreeNode)
  })

  // 子节点在右侧
  treeData.children.forEach((child, index) => {
    data.children?.push({
      ...child,
      x: width - padding - 100,
      y: height / 2 + (index - treeData.children.length / 2) * 50,
      type: 'child'
    } as TreeNode)
  })

  // 添加引用节点
  // 引用我的节点在左上
  treeData.references.incoming.forEach((note, index) => {
    data.children?.push({
      ...note,
      x: padding + 50,
      y: padding + 30 + index * 40,
      type: 'incoming'
    } as TreeNode)
  })

  // 我引用的节点在右上
  treeData.references.outgoing.forEach((note, index) => {
    data.children?.push({
      ...note,
      x: width - padding - 50,
      y: padding + 30 + index * 40,
      type: 'outgoing'
    } as TreeNode)
  })

  // 创建力导向图布局
  const simulation = d3
    .forceSimulation<TreeNode>()
    .force(
      'link',
      d3
        .forceLink<TreeNode, LinkDatum>()
        .id((d) => d.id)
        .distance((d) => {
          if (d.type === 'reference') return 150 // 引用关系的连线长度
          if ((d.target as TreeNode).type === 'parent') return 120
          if ((d.target as TreeNode).type === 'sibling') return 150
          if ((d.target as TreeNode).type === 'child') return 150
          return 100
        })
    )
    .force(
      'charge',
      d3.forceManyBody().strength((d) => {
        if ((d as TreeNode).type === 'parent') return -800
        if ((d as TreeNode).type === 'sibling') return -400
        if ((d as TreeNode).type === 'child') return -400
        if ((d as TreeNode).type === 'incoming') return -300
        if ((d as TreeNode).type === 'outgoing') return -300
        return -600
      })
    )
    .force('collision', d3.forceCollide().radius(50))
    .force(
      'x',
      d3
        .forceX()
        .x((d) => {
          if ((d as TreeNode).type === 'parent') return width / 2
          if ((d as TreeNode).type === 'sibling') return padding + 150
          if ((d as TreeNode).type === 'child') return width - padding - 150
          if ((d as TreeNode).type === 'incoming') return padding + 100
          if ((d as TreeNode).type === 'outgoing') return width - padding - 100
          return width / 2
        })
        .strength(0.2)
    )
    .force(
      'y',
      d3
        .forceY()
        .y((d) => {
          if ((d as TreeNode).type === 'parent') return padding + 30
          if ((d as TreeNode).type === 'incoming' || (d as TreeNode).type === 'outgoing')
            return padding + 50
          return height / 2
        })
        .strength(0.3)
    )

  // 创建连线数据
  const links: LinkDatum[] = []

  // 添加地址关系的连线
  data.children?.forEach((child) => {
    if (['parent', 'sibling', 'child'].includes(child.type || '')) {
      links.push({
        source: data,
        target: child,
        type: 'address'
      })
    }
  })

  // 添加引用关系的连线
  data.children?.forEach((child) => {
    if (child.type === 'incoming') {
      links.push({
        source: child,
        target: data,
        type: 'reference'
      })
    } else if (child.type === 'outgoing') {
      links.push({
        source: data,
        target: child,
        type: 'reference'
      })
    }
  })

  // 添加连线
  const link = svg
    .append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', (d) =>
      d.type === 'reference' ? 'var(--color-primary)' : 'var(--color-border)'
    )
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', (d) => (d.type === 'reference' ? '5,5' : '0'))

  // 添加节点
  const nodes = svg
    .append('g')
    .selectAll<SVGGElement, TreeNode>('g')
    .data([data, ...(data.children || [])])
    .join('g')
    .call(
      d3
        .drag<SVGGElement, TreeNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    )
    .on('dblclick', (event, d) => {
      const note = treeData.current.id === d.id ? treeData.current : findNoteInData(d.id, treeData)
      if (note) handleNodeClick(note)
    })

  // 添加节点圆圈
  nodes
    .append('circle')
    .attr('r', 10)
    .attr('fill', (d) => {
      if (d.id === data.id) return 'var(--color-primary)'
      switch (d.type) {
        case 'parent':
          return '#ff9800'
        case 'sibling':
          return '#9c27b0'
        case 'child':
          return '#2196f3'
        case 'incoming':
          return '#4caf50'
        case 'outgoing':
          return '#f44336'
        default:
          return 'var(--color-bg-secondary)'
      }
    })
    .attr('stroke', 'var(--color-border)')
    .attr('stroke-width', 1)

  // 添加地址文本
  nodes
    .append('text')
    .text((d) => d.address)
    .attr('text-anchor', 'middle')
    .attr('dy', 30)
    .attr('fill', 'var(--color-text-primary)')
    .attr('font-size', '12px')

  // 更新力导向图
  simulation
    .nodes([data, ...(data.children || [])])
    .force(
      'link',
      d3.forceLink<TreeNode, LinkDatum>(links).id((d) => d.id)
    )
    .on('tick', () => {
      nodes.attr('transform', (d) => {
        const x = Math.max(padding, Math.min(width - padding, d.x || 0))
        const y = Math.max(padding, Math.min(height - padding, d.y || 0))
        return `translate(${x},${y})`
      })

      link
        .attr('x1', (d) => Math.max(padding, Math.min(width - padding, d.source.x || 0)))
        .attr('y1', (d) => Math.max(padding, Math.min(height - padding, d.source.y || 0)))
        .attr('x2', (d) => Math.max(padding, Math.min(width - padding, d.target.x || 0)))
        .attr('y2', (d) => Math.max(padding, Math.min(height - padding, d.target.y || 0)))
    })

  function dragstarted(event: d3.D3DragEvent<SVGGElement, TreeNode, TreeNode>) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, TreeNode, TreeNode>) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, TreeNode, TreeNode>) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }
}

// 辅助函数：在树数据中查找笔记
const findNoteInData = (id: string, treeData: any): Note | null => {
  if (treeData.parent?.id === id) return treeData.parent
  const sibling = treeData.siblings.find((n: Note) => n.id === id)
  if (sibling) return sibling
  const child = treeData.children.find((n: Note) => n.id === id)
  if (child) return child
  const incoming = treeData.references.incoming.find((n: Note) => n.id === id)
  if (incoming) return incoming
  const outgoing = treeData.references.outgoing.find((n: Note) => n.id === id)
  if (outgoing) return outgoing
  return null
}

const handleNodeClick = (note: Note) => {
  router.push({
    name: 'NoteExpandEditor',
    params: { id: note.id }
  })
}

watch(
  () => localTreeStore.treeDataWithRefs,
  () => renderGraph()
)

watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      await localTreeStore.fetchLocalTreeWithRefs(newId)
    }
  },
  { immediate: true }
)

onMounted(() => {
  renderGraph()
})
</script>

<style lang="scss" scoped>
.local-tree-panel {
  margin-top: 24px;
  padding: 0 24px;
  user-select: none;
  width: 100%;

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
    padding: 12px;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
    min-height: 400px;
    width: 100%;

    .tree-graph {
      width: 100%;
      height: 400px;
      display: block;
    }
  }
}
</style>
