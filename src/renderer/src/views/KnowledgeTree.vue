<template>
  <div class="knowledge-tree-container">
    <AppToolbar />
    <div ref="container" class="jsmind-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// import 'jsmind/style/jsmind.css'
import '../styles/jsmind-antinet-theme.css'
import jsMind from 'jsmind'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@renderer/types/knowledgeTree'
import AppToolbar from '../components/layout/AppToolbar.vue'
import { useRoute } from 'vue-router'
import { message } from '../utils/message'
import { useNoteStore } from '../stores/noteStores'
import { useUIStore } from '../stores/useUIStore'

const route = useRoute()
const noteStore = useNoteStore()
const uiStore = useUIStore()
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
// const transformToJsMindData = (nodes: KnowledgeTreeNode[]): JsMindData => {
//   const processNode = (node: KnowledgeTreeNode): JsMindNode => {
//     if (!node) {
//       throw new Error('Node cannot be null')
//     }

//     // 处理子节点
//     const processedChildren = (node.children || []).map((child) => {
//       if (!child) {
//         throw new Error('Child node cannot be null')
//       }
//       return {
//         id: child.address,
//         topic: `<div class="node-content">
//                   <div class="node-address">${child.address || ''}</div>
//                   <div class="node-title">${child.title || ''}</div>
//                 </div>`,
//         children: (child.children || []).map((grandChild) => processNode(grandChild)),
//         expanded: knowledgeTreeStore.viewState.isInFocusMode || child.isExpanded === true,
//         direction: 'right',
//         data: {
//           childCount: child.childCount || 0,
//           level: child.level || 0,
//           noteId: child.noteId
//         }
//       } as JsMindNode
//     })

//     return {
//       id: node.address,
//       topic: `<div class="node-content">
//               <div class="node-address">${node.address || ''}</div>
//               <div class="node-title">${node.title || ''}</div>
//             </div>`,
//       children: processedChildren,
//       expanded: knowledgeTreeStore.viewState.isInFocusMode || node.isExpanded === true,
//       direction: 'right',
//       data: {
//         childCount: node.childCount || 0,
//         level: node.level || 0,
//         noteId: node.noteId
//       }
//     }
//   }

//   // 非聚焦模式的根节点
//   const rootNode: JsMindNode = {
//     id: 'root',
//     topic: `<div class="node-content">
//             <div class="node-address">Antinet</div>
//             <div class="node-title">Zettelkasten</div>
//           </div>`,
//     children: nodes.map((node) => processNode(node)),
//     expanded: true,
//     direction: 'right',
//     data: {
//       childCount: 0, // 添加必需的 childCount
//       level: -1,
//       noteId: null
//     }
//   }

//   // 检查是否在聚焦模式
//   if (knowledgeTreeStore.viewState.isInFocusMode && knowledgeTreeStore.focusedNode) {
//     const processedNode = processNode(knowledgeTreeStore.focusedNode)
//     return {
//       meta: {
//         name: 'knowledge-tree',
//         version: '1.0'
//       },
//       format: 'node_tree',
//       data: processedNode
//     }
//   }

