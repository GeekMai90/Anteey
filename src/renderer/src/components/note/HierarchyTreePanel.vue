<!-- 局部知识树 -->
<template>
  <div ref="panelRef" class="hierarchy-tree-panel">
    <div v-if="!hideHeader" class="panel-header">
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

    <div v-show="!isCollapsed" ref="containerRef" class="tree-container">
      <svg ref="svgRef" class="tree-graph" :width="svgWidth" :height="height"></svg>
    </div>

    <NotePreviewPopup
      v-if="showPreview && previewNoteId"
      :noteId="previewNoteId"
      :reference-el="referenceEl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { BranchTwo } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useLocalTreeStore } from '@renderer/stores/localTreeStore'
import * as d3 from 'd3'
import type { Note } from '@shared/types'
// import NoteListDialog from './NoteListDialog.vue'
import NotePreviewPopup from './NotePreviewPopup.vue'
import { useNoteStore } from '@renderer/stores/noteStore'

const props = defineProps<{
  noteId: string
  hideHeader?: boolean
  isCollapsed?: boolean
}>()

const router = useRouter()
const localTreeStore = useLocalTreeStore()
const isCollapsed = ref(props.isCollapsed ?? true)
const svgRef = ref<SVGElement>()
// const showNoteList = ref(false)
// const allChildren = ref<Note[]>([])

const width = 800
const height = 500
const nodeWidth = 120
const nodeHeight = 70
const cornerRadius = 6
const horizontalGap = 200
const verticalGap = 80
const MAX_VISIBLE_CHILDREN = 5
const containerRef = ref<HTMLDivElement>()

// 添加一个响应式变量来跟踪当前显示的节点数量
const currentVisibleCount = ref(MAX_VISIBLE_CHILDREN)

// 修改列间距常量
const COLUMN_GAP = 200

// 修改颜色常量
const colors = {
  current: {
    bg: 'var(--color-primary)',
    text: '#FFFFFF',
    stroke: 'var(--color-primary-dark)',
    opacity: 1
  },
  parent: {
    bg: 'var(--color-bg-primary)',
    text: 'var(--color-blue)',
    stroke: 'var(--color-blue)',
    opacity: 0.8
  },
  sibling: {
    bg: 'var(--color-bg-primary)',
    text: 'var(--color-yellow)',
    stroke: 'var(--color-yellow)',
    opacity: 0.8
  },
  child: {
    bg: 'var(--color-bg-primary)',
    text: 'var(--color-primary)',
    stroke: 'var(--color-primary)',
    opacity: 0.8
  }
}

const togglePanel = () => {
  isCollapsed.value = !isCollapsed.value
}

// 修改地址排序函数
const compareAddresses = (a: Note, b: Note) => {
  // 将地址分割成数字和字母部分
  const splitAddress = (addr: string) => {
    const parts = addr.split('-')
    const lastPart = parts[parts.length - 1]
    // 分离数字和字母
    const match = lastPart.match(/^(\d+)([a-z]*)$/)
    if (match) {
      return {
        base: parts.slice(0, -1).join('-'), // 基础部分
        num: parseInt(match[1]),
        alpha: match[2]
      }
    }
    return { base: '', num: 0, alpha: '' }
  }

  const addrA = splitAddress(a.address)
  const addrB = splitAddress(b.address)

  // 如果基础部分不同，按基础部分排序
  if (addrA.base !== addrB.base) {
    return addrA.base.localeCompare(addrB.base)
  }

  // 如果数字部分不同，按数字排序
  if (addrA.num !== addrB.num) {
    return addrA.num - addrB.num
  }

  // 数字相同时，按字母后缀排序（无后缀排在前面）
  if (!addrA.alpha && !addrB.alpha) return 0
  if (!addrA.alpha) return -1
  if (!addrB.alpha) return 1
  return addrA.alpha.localeCompare(addrB.alpha)
}

