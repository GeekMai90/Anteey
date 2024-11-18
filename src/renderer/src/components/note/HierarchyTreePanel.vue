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

    <div v-show="!isCollapsed" ref="containerRef" class="tree-container">
      <svg ref="svgRef" class="tree-graph" :width="svgWidth" :height="height"></svg>
    </div>

    <NoteListDialog
      :visible="showNoteList"
      :notes="allChildren"
      @close="showNoteList = false"
      @select="handleNodeClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import { BranchTwo } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useLocalTreeStore } from '@renderer/stores/localTreeStore'
import * as d3 from 'd3'
import type { Note } from '@renderer/types/Note'
import NoteListDialog from './NoteListDialog.vue'

const props = defineProps<{
  noteId: string
}>()

const router = useRouter()
const localTreeStore = useLocalTreeStore()
const isCollapsed = ref(true)
const svgRef = ref<SVGElement>()
const showNoteList = ref(false)
const allChildren = ref<Note[]>([])

const width = 800
const height = 500
const nodeWidth = 80
const nodeHeight = 50
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
    bg: 'var(--color-primary)', // 使用主题色 #00c8a8
    text: '#FFFFFF',
    stroke: '#00b398' // 稍深的青绿色作为描边
  },
  parent: {
    bg: 'var(--color-blue)', // 使用主题蓝色 #4361ee
    text: '#FFFFFF',
    stroke: '#3b56d4' // 稍深的蓝色作为描边
  },
  sibling: {
    bg: 'var(--color-yellow)', // 使用主题黄色 #ff9f1c
    text: '#FFFFFF',
    stroke: '#e58f19' // 稍深的黄色作为描边
  },
  child: {
    bg: 'var(--color-pink)', // 使用主题粉色 #f72585
    text: '#FFFFFF',
    stroke: '#de2177' // 稍深的粉色作为描边
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

const renderHierarchyTree = () => {
  if (!svgRef.value || !localTreeStore.treeData) return

  const svg = d3.select(svgRef.value)

  // 清空现有内容
  svg.selectAll('*').remove()

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
    .on('click', () => {
      if (currentNote && currentNote.id) {
        handleNodeClick(currentNote)
      }
    })

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

  currentNode
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .attr('fill', colors.current.text)
    .text(currentNote.address)

  // 绘制父节点（在左侧）
  if (treeData.parent) {
    // 画连接线
    linesGroup
      .append('line')
      .attr('x1', -horizontalGap + nodeWidth / 2)
      .attr('y1', 0)
      .attr('x2', -nodeWidth / 2)
      .attr('y2', 0)
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 2)

    // 画节点
    const parentNode = nodesGroup
      .append('g')
      .attr('transform', `translate(${-horizontalGap},0)`)
      .attr('class', 'node parent')
      .on('click', () => {
        if (treeData.parent) {
          handleNodeClick(treeData.parent)
        }
      })

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
      .attr('stroke-width', 2)

    parentNode
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', colors.parent.text)
      .text(treeData.parent.address)
  }

  // 修改兄弟节点的渲染部分
  if (treeData.siblings.length > 0) {
    // 对兄弟节点进行排序，创建新数组避免修改原数组
    const sortedSiblings = [...treeData.siblings].sort(compareAddresses)
    console.log('排序后的兄弟节点:', sortedSiblings)

    // 获取当前节点的数字和字母部分
    const currentMatch = currentNote.address
      .split('-')
      .pop()
      ?.match(/^(\d+)([a-z]*)$/)
    const currentNum = currentMatch ? parseInt(currentMatch[1]) : 0
    const currentAlpha = currentMatch ? currentMatch[2] : ''

    // 找到前一个和后一个节点
    let prevSibling = null
    let nextSibling = null

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

      // 判断是否为前一个节点
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

    console.log('前一个节点:', prevSibling)
    console.log('后一个节点:', nextSibling)

    // 绘制前一个节点（上方）
    if (prevSibling) {
      // 画连接线
      linesGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', nodeHeight / 2)
        .attr('x2', 0)
        .attr('y2', -verticalGap + nodeHeight / 2)
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-width', 2)

      // 画节点
      const prevNode = nodesGroup
        .append('g')
        .attr('transform', `translate(0,${-verticalGap})`)
        .attr('class', 'node sibling')
        .on('click', () => handleNodeClick(prevSibling))

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
        .attr('stroke-width', 2)

      prevNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', colors.sibling.text)
        .text(prevSibling.address)
    }

    // 绘制后一个节点（下方）
    if (nextSibling) {
      // 画连接线
      linesGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', nodeHeight / 2)
        .attr('x2', 0)
        .attr('y2', verticalGap - nodeHeight / 2)
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-width', 2)

      // 画节点
      const nextNode = nodesGroup
        .append('g')
        .attr('transform', `translate(0,${verticalGap})`)
        .attr('class', 'node sibling')
        .on('click', () => handleNodeClick(nextSibling))

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
        .attr('stroke-width', 2)

      nextNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', colors.sibling.text)
        .text(nextSibling.address)
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
        .attr('stroke-opacity', 0.2)
        .attr('stroke-dasharray', '4,4')

      // 画节点
      const childNode = nodesGroup
        .append('g')
        .attr('transform', `translate(${columnX},${childY})`)
        .attr('class', 'node child')
        .on('click', () => {
          if (child && child.id) {
            handleNodeClick(child)
          }
        })

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
        .attr('stroke-width', 2)

      childNode
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', colors.child.text)
        .text(child.address)
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

const handleNodeClick = (note: Note | undefined | null) => {
  if (!note || !note.id) {
    console.warn('无效的笔记节点:', note)
    return
  }

  router.push({
    name: 'NoteExpandEditor',
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
      currentVisibleCount.value = MAX_VISIBLE_CHILDREN // 重置显示数量
      await localTreeStore.fetchLocalTree(newId)
    }
  },
  { immediate: true }
)

onMounted(() => {
  renderHierarchyTree()
})

// 添加节点悬停效果
const style = document.createElement('style')
style.textContent = `
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
  return horizontalGap * 2 + COLUMN_GAP * (totalColumns - 1) + 150
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
    padding: 32px;
    background: var(--color-bg-secondary);
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
