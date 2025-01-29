<template>
  <div class="knowledge-tree-container">
    <!-- 顶部工具栏组件 -->
    <AppToolbar />
    <!-- 思维导图容器 -->
    <div ref="container" class="jsmind-container"></div>
  </div>
</template>

<script setup lang="ts">
// 导入必要的 Vue 组件和工具
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import '../styles/jsmind-antinet-theme.css'
import jsMind from 'jsmind'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@shared/types'
import AppToolbar from '../components/layout/AppToolbar.vue'
import { useRoute } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'

const route = useRoute()
const noteStore = useNoteStore()
const uiStore = useUIStore()

// 定义 jsMind 配置选项接口
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
    line_style?: 'bezier' | 'straight'
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

// 定义思维导图节点接口
interface JsMindNode {
  id: string
  topic: string
  children: JsMindNode[] // 移除可选标记
  expanded: boolean // 移除可选标记
  direction: string // 移除可选标记
  data: {
    childCount: number
    level: number
    noteId: string | null | undefined
  }
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

// 转换数据为 JsMind 格式
const transformToJsMindData = (nodes: KnowledgeTreeNode[]): JsMindData => {
  const processNode = (node: KnowledgeTreeNode): JsMindNode => {
    if (!node) {
      throw new Error('Node cannot be null')
    }

    const hasChildren = node.childCount > 0
    return {
      id: node.address,
      topic: `<div class="node-content">
                <div class="node-content-wrapper">
                  <div class="node-address">${node.address || ''}</div>
                  <div class="node-title">${node.title || ''}</div>
                </div>
                ${
                  hasChildren
                    ? `<div class="node-expand-btn" data-address="${node.address}">
                            +
                       </div>`
                    : ''
                }
              </div>`,
      children: node.isExpanded ? (node.children || []).map((child) => processNode(child)) : [],
      expanded: node.isExpanded || false,
      direction: 'right',
      data: {
        childCount: node.childCount || 0,
        level: node.level || 0,
        noteId: node.noteId
      }
    }
  }

  // 非聚焦模式的根节点
  const rootNode: JsMindNode = {
    id: 'root',
    topic: `<div class="node-content">
              <div class="node-content-wrapper">
                <div class="node-address">Anteey</div>
                <div class="node-title">Zettelkasten</div>
              </div>
            </div>`,
    children: nodes.map((node) => processNode(node)),
    expanded: true,
    direction: 'right',
    data: {
      childCount: nodes.length,
      level: -1,
      noteId: null
    }
  }

  // 检查是否在聚焦模式
  if (knowledgeTreeStore.viewState.isInFocusMode && knowledgeTreeStore.focusedNode) {
    const processedNode = processNode(knowledgeTreeStore.focusedNode)
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
    data: rootNode
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
      engine: 'svg',
      hmargin: 100,
      vmargin: 50,
      line_width: 1.5,
      line_color: 'var(--color-line)',
      line_style: 'bezier'
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
      // console.log('找到的节点数量:', jmnodes.length)

      jmnodes.forEach((node) => {
        // 添加单击事件
        node.addEventListener('click', ((e: Event) => {
          if (e instanceof MouseEvent) {
            handleNodeClick(e)
          }
        }) as EventListener)
        node.addEventListener('dblclick', ((e: Event) => {
          // console.log('节点被双击:', e.target)
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

// 修改事件处理函数
const handleNodeClick = async (e: MouseEvent) => {
  if (!jm.value) return

  const element = e.target as HTMLElement

  // 处理展开/折叠按钮点击
  if (element.classList.contains('node-expand-btn')) {
    e.stopPropagation()
    const address = element.getAttribute('data-address')
    if (address) {
      const node = knowledgeTreeStore.findNodeByAddress(address)
      if (node) {
        if (!node.isExpanded) {
          // 加载并展开节点
          const childNodes = await knowledgeTreeStore.fetchChildNodes(address)
          node.children = childNodes
          node.isExpanded = true

          // 更新视图并展开节点
          const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
          jm.value.show(jsMindData)

          // 只展开当前点击的节点
          requestAnimationFrame(() => {
            const clickedNode = jm.value.get_node(address)
            if (clickedNode) {
              jm.value.expand_node(address)
              // 将视图中心移动到展开的节点
              jm.value.select_node(address)
            }
          })
        } else {
          // 折叠节点
          node.isExpanded = false
          // 直接折叠当前节点
          jm.value.collapse_node(address)
        }
      }
    }
    return
  }

  // 原有的节点点击预览逻辑
  const jmnodeElement = element.closest('jmnode')
  if (jmnodeElement) {
    const nodeId = jmnodeElement.getAttribute('nodeid')
    if (nodeId) {
      const node = jm.value.get_node(nodeId)
      if (node && node.data && node.data.data.noteId) {
        noteStore.openBacklinkPreview(node.data.data.noteId)
        uiStore.openRightSidebarWithTab('backlink')
      }
    }
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
    if (knowledgeTreeStore.viewState.isInFocusMode) {
      if (nodeId === knowledgeTreeStore.focusedNode?.address) {
        console.log('双击根节点，返回上一层')
        // 如果是第一层级节点（如1000），则返回到 Antinet Zettelkasten 根节点
        if (nodeId.endsWith('000')) {
          console.log('返回到 Antinet Zettelkasten 根节点')
          knowledgeTreeStore.viewState.isInFocusMode = false
          knowledgeTreeStore.focusedNode = null
          knowledgeTreeStore.parentPath = []
          knowledgeTreeStore.fetchTopLevelNodes()
        } else {
          knowledgeTreeStore.backToParent()
        }
      } else {
        // 其他节点保持原有的聚焦行为
        const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
        if (treeNode) {
          console.log('找到对应的树节点:', treeNode)
          knowledgeTreeStore.focusNodeWithChildren(treeNode)
        }
      }
    } else {
      // 非聚焦模式下，聚焦到点击的节点
      const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
      if (treeNode) {
        console.log('找到对应的树节点:', treeNode)
        knowledgeTreeStore.focusNodeWithChildren(treeNode)
      }
    }
  }
}

// 缩放控制
// const handleZoomIn = () => {
//   if (jm.value) {
//     scale.value *= 1.1
//     jm.value.view.zoom_in()
//   }
// }

// const handleZoomOut = () => {
//   if (jm.value) {
//     scale.value *= 0.9
//     jm.value.view.zoom_out()
//   }
// }

// const handleResetView = () => {
//   if (jm.value) {
//     scale.value = 1
//     jm.value.view.reset()
//   }
// }

// 修改 watch 部分
watch(
  () => knowledgeTreeStore.nodes,
  () => {
    if (jm.value) {
      // console.log('节点数据更新:', knowledgeTreeStore.nodes)
      const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
      // console.log('转换后的 jsMind 数据:', jsMindData)

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
            // 重新绑定单击事件
            node.addEventListener('click', ((e: Event) => {
              if (e instanceof MouseEvent) {
                handleNodeClick(e)
              }
            }) as EventListener)
            // 重新绑定双击事件
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

// 添加导航辅助函数
const navigateToNode = async (address: string) => {
  console.log('开始导航到节点:', address)
  const node = await knowledgeTreeStore.findNodeByAddress(address)
  if (node) {
    // 确保节点有正确的 id
    const nodeWithId = {
      ...node,
      id: node.address
    }
    await knowledgeTreeStore.focusNodeWithChildren(nodeWithId)
    return true
  }
  return false
}

// 监听路由参数变化
watch(
  () => route.params.address,
  async (newAddress) => {
    if (newAddress) {
      try {
        const address = newAddress as string
        console.log('准备导航到地址:', address)

        // 重置视图状态
        await knowledgeTreeStore.resetViewState()

        // 构建导航路径
        const navigationPath: string[] = []
        if (address.includes('-')) {
          // 分支编码 (如 1212-1 或 1212-1-1)
          const parts = address.split('-')
          const baseAddress = parts[0]

          // 添加顶层节点 (1000)
          navigationPath.push(`${baseAddress[0]}000`)
          // 添加二级节点 (1200)
          navigationPath.push(`${baseAddress.slice(0, 2)}00`)
          // 添加基础节点 (1212)
          navigationPath.push(baseAddress)

          // 逐步构建分支路径
          let currentPath = baseAddress
          for (let i = 1; i < parts.length; i++) {
            currentPath += `-${parts[i]}`
            navigationPath.push(currentPath)
          }
        } else {
          // 基础编码 (如 1212)
          if (address.length === 4) {
            // 添加顶层节点 (1000)
            navigationPath.push(`${address[0]}000`)
            // 添加二级节点 (1200)
            navigationPath.push(`${address.slice(0, 2)}00`)
            // 添加目标节点 (1212)
            navigationPath.push(address)
          }
        }

        console.log('导航路径:', navigationPath)

        // 按顺序执行导航
        for (const pathAddress of navigationPath) {
          const success = await navigateToNode(pathAddress)
          if (!success) {
            console.error('导航失败，找不到节点:', pathAddress)
            break
          }
          // 等待一小段时间确保节点加载完成
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error('导航到节点失败:', error)
      }
    }
  },
  { immediate: true }
)

// 生命周期钩子
onMounted(() => {
  initJsMind()
})

// 添加组件卸载前的清理工作
onBeforeUnmount(() => {
  // 关闭右侧边栏
  uiStore.closeRightSidebar()
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
  background-color: var(--color-bg-primary);
}

:deep(.jsmind-inner) {
  width: 100% !important;
  height: 100% !important;
}

/* 节点样式 */
:deep(.node-wrapper) {
  position: relative;
  display: flex;
  align-items: center;
}

:deep(.node-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

:deep(.node-content-wrapper) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
}

:deep(.node-address) {
  font-size: 0.9em;
  color: var(--color-text-primary);
  text-align: center;
}

:deep(.node-title) {
  color: var(--color-text-primary);
  text-align: center;
}

/* 展开按钮样式 */
:deep(.node-expand-btn) {
  position: relative;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-bg-secondary);
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  color: var(--color-text-primary);
  padding: 0;
  opacity: 0.8;
  transition: all 0.2s ease;
  user-select: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 2px;
}

:deep(.node-expand-btn:hover) {
  /* background: var(--color-primary-light); */
  color: var(--color-primary);
  opacity: 1;
  transform: scale(1.1);
}
</style>