// 添加一个工具函数来截断文本
const truncateText = (text: string, maxLength: number = 6): string => {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

// 修改获取标题的函数
const getNodeTitle = (note: Note): string => {
  try {
    let title = '无标题'
    // 如果 metadata 是字符串,尝试解析它
    if (typeof note.metadata === 'string') {
      const metadata = JSON.parse(note.metadata)
      title = metadata.title || '无标题'
    }
    // 如果 metadata 已经是对象
    else if (note.metadata && typeof note.metadata === 'object') {
      title = note.metadata.title || '无标题'
    }
    // 截断标题
    return truncateText(title)
  } catch (error) {
    console.warn('解析笔记标题失败:', error)
    return '无标题'
  }
}

const renderHierarchyTree = () => {
  if (!svgRef.value || !localTreeStore.treeData) return

  // 添加日志查看整个树数据
  // console.log('整个树数据:', localTreeStore.treeData)
  // console.log('当前节点:', localTreeStore.treeData.current)
  // console.log('父节点:', localTreeStore.treeData.parent)
  // console.log('兄弟节点:', localTreeStore.treeData.siblings)
  // console.log('子节点:', localTreeStore.treeData.children)

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  // 添加图例组
  const legend = svg.append('g').attr('class', 'legend').attr('transform', 'translate(20, 20)') // 位于左上角，留出边距

  const legendData = [
    { type: 'current', label: '当前笔记', color: colors.current },
    { type: 'parent', label: '父级笔记', color: colors.parent },
    { type: 'sibling', label: '同级笔记', color: colors.sibling },
    { type: 'child', label: '子级笔记', color: colors.child }
  ]

  // 为每个图例项创建一个组
  const legendItems = legend
    .selectAll('.legend-item')
    .data(legendData)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (_d, i) => `translate(0, ${i * 20})`) // 减小垂直间距从 25 改为 20

  // 添加图例符号（小矩形）
  legendItems
    .append('rect')
    .attr('width', 12) // 从 16 减小到 12
    .attr('height', 12) // 从 16 减小到 12
    .attr('rx', 2) // 从 3 减小到 2
    .attr('ry', 2) // 从 3 减小到 2
    .attr('fill', (d) => (d.type === 'current' ? d.color.bg : 'var(--color-bg-primary)'))
    .attr('stroke', (d) => d.color.stroke)
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.3)

  // 添加图例文本
  legendItems
    .append('text')
    .attr('x', 20) // 从 24 减小到 20
    .attr('y', 9) // 从 12 调整到 9
    .attr('fill', 'var(--color-text-secondary)')
    .attr('font-size', '11px') // 从 12px 减小到 11px
    .text((d) => d.label)

  // 为图例添加半透明背景
  const legendBBox = legend.node()?.getBBox()
  if (legendBBox) {
    legend
      .insert('rect', ':first-child')
      .attr('x', -6) // 从 -8 改为 -6
      .attr('y', -6) // 从 -8 改为 -6
      .attr('width', legendBBox.width + 12) // 从 16 改为 12
      .attr('height', legendBBox.height + 12) // 从 16 改为 12
      .attr('rx', 4) // 从 6 改为 4
      .attr('ry', 4) // 从 6 改为 4
      .attr('fill', 'var(--color-bg-primary)')
      .attr('fill-opacity', 0.8)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.1)
  }

  // 创建主容器组，并设置居中偏移
  const g = svg
    .append('g')
    .attr('transform', `translate(${horizontalGap + nodeWidth},${height / 2})`)

  // 准备数据
  const treeData = localTreeStore.treeData
  const currentNote = treeData.current

  // 创建连接线组和节点组
  const linesGroup = g.append('g').attr('class', 'lines')
  const nodesGroup = g.append('g').attr('class', 'nodes')

  // 绘制前节点（在中心）
  const currentNode = nodesGroup
    .append('g')
    .attr('transform', 'translate(0,0)')
    .attr('class', 'node current')
    .on('click', (event) => handleNodeClick(event, currentNote))
    .on('dblclick', () => handleNodeDblClick(currentNote))
    .on('mouseenter', (event) => handleNodeMouseEnter(event, currentNote))
    .on('mouseleave', handleNodeMouseLeave)

  currentNode
    .append('rect')
    .attr('x', -nodeWidth / 2)
    .attr('y', -nodeHeight / 2)
    .attr('width', nodeWidth)
    .attr('height', nodeHeight)
    .attr('rx', cornerRadius)
    .attr('ry', cornerRadius)
    .attr('fill', colors.current.bg)
    .attr('stroke', colors.current.stroke)
    .attr('stroke-width', 2)
    .attr('filter', 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))')

  currentNode
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.5em')
    .attr('fill', colors.current.text)
    .attr('fill-opacity', colors.current.opacity)
    .attr('font-weight', '500')
    .text(currentNote.address)

  currentNode
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.2em')
    .attr('fill', colors.current.text)
    .attr('fill-opacity', colors.current.opacity)
    .attr('font-size', '0.9em')
    .text(getNodeTitle(currentNote))

  // 在渲染各个节点时也添加日志
  // 当前节点
  // console.log('渲染当前节点:', currentNote)
  // console.log('当前节点标题:', getNodeTitle(currentNote))

  // 父节点
  if (treeData.parent) {
    // console.log('渲染父节点:', treeData.parent)
    // console.log('父节点标题:', treeData.parent ? getNodeTitle(treeData.parent) : null)

    // 画连接线
    linesGroup
      .append('line')
      .attr('x1', -horizontalGap + nodeWidth / 2)
      .attr('y1', 0)
      .attr('x2', -nodeWidth / 2)
      .attr('y2', 0)
      .attr('stroke', 'var(--color-blue)')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '3,3')

    // 画节点
    const parentNode = nodesGroup
      .append('g')
      .attr('transform', `translate(${-horizontalGap},0)`)
      .attr('class', 'node parent')
      .on('click', (event) => {
        if (treeData.parent) {
          handleNodeClick(event, treeData.parent)
        }
      })
      .on('dblclick', () => {
        if (treeData.parent) {
          handleNodeDblClick(treeData.parent)
        }
      })
      .on('mouseenter', (event) => {
        if (treeData.parent) {
          handleNodeMouseEnter(event, treeData.parent)
        }
      })
      .on('mouseleave', handleNodeMouseLeave)

    parentNode
      .append('rect')
      .attr('x', -nodeWidth / 2)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight)
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .attr('fill', colors.parent.bg)
      .attr('stroke', colors.parent.stroke)
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)

    parentNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .attr('fill', colors.parent.text)
      .attr('fill-opacity', colors.parent.opacity)
      .attr('font-weight', '500')
      .text(treeData.parent.address)

    parentNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', colors.parent.text)
      .attr('fill-opacity', colors.parent.opacity)
      .attr('font-size', '0.9em')
      .text(getNodeTitle(treeData.parent))
  }

  // 修改兄弟节点的渲染部分
  if (treeData.siblings.adjacent.length > 0) {
    // 对兄弟节点进行排序，创建新数组避免修改原组
    const sortedSiblings = [...treeData.siblings.adjacent].sort(compareAddresses)
    // console.log('排序后的兄弟节点:', sortedSiblings)

    // 获取当前节点的数字和字母部分
    const currentMatch = currentNote.address
      .split('-')
      .pop()
      ?.match(/^(\d+)([a-z]*)$/)
    const currentNum = currentMatch ? parseInt(currentMatch[1]) : 0
    const currentAlpha = currentMatch ? currentMatch[2] : ''

    // 找到前一个和后一个节点
    let prevSibling: Note | null = null
    let nextSibling: Note | null = null

    // 遍历排序后的兄弟节点数组
    for (let i = 0; i < sortedSiblings.length; i++) {
      const sibling = sortedSiblings[i]
      const match = sibling.address
        .split('-')
        .pop()
        ?.match(/^(\d+)([a-z]*)$/)

      if (!match) continue

      const siblingNum = parseInt(match[1])
      const siblingAlpha = match[2] || ''

      // 判断是否为一个节点
      if (siblingNum < currentNum || (siblingNum === currentNum && !siblingAlpha && currentAlpha)) {
        prevSibling = sibling
      }
      // 判断是否为后一个节点
      else if (
        siblingNum > currentNum ||
        (siblingNum === currentNum && siblingAlpha && !currentAlpha)
      ) {
        nextSibling = sibling
        break // 找到后一个节点后就可以停止遍历
      }
    }

    // console.log('前一个节点:', prevSibling)
    // console.log('后一个节点:', nextSibling)

    // 绘制前一个节点（上方）
    if (prevSibling) {
      // console.log('渲染前一个兄弟节点:', prevSibling)
      // console.log('前一个兄弟节点标题:', prevSibling ? getNodeTitle(prevSibling) : null)

      // 画连接线
      linesGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', nodeHeight / 2)
        .attr('x2', 0)
        .attr('y2', -verticalGap + nodeHeight / 2)
        .attr('stroke', 'var(--color-yellow)')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.25)
        .attr('stroke-dasharray', '3,3')

      // 画节点
      const prevNode = nodesGroup
        .append('g')
        .attr('transform', `translate(0,${-verticalGap})`)
        .attr('class', 'node sibling')
        .on('click', (event) => handleNodeClick(event, prevSibling))
        .on('dblclick', () => handleNodeDblClick(prevSibling))
        .on('mouseenter', (event) => handleNodeMouseEnter(event, prevSibling))
        .on('mouseleave', handleNodeMouseLeave)

      prevNode
        .append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', colors.sibling.bg)
        .attr('stroke', colors.sibling.stroke)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)

      prevNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .attr('fill', colors.sibling.text)
        .attr('fill-opacity', colors.sibling.opacity)
        .attr('font-weight', '500')
        .text(prevSibling.address)

      prevNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('fill', colors.sibling.text)
        .attr('fill-opacity', colors.sibling.opacity)
        .attr('font-size', '0.9em')
        .text(getNodeTitle(prevSibling))
    }

    // 绘制后一个节点（下方）
    if (nextSibling) {
      // console.log('渲染后一个兄弟节点:', nextSibling)
      // console.log('后一个兄弟节点标题:', nextSibling ? getNodeTitle(nextSibling) : null)

      // 画连接线
      linesGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', nodeHeight / 2)
        .attr('x2', 0)
        .attr('y2', verticalGap - nodeHeight / 2)
        .attr('stroke', 'var(--color-yellow)')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.25)
        .attr('stroke-dasharray', '3,3')

      // 画节点
      const nextNode = nodesGroup
        .append('g')
        .attr('transform', `translate(0,${verticalGap})`)
        .attr('class', 'node sibling')
        .on('click', (event) => handleNodeClick(event, nextSibling))
        .on('dblclick', () => handleNodeDblClick(nextSibling))
        .on('mouseenter', (event) => handleNodeMouseEnter(event, nextSibling))
        .on('mouseleave', handleNodeMouseLeave)

      nextNode
        .append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', colors.sibling.bg)
        .attr('stroke', colors.sibling.stroke)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)

      nextNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .attr('fill', colors.sibling.text)
        .attr('fill-opacity', colors.sibling.opacity)
        .attr('font-weight', '500')
        .text(nextSibling.address)

      nextNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('fill', colors.sibling.text)
        .attr('fill-opacity', colors.sibling.opacity)
        .attr('font-size', '0.9em')
        .text(getNodeTitle(nextSibling))
    }
  }

  // 绘制子节点（分列显示）
  const children = [...treeData.children].sort(compareAddresses) // 添加排序
  const totalChildren = children.length
  const totalColumns = Math.ceil(currentVisibleCount.value / MAX_VISIBLE_CHILDREN)

  // 遍历每一列
  for (let column = 0; column < totalColumns; column++) {
    const startIndex = column * MAX_VISIBLE_CHILDREN
    const endIndex = Math.min(startIndex + MAX_VISIBLE_CHILDREN, currentVisibleCount.value)
    const columnChildren = children.slice(startIndex, endIndex)
    const columnX = horizontalGap + column * COLUMN_GAP

    // 绘制当前列的子节点
    columnChildren.forEach((child, index) => {
      // console.log(`渲染第 ${index + 1} 个子节点:`, child)
      // console.log(`第 ${index + 1} 个子节点标题:`, getNodeTitle(child))

      if (!child || !child.address) {
        console.warn('无效的子节点:', child)
        return
      }

      const childY = (index - (columnChildren.length - 1) / 2) * verticalGap

      // 画连接线（所有列的节点都直接连接到中心节点）
      linesGroup
        .append('line')
        .attr('x1', nodeWidth / 2)
        .attr('y1', 0)
        .attr('x2', columnX - nodeWidth / 2)
        .attr('y2', childY)
        .attr('stroke', 'var(--color-primary)')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-dasharray', '3,3')

      // 画节点
      const childNode = nodesGroup
        .append('g')
        .attr('transform', `translate(${columnX},${childY})`)
        .attr('class', 'node child')
        .on('click', (event) => {
          if (child && child.id) {
            handleNodeClick(event, child)
          }
        })
        .on('dblclick', () => {
          if (child && child.id) {
            handleNodeDblClick(child)
          }
        })
        .on('mouseenter', (event) => handleNodeMouseEnter(event, child))
        .on('mouseleave', handleNodeMouseLeave)

      childNode
        .append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .attr('fill', colors.child.bg)
        .attr('stroke', colors.child.stroke)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.3)

      childNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .attr('fill', colors.child.text)
        .attr('fill-opacity', colors.child.opacity)
        .attr('font-weight', '500')
        .text(child.address)

      childNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('fill', colors.child.text)
        .attr('fill-opacity', colors.child.opacity)
        .attr('font-size', '0.9em')
        .text(getNodeTitle(child))
    })

    // 在最后一列添加"更多"按钮（如还有更多节点）
    if (column === totalColumns - 1 && currentVisibleCount.value < totalChildren) {
      const hiddenCount = totalChildren - currentVisibleCount.value
      const moreY = (columnChildren.length / 2) * verticalGap + 30

      const moreNode = nodesGroup
        .append('g')
        .attr('transform', `translate(${columnX},${moreY})`)
        .attr('class', 'node more-indicator')
        .on('click', () => {
          // 增加一列的显示数量
          currentVisibleCount.value += MAX_VISIBLE_CHILDREN
          // 重新渲染
          renderHierarchyTree()
          // 滚动到新的列
          nextTick(() => {
            if (containerRef.value) {
              containerRef.value.scrollTo({
                left: containerRef.value.scrollWidth,
                behavior: 'smooth'
              })
            }
          })
        })

      // 添加半透明背景
      moreNode
        .append('rect')
        .attr('x', -40)
        .attr('y', -15)
        .attr('width', 80)
        .attr('height', 30)
        .attr('rx', 15)
        .attr('ry', 15)
        .attr('fill', 'var(--color-primary)')
        .attr('fill-opacity', 0.1)
        .attr('stroke', 'var(--color-primary)')
        .attr('stroke-opacity', 0.2)
        .attr('stroke-width', 1)

      // 添加文字
      moreNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', 'var(--color-primary)')
        .attr('font-size', '12px')
        .text(`还有 ${hiddenCount} 个`)
    }
  }
}

