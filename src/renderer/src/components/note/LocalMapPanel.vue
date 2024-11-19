<template>
  <div class="local-tree-panel">
    <div v-if="!hideHeader" class="panel-header">
      <div class="title" @click="togglePanel">
        <div class="icon" :class="{ collapsed: isCollapsed }">
          <BranchTwo
            theme="outline"
            size="16"
            :fill="isCollapsed ? 'var(--color-icon-secondary)' : 'var(--color-primary)'"
          />
        </div>
        <div class="name">局部图谱</div>
      </div>
    </div>

    <div v-show="!isCollapsed" class="tree-container">
      <svg ref="svgRef" class="tree-graph"></svg>
    </div>

    <NotePreviewPopup
      v-if="showPreview && previewNoteId"
      :noteId="previewNoteId"
      :position="previewPosition"
    />
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
import { useNoteStore } from '@renderer/stores/noteStores'
import NotePreviewPopup from './NotePreviewPopup.vue'

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

// 在 props 声明之前添加预览相关的响应式变量
const showPreview = ref(false)
const previewNoteId = ref<string | null>(null)
const previewPosition = ref({ x: 0, y: 0 })

const props = defineProps<{
  noteId: string
  hideHeader?: boolean
  isCollapsed?: boolean
}>()

const router = useRouter()
const localTreeStore = useLocalTreeStore()
const isCollapsed = ref(props.isCollapsed ?? true)
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

  // 添加图例组
  const legend = svg.append('g').attr('class', 'legend').attr('transform', 'translate(20, 20)')

  const legendData = [
    { type: 'current', label: '当前笔记', color: 'var(--color-primary)' },
    { type: 'parent', label: '父级笔记', color: 'var(--node-color-parent)' },
    { type: 'sibling', label: '同级笔记', color: 'var(--node-color-sibling)' },
    { type: 'child', label: '子级笔记', color: 'var(--node-color-child)' },
    { type: 'incoming', label: '引用我的', color: 'var(--node-color-incoming)' },
    { type: 'outgoing', label: '我引用的', color: 'var(--node-color-outgoing)' }
  ]

  // 为每个图例项创建一个组
  const legendItems = legend
    .selectAll('.legend-item')
    .data(legendData)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (_d, i) => `translate(0, ${i * 20})`)

  // 添加图例圆点
  legendItems
    .append('circle')
    .attr('r', 6)
    .attr('cx', 6)
    .attr('cy', 6)
    .attr('fill', (d) => d.color)
    .attr('stroke', (d) => (d.type === 'current' ? 'var(--color-primary)' : 'var(--color-border)'))
    .attr('stroke-width', (d) => (d.type === 'current' ? 2 : 1))
    .attr('stroke-opacity', 0.3)

  // 添加图例文本
  legendItems
    .append('text')
    .attr('x', 20)
    .attr('y', 9)
    .attr('fill', 'var(--color-text-secondary)')
    .attr('font-size', '11px')
    .text((d) => d.label)

  // 为图例添加半透明背景
  const legendBBox = legend.node()?.getBBox()
  if (legendBBox) {
    legend
      .insert('rect', ':first-child')
      .attr('x', -6)
      .attr('y', -6)
      .attr('width', legendBBox.width + 12)
      .attr('height', legendBBox.height + 12)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'var(--color-bg-primary)')
      .attr('fill-opacity', 0.8)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.1)
  }

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

  // 弟节点在左侧
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
          if (d.type === 'reference') return 120
          if ((d.target as TreeNode).type === 'parent') return 100
          if ((d.target as TreeNode).type === 'sibling') return 120
          if ((d.target as TreeNode).type === 'child') return 120
          return 80
        })
    )
    .force(
      'charge',
      d3.forceManyBody().strength((d) => {
        if ((d as TreeNode).type === 'parent') return -600
        if ((d as TreeNode).type === 'sibling') return -300
        if ((d as TreeNode).type === 'child') return -300
        if ((d as TreeNode).type === 'incoming') return -200
        if ((d as TreeNode).type === 'outgoing') return -200
        return -400
      })
    )
    .force('collision', d3.forceCollide().radius(40))
    .force(
      'x',
      d3
        .forceX()
        .x((d) => {
          const centerX = width / 2
          if ((d as TreeNode).type === 'parent') return centerX
          if ((d as TreeNode).type === 'sibling') return centerX - 150
          if ((d as TreeNode).type === 'child') return centerX + 150
          if ((d as TreeNode).type === 'incoming') return centerX - 180
          if ((d as TreeNode).type === 'outgoing') return centerX + 180
          return centerX
        })
        .strength(0.3)
    )
    .force(
      'y',
      d3
        .forceY()
        .y((d) => {
          const centerY = height / 2
          if ((d as TreeNode).type === 'parent') return padding + 50
          if ((d as TreeNode).type === 'incoming' || (d as TreeNode).type === 'outgoing')
            return padding + 60
          return centerY
        })
        .strength(0.4)
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
    .on('click', (event, d) => {
      const note = treeData.current.id === d.id ? treeData.current : findNoteInData(d.id, treeData)
      if (note) handleNodeClick(event, note)
    })
    .on('dblclick', (_event, d) => {
      const note = treeData.current.id === d.id ? treeData.current : findNoteInData(d.id, treeData)
      if (note) handleNodeDblClick(note)
    })
    .on('mouseenter', (event, d) => {
      const note = treeData.current.id === d.id ? treeData.current : findNoteInData(d.id, treeData)
      if (note) handleNodeMouseEnter(event, note)
    })
    .on('mouseleave', handleNodeMouseLeave)

  // 添加节点圆圈
  nodes
    .append('circle')
    .attr('r', (d) => {
      if (d.id === data.id) return 14 // 当前节点最大
      switch (d.type) {
        case 'parent':
          return 12
        case 'sibling':
        case 'child':
          return 10
        case 'incoming':
        case 'outgoing':
          return 8
        default:
          return 10
      }
    })
    .attr('fill', (d) => {
      if (d.id === data.id) {
        // 当前节点使用渐变效果
        return 'url(#currentGradient)'
      }
      switch (d.type) {
        case 'parent':
          return 'var(--node-color-parent, #FFB74D)'
        case 'sibling':
          return 'var(--node-color-sibling, #CE93D8)'
        case 'child':
          return 'var(--node-color-child, #90CAF9)'
        case 'incoming':
          return 'var(--node-color-incoming, #A5D6A7)'
        case 'outgoing':
          return 'var(--node-color-outgoing, #EF9A9A)'
        default:
          return 'var(--color-bg-secondary)'
      }
    })
    .attr('stroke', (d) => (d.id === data.id ? 'var(--color-primary)' : 'var(--color-border)'))
    .attr('stroke-width', (d) => (d.id === data.id ? 2 : 1))
    .style('cursor', 'pointer')
    .style('transition', 'all 0.2s ease')
    // 添加悬停效果
    .on('mouseover', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', () => {
          const currentRadius = d3.select(this).attr('r')
          return parseFloat(currentRadius) + 2
        })
        .attr('stroke-width', 2)
    })
    .on('mouseout', function (this: SVGCircleElement) {
      const element = d3.select(this)
      const datum = element.datum() as TreeNode

      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', () => {
          if (datum.id === data.id) return 14
          switch (datum.type) {
            case 'parent':
              return 12
            case 'sibling':
            case 'child':
              return 10
            case 'incoming':
            case 'outgoing':
              return 8
            default:
              return 10
          }
        })
        .attr('stroke-width', () => {
          return datum.id === data.id ? 2 : 1
        })
    })

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

  // 在 svg 初始化时添加渐变定义
  const defs = svg.append('defs')

  // 为当前节点创建渐变效果
  const gradient = defs
    .append('linearGradient')
    .attr('id', 'currentGradient')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '100%')

  gradient
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', 'var(--color-primary)')
    .attr('stop-opacity', 0.8)

  gradient
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'var(--color-primary)')
    .attr('stop-opacity', 0.6)
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

