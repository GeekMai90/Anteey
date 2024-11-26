<template>
  <div class="knowledge-tree-container">
    <KnowledgeBreadcrumb />
    <KnowledgeTreeToolbar
      :scale="scale"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset-view="handleResetView"
    />
    <div ref="container" class="jsmind-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// import 'jsmind/style/jsmind.css'
import '../../styles/jsmind-antinet-theme.css'
import jsMind from 'jsmind'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@renderer/types/knowledgeTree'
import KnowledgeTreeToolbar from './KnowledgeTreeToolbar.vue'
import KnowledgeBreadcrumb from './KnowledgeBreadcrumb.vue'

// 直接在组件中定义类型
interface JsMindOptions {
  container: HTMLElement
  theme?: string
  editable?: boolean
  mode?: 'full' | 'side'
  view?: {
    engine?: 'canvas' | 'svg'
    hmargin?: number
    vmargin?: number
    line_width?: number
    line_color?: string
  }
  layout?: {
    hspace?: number
    vspace?: number
    pspace?: number
  }
  shortcut?: {
    enable?: boolean
    handles?: Record<string, string>
  }
  support_html?: boolean
}

interface JsMindNode {
  id: string
  topic: string
  children?: JsMindNode[]
  expanded?: boolean
  direction?: string
  data?: Record<string, any>
}

interface JsMindData {
  meta: {
    name: string
    version: string
  }
  format: string
  data: JsMindNode
}

const knowledgeTreeStore = useKnowledgeTreeStore()
const container = ref<HTMLDivElement>()
const jm = ref<any>(null)
const scale = ref(1)

// 转换数据为 JsMind 格式
const transformToJsMindData = (nodes: KnowledgeTreeNode[]): JsMindData => {
  const processNode = (node: KnowledgeTreeNode): JsMindNode | null => {
    if (!node) return null

    console.log('处理节点:', node)

    const jsMindNode: JsMindNode = {
      id: node.address,
      topic: `<div class="node-content">
              <div class="node-address">${node.address || ''}</div>
              <div class="node-title">${node.title || ''}</div>
            </div>`,
      children: (node.children || [])
        .map((child) => processNode(child))
        .filter((node): node is JsMindNode => node !== null),
      expanded: knowledgeTreeStore.viewState.isInFocusMode || node.isExpanded === true,
      direction: 'right',
      data: {
        childCount: node.childCount || 0,
        level: node.level || 0
      }
    }

    return jsMindNode
  }

  // 检查是否在聚焦模式
  if (knowledgeTreeStore.viewState.isInFocusMode && knowledgeTreeStore.focusedNode) {
    console.log('聚焦模式下的节点:', knowledgeTreeStore.focusedNode)
    const processedNode = processNode(knowledgeTreeStore.focusedNode)
    if (!processedNode) {
      throw new Error('Failed to process focused node')
    }

    return {
      meta: {
        name: 'knowledge-tree',
        version: '1.0'
      },
      format: 'node_tree',
      data: processedNode
    }
  }

  // 非聚焦模式
  return {
    meta: {
      name: 'knowledge-tree',
      version: '1.0'
    },
    format: 'node_tree',
    data: {
      id: 'root',
      topic: `<div class="node-content">
              <div class="node-address">Antinet</div>
              <div class="node-title">Zettelkasten</div>
            </div>`,
      children: nodes
        .map((node) => processNode(node))
        .filter((node): node is JsMindNode => node !== null),
      expanded: true,
      direction: 'right',
      data: {
        level: -1
      }
    }
  }
}

// 初始化 JsMind
const initJsMind = async () => {
  if (!container.value) return

  const options: JsMindOptions = {
    container: container.value,
    theme: 'antinet',
    editable: false,
    mode: 'side',
    view: {
      engine: 'canvas',
      hmargin: 100,
      vmargin: 50,
      line_width: 2,
      line_color: '#555'
    },
    layout: {
      hspace: 30,
      vspace: 20,
      pspace: 13
    },
    shortcut: {
      enable: true,
      handles: {
        space: 'toggle_node',
        return: 'select_node'
      }
    },
    support_html: true
  }

  try {
    jm.value = new jsMind(options)

    if (jm.value) {
      await knowledgeTreeStore.fetchTopLevelNodes()
      const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
      jm.value.show(jsMindData)

      // 在显示数据后，手动展开所有标记为展开的节点
      if (knowledgeTreeStore.viewState.isInFocusMode) {
        const root = jm.value.get_root()
        if (root) {
          // 展开根节点
          jm.value.expand_node(root.id)
          // 展开所有子节点
          const children = jm.value.get_node(root.id).children
          if (children) {
            children.forEach((child: any) => {
              jm.value.expand_node(child.id)
            })
          }
        }
      }

      // 添加事件监听器
      const jmnodes = container.value.querySelectorAll('jmnode')
      console.log('找到的节点数量:', jmnodes.length)

      jmnodes.forEach((node) => {
        node.addEventListener('dblclick', ((e: Event) => {
          console.log('节点被双击:', e.target)
          if (e instanceof MouseEvent) {
            handleNodeDblClick(e)
          }
        }) as EventListener)
      })
    }
  } catch (error) {
    console.error('Failed to initialize jsMind:', error)
  }
}