// 在 script setup 中添加 viewNoteContext 函数
const viewNoteContext = (noteId: string) => {
  router.push({
    name: 'cardbox',
    query: {
      mode: 'context',
      noteId: noteId
    }
  })
}

// 修改 handleNodeClick 函数
const handleNodeClick = (event: MouseEvent, note: Note | undefined | null) => {
  if (!note || !note.id) {
    console.warn('无效的笔记节点:', note)
    return
  }

  // 阻止事件冒泡
  event.preventDefault()
  event.stopPropagation()

  if (event.shiftKey) {
    // Shift+点击：在知识树中查看节点
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: note.address },
      replace: true
    })
  } else if (event.altKey) {
    // Option/Alt+点击：在卡片盒中查看上下文
    viewNoteContext(note.id)
  } else if (event.metaKey || event.ctrlKey) {
    // Command/Ctrl+点击：使用展开编辑器
    router.push({
      name: 'NoteExpandEditor',
      params: { id: note.id }
    })
  }
}

// 添加双击处理方法
const handleNodeDblClick = (note: Note | undefined | null) => {
  if (!note || !note.id) return
  useNoteStore().openNoteEditor(note.id)
}

watch(
  () => localTreeStore.treeData,
  () => {
    // console.log('Tree data updated:', newData) // 检查树形数据更新
    renderHierarchyTree()
  }
)