//   // 非聚焦模式
//   return {
//     meta: {
//       name: 'knowledge-tree',
//       version: '1.0'
//     },
//     format: 'node_tree',
//     data: rootNode
//   }
// }
const transformToJsMindData = (nodes: KnowledgeTreeNode[]): JsMindData => {
  const processNode = (node: KnowledgeTreeNode): JsMindNode => {
    if (!node) {
      throw new Error('Node cannot be null')
    }

    // 处理子节点
    const processedChildren = (node.children || []).map((child) => {
      if (!child) {
        throw new Error('Child node cannot be null')
      }
      const hasChildren = child.childCount > 0
      return {
        id: child.address,
        topic: `<div class="node-content ${hasChildren ? 'has-children' : ''}">
                  <div class="node-address">${child.address || ''}</div>
                  <div class="node-title">${child.title || ''}</div>
                  ${hasChildren ? '<div class="children-indicator"></div>' : ''}
                </div>`,
        children: (child.children || []).map((grandChild) => processNode(grandChild)),
        expanded: knowledgeTreeStore.viewState.isInFocusMode || child.isExpanded === true,
        direction: 'right',
        data: {
          childCount: child.childCount || 0,
          level: child.level || 0,
          noteId: child.noteId
        }
      } as JsMindNode
    })

    const hasChildren = node.childCount > 0
    return {
      id: node.address,
      topic: `<div class="node-content ${hasChildren ? 'has-children' : ''}">
              <div class="node-address">${node.address || ''}</div>
              <div class="node-title">${node.title || ''}</div>
              ${hasChildren ? '<div class="children-indicator"></div>' : ''}
            </div>`,
      children: processedChildren,
      expanded: knowledgeTreeStore.viewState.isInFocusMode || node.isExpanded === true,
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
    topic: `<div class="node-content root-node">
            <div class="node-address">Antinet</div>
            <div class="node-title">Zettelkasten</div>
            <div class="children-indicator"></div>
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
      console.log('找到的节点数量:', jmnodes.length)

      jmnodes.forEach((node) => {
        // 添加单击事件
        node.addEventListener('click', ((e: Event) => {
          if (e instanceof MouseEvent) {
            handleNodeClick(e)
          }
        }) as EventListener)
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

// 添加单击处理函数
const handleNodeClick = (e: MouseEvent) => {
  console.log('handleNodeClick 被调用')
  if (!jm.value) return

  const element = e.target as HTMLElement
  const jmnodeElement = element.closest('jmnode')
  console.log('找到的 jmnode 元素:', jmnodeElement)
  if (!jmnodeElement) return

  const nodeId = jmnodeElement.getAttribute('nodeid')
  console.log('找到的 nodeId:', nodeId)
  if (nodeId) {
    // 从 jsMind 实例中获取节点数据
    const node = jm.value.get_node(nodeId)
    console.log('获取到的节点数据:', node)
    if (node && node.data && node.data.data.noteId) {
      console.log('找到的 noteId:', node.data.data.noteId)
      // 使用 noteId 打开预览
      noteStore.openBacklinkPreview(node.data.data.noteId)
      uiStore.openRightSidebarWithTab('backlink')
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
    // 检查是否是最底层节点（包含两个'-'）
    if (nodeId.split('-').length > 2) {
      message.warning('已经是最底层节点了')
      return
    }
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

// 监听路由参数变化
// 监听路由参数变化
// watch(
//   () => route.params.address,
//   async (newAddress) => {
//     if (newAddress) {
//       console.log('路由参数变化:', newAddress)
//       try {
//         // 1. 先获取顶层节点
//         await knowledgeTreeStore.fetchTopLevelNodes()

//         // 2. 然后再聚焦到目标节点
//         const node = await knowledgeTreeStore.findNodeByAddress(newAddress as string)
//         if (node) {
//           await knowledgeTreeStore.focusNodeWithChildren(node)
//         }
//       } catch (error) {
//         console.error('导航到节点失败:', error)
//       }
//     }
//   },
//   { immediate: true }
// )
// watch(
//   () => route.params.address,
//   async (newAddress) => {
//     if (newAddress) {
//       try {
//         const address = newAddress as string

//         // 如果是分支节点（包含 '-'），先找到其父节点
//         if (address.includes('-')) {
//           const parentAddress = address.split('-')[0]
//           console.log('找到父节点地址:', parentAddress)

//           // 1. 先聚焦到父节点
//           const parentNode = await knowledgeTreeStore.findNodeByAddress(parentAddress)
//           if (parentNode) {
//             await knowledgeTreeStore.focusNodeWithChildren(parentNode)

//             // 2. 然后找到并聚焦到目标节点
//             const targetNode = await knowledgeTreeStore.findNodeByAddress(address)
//             if (targetNode) {
//               await knowledgeTreeStore.focusNodeWithChildren(targetNode)
//             }
//           }
//         } else {
//           // 如果是普通节点，直接聚焦
//           const node = await knowledgeTreeStore.findNodeByAddress(address)
//           if (node) {
//             await knowledgeTreeStore.focusNodeWithChildren(node)
//           }
//         }
//       } catch (error) {
//         console.error('导航到节点失败:', error)
//       }
//     }
//   },
//   { immediate: true }
// )
watch(
  () => route.params.address,
  async (newAddress) => {
    if (newAddress) {
      try {
        const address = newAddress as string
        console.log('准备导航到地址:', address)

        // 如果是分支节点（包含 '-'）
        if (address.includes('-')) {
          // 1. 先聚焦到顶层节点（如 1000）
          const topLevelAddress = `${address[0]}000`
          console.log('聚焦顶层节点:', topLevelAddress)
          const topNode = await knowledgeTreeStore.findNodeByAddress(topLevelAddress)
          if (topNode) {
            await knowledgeTreeStore.focusNodeWithChildren(topNode)
          }

          // 2. 再聚焦到二级节点（如 1100）
          const secondLevelAddress = `${address.slice(0, 2)}00`
          console.log('聚焦二级节点:', secondLevelAddress)
          const secondNode = await knowledgeTreeStore.findNodeByAddress(secondLevelAddress)
          if (secondNode) {
            await knowledgeTreeStore.focusNodeWithChildren(secondNode)
          }

          // 3. 聚焦到三级节点（如 1101）
          const thirdLevelAddress = address.split('-')[0]
          console.log('聚焦三级节点:', thirdLevelAddress)
          const thirdNode = await knowledgeTreeStore.findNodeByAddress(thirdLevelAddress)
          if (thirdNode) {
            await knowledgeTreeStore.focusNodeWithChildren(thirdNode)
          }

          // 4. 如果有第一层分支节点（如 1101-1），聚焦到它
          if (address.split('-').length > 1) {
            const firstBranchAddress = `${thirdLevelAddress}-${address.split('-')[1]}`
            console.log('聚焦第一层分支节点:', firstBranchAddress)
            const firstBranchNode = await knowledgeTreeStore.findNodeByAddress(firstBranchAddress)
            if (firstBranchNode) {
              await knowledgeTreeStore.focusNodeWithChildren(firstBranchNode)
            }

            // 5. 如果还有更深层的分支节点（如 1101-1-1），继续聚焦
            if (address.split('-').length > 2) {
              console.log('聚焦最终目标节点:', address)
              const targetNode = await knowledgeTreeStore.findNodeByAddress(address)
              if (targetNode) {
                await knowledgeTreeStore.focusNodeWithChildren(targetNode)
              }
            }
          }
        } else {
          // 如果是普通节点，直接聚焦
          const node = await knowledgeTreeStore.findNodeByAddress(address)
          if (node) {
            await knowledgeTreeStore.focusNodeWithChildren(node)
          }
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
/* 节点地址样式 */
/* :deep(.node-address) {
  font-size: 0.9em;
  color: var(--color-text-primary); 
  text-align: center;
} */

/* 节点标题样式 */
:deep(.node-title) {
  color: var(--color-text-primary);
}

/* 有子节点的节点样式 */
:deep(.node-content.has-children) {
  position: relative;
  /* padding-right: 10px;  */
}

/* 子节点指示器 - 使用小圆点 */
:deep(.children-indicator) {
  position: absolute;
  right: 0px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--color-primary);
}
</style>