const handleNodeClick = (event: MouseEvent, note: Note) => {
  // Command/Ctrl + 点击使用展开编辑器
  if (event.metaKey || event.ctrlKey) {
    router.push({
      name: 'NoteExpandEditor',
      params: { id: note.id }
    })
  }
}

const handleNodeDblClick = (note: Note) => {
  if (!note.id) return
  useNoteStore().openNoteEditor(note.id)
}

const handleNodeMouseEnter = (event: MouseEvent, note: Note) => {
  if (!note.id) return

  const rect = (event.target as Element).getBoundingClientRect()
  const windowWidth = window.innerWidth
  const previewWidth = 300 // 预览窗口的宽度
  const padding = 10 // 边距

  // 检查是否靠近右边界
  if (rect.right + previewWidth + padding > windowWidth) {
    // 如果靠近右边界，显示在左侧
    previewPosition.value = {
      x: rect.left - previewWidth - padding,
      y: rect.top
    }
  } else {
    // 否则显示在右侧
    previewPosition.value = {
      x: rect.right + padding,
      y: rect.top
    }
  }

  previewNoteId.value = note.id
  showPreview.value = true
}

const handleNodeMouseLeave = () => {
  showPreview.value = false
  previewNoteId.value = null
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

watch(
  () => props.isCollapsed,
  (newValue) => {
    if (newValue !== undefined) {
      isCollapsed.value = newValue
    }
  }
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
    // padding: 12px 0;
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

    // 添加CSS变量用于节点颜色
    --node-color-parent: #ffb74d;
    --node-color-sibling: #ce93d8;
    --node-color-child: #90caf9;
    --node-color-incoming: #a5d6a7;
    --node-color-outgoing: #ef9a9a;
  }
}
</style>