watch(
  () => props.noteId,
  async (newId) => {
    if (newId) {
      currentVisibleCount.value = MAX_VISIBLE_CHILDREN // 重置显示数量
      await localTreeStore.fetchLocalTree(newId)
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
  renderHierarchyTree()
})

// 修改节点悬停效果的样式
const style = document.createElement('style')
style.textContent = `
  .node {
    cursor: pointer;  // 添加鼠标指针样式
  }
  .node rect {
    transition: all 0.3s ease;
  }
  .node:hover rect {
    filter: brightness(1.1);
    transform: scale(1.05);
  }
  .more-indicator {
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.3s ease;
  }
  .more-indicator:hover {
    opacity: 1;
  }
`
document.head.appendChild(style)

// 修改 SVG 宽度计算
const svgWidth = computed(() => {
  if (!localTreeStore.treeData) return width
  const totalColumns = Math.ceil(currentVisibleCount.value / MAX_VISIBLE_CHILDREN)
  return Math.max(horizontalGap * 2 + COLUMN_GAP * (totalColumns - 1) + 150, width)
})

// 修改预览相关的响应式变量
const showPreview = ref(false)
const previewNoteId = ref<string | null>(null)

// 修改预览相关的方法
const panelRef = ref<HTMLElement | null>(null)

// 添加 referenceEl 用于定位
const referenceEl = ref<HTMLElement | null>(null)

const handleNodeMouseEnter = (event: MouseEvent, note: Note) => {
  if (!note.id) return

  // 保存当前悬浮的元素引用
  referenceEl.value = event.target as HTMLElement
  previewNoteId.value = note.id
  showPreview.value = true
}

const handleNodeMouseLeave = () => {
  showPreview.value = false
  previewNoteId.value = null
}

// 添加新的处理函数专门用于处理列表选择
// const handleListSelect = (note: Note) => {
//   if (!note || !note.id) return
//   router.push({
//     name: 'NoteExpandEditor',
//     params: { id: note.id }
//   })
// }
</script>

<style lang="scss" scoped>
.hierarchy-tree-panel {
  position: relative; // 添加相对定位
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
    // padding: 12px 0;
    // background: var(--color-bg-secondary);
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    min-height: 600px;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    position: relative;

    &::-webkit-scrollbar {
      height: 6px;
      width: 0;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-border);
      border-radius: 3px;

      &:hover {
        background: var(--color-text-secondary);
      }
    }

    .tree-graph {
      height: 100%;
      flex-shrink: 0;
    }
  }
}
</style>