// 修改双击处理函数
const handleNodeDblClick = (e: MouseEvent) => {
  console.log('handleNodeDblClick 被调用')
  if (!jm.value) return

  const element = e.target as HTMLElement
  console.log('点击的元素:', element)

  // 向上查找最近的 jmnode 元素
  const jmnodeElement = element.closest('jmnode')
  if (!jmnodeElement) {
    console.log('未找到 jmnode 元素')
    return
  }

  const nodeId = jmnodeElement.getAttribute('nodeid')
  console.log('找到的 nodeId:', nodeId)

  if (nodeId) {
    // 如果是当前聚焦的根节点，则返回上一层
    if (
      knowledgeTreeStore.viewState.isInFocusMode &&
      nodeId === knowledgeTreeStore.focusedNode?.address
    ) {
      console.log('双击根节点，返回上一层')
      knowledgeTreeStore.backToParent()
    } else {
      // 其他节点保持原有的聚焦行为
      const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
      if (treeNode) {
        console.log('找到对应的树节点:', treeNode)
        knowledgeTreeStore.focusNodeWithChildren(treeNode)
      }
    }
  }
}

// 缩放控制
const handleZoomIn = () => {
  if (jm.value) {
    scale.value *= 1.1
    jm.value.view.zoom_in()
  }
}

const handleZoomOut = () => {
  if (jm.value) {
    scale.value *= 0.9
    jm.value.view.zoom_out()
  }
}

const handleResetView = () => {
  if (jm.value) {
    scale.value = 1
    jm.value.view.reset()
  }
}

// 修改 watch 部分
watch(
  () => knowledgeTreeStore.nodes,
  () => {
    if (jm.value) {
      console.log('节点数据更新:', knowledgeTreeStore.nodes)
      const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
      console.log('转换后的 jsMind 数据:', jsMindData)

      // 直接显示新数据，jsMind 会自动清除旧数据
      jm.value.show(jsMindData)

      // 确保所有节点都展开
      setTimeout(() => {
        try {
          const expandAllNodes = (nodeId: string) => {
            const node = jm.value.get_node(nodeId)
            if (node) {
              jm.value.expand_node(nodeId)
              if (node.children) {
                node.children.forEach((child: any) => {
                  expandAllNodes(child.id)
                })
              }
            }
          }

          // 从根节点开始展开所有节点
          const root = jm.value.get_root()
          if (root) {
            expandAllNodes(root.id)
          }

          // 重新绑定事件
          const jmnodes = container.value?.querySelectorAll('jmnode')
          console.log('节点更新后，找到的节点数量:', jmnodes?.length)

          jmnodes?.forEach((node) => {
            node.addEventListener('dblclick', ((e: Event) => {
              console.log('节点被双击:', e.target)
              if (e instanceof MouseEvent) {
                handleNodeDblClick(e)
              }
            }) as EventListener)
          })
        } catch (error) {
          console.error('展开节点时发生错误:', error)
        }
      }, 100) // 给一点时间让 jsMind 渲染完成
    }
  },
  { deep: true }
)

// 生命周期钩子
onMounted(() => {
  initJsMind()
})
</script>

<style scoped>
.knowledge-tree-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.jsmind-container {
  flex: 1;
  overflow: hidden;
  background-color: #ffffff;
}

:deep(.jsmind-inner) {
  width: 100% !important;
  height: 100% !important;
}
/* 节点地址样式 */
:deep(.node-address) {
  font-size: 0.9em;
  color: var(--color-text-primary); /* 使用变量或直接使用颜色值 */
  text-align: center;
}

/* 节点标题样式 */
:deep(.node-title) {
  color: var(--color-text-primary);
}

/* 根节点特殊样式 */
:deep(jmnode.root .node-address),
:deep(jmnode.root .node-title) {
  color: white;
}
</style>
