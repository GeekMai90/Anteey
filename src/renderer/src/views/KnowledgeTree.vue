<template>
  <div class="knowledge-tree-container">
    <!-- 顶部工具栏组件 -->
    <AppToolbar />
    <!-- 思维导图容器 -->
    <div ref="container" class="jsmind-container"></div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      ref="contextMenuRef"
      class="context-menu"
      :style="{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`
      }"
    >
      <div class="context-menu-item" @click="handleAddSiblingNode">添加同级节点</div>
      <div class="context-menu-item" @click="handleAddChildNode">添加子节点</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** * @file KnowledgeTree.vue * @description 知识树组件，用于展示和管理卢曼卡片笔记的层级结构 * *
主要功能： * 1. 知识树的可视化展示 * - 使用 jsMind 实现思维导图式的展示 * - 支持节点的展开/折叠 *
-支持节点的聚焦/返回 * 2. 节点交互 * - 单击节点预览笔记内容 * - 双击节点进入聚焦模式 * -
点击展开/折叠按钮管理子节点 * 3. 导航功能 * - 支持通过路由参数直接定位节点 * -
支持通过搜索结果跳转到指定节点 * * @author 麦先生 * @created 2024-03-20 */
// 导入必要的 Vue 组件和工具
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import '../styles/jsmind-antinet-theme.css'
import jsMind from 'jsmind'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@shared/types'
import AppToolbar from '../components/layout/AppToolbar.vue'
import { useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

const route = useRoute()
const router = useRouter()
const noteStore = useNoteStore()
const uiStore = useUIStore()

/**
 * @interface JsMindOptions
 * @description jsMind 插件的配置选项
 * @property {HTMLElement} container 容器元素
 * @property {string} theme 主题
 * @property {boolean} editable 是否可编辑
 * @property {string} mode 显示模式
 * @property {Object} view 视图配置
 * @property {Object} layout 布局配置
 * @property {Object} shortcut 快捷键配置
 */
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
    enable_device_pixel_ratio?: boolean
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

/**
 * @interface JsMindNode
 * @description jsMind 节点数据结构
 * @property {string} id 节点ID
 * @property {string} topic 节点内容
 * @property {JsMindNode[]} children 子节点数组
 * @property {boolean} expanded 是否展开
 * @property {string} direction 节点方向
 * @property {Object} data 节点附加数据
 */
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

/**
 * @interface JsMindData
 * @description jsMind 数据结构
 * @property {Object} meta 元数据
 * @property {string} format 数据格式
 * @property {JsMindNode} data 节点数据
 */
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

// 右键菜单相关变量
const contextMenuVisible = ref(false)
const contextMenuRef = ref<HTMLElement | null>(null)
const referenceRef = ref<Element | null>(null)
const selectedNodeId = ref('')

// 使用 floating-ui 设置菜单定位
const { x, y, update } = useFloating(referenceRef, contextMenuRef, {
  placement: 'right-start',
  middleware: [
    offset(6), // 设置一个小的偏移量，让菜单不会贴得太近
    flip({ padding: 10 }), // 如果空间不够，自动翻转到另一侧
    shift({ padding: 5 }) // 确保菜单不会超出可视区域
  ],
  whileElementsMounted: autoUpdate // 当元素挂载时自动更新位置
})

/**
 * 转换数据为 JsMind 格式
 * @param {KnowledgeTreeNode[]} nodes 知识树节点数组
 * @returns {JsMindData} JsMind 格式的数据
 */
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
                            ${node.isExpanded ? '-' : '+'}
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

/**
 * 处理节点右键点击事件
 * @param {MouseEvent} e 鼠标事件对象
 * @param {string} nodeId 节点ID
 * @description 打开右键菜单
 */
const handleContextMenu = (e: MouseEvent, nodeId: string) => {
  // 阻止默认右键菜单
  e.preventDefault()
  e.stopPropagation()

  // 保存所选节点ID
  selectedNodeId.value = nodeId

  // 获取节点元素作为参考
  const jmnodeElement = (e.target as HTMLElement).closest('jmnode')
  if (!jmnodeElement) return

  // 设置参考元素
  referenceRef.value = jmnodeElement

  // 显示菜单
  contextMenuVisible.value = true

  // 更新菜单位置
  setTimeout(() => {
    update && update()
  }, 0)

  // 添加点击事件监听器，点击其他区域关闭菜单
  document.addEventListener('click', closeContextMenu)

  // 添加滚动事件监听器，滚动时关闭菜单
  document.addEventListener('scroll', closeContextMenu, true)
}

/**
 * 关闭右键菜单
 */
const closeContextMenu = () => {
  contextMenuVisible.value = false
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('scroll', closeContextMenu, true)
}

/**
 * 添加同级节点
 */
const handleAddSiblingNode = async () => {
  try {
    console.log('添加同级节点:', selectedNodeId.value)
    const node = knowledgeTreeStore.findNodeByAddress(selectedNodeId.value)
    if (node && node.noteId) {
      const newNote = await knowledgeTreeStore.createAdjacentNote(node.noteId, 'below')
      // 使用小窗打开新笔记
      noteStore.openNoteEditor(newNote.id)
    }
  } catch (error) {
    console.error('添加同级节点失败:', error)
  }
  closeContextMenu()
}

/**
 * 添加子节点
 */
const handleAddChildNode = async () => {
  try {
    console.log('添加子节点:', selectedNodeId.value)
    const node = knowledgeTreeStore.findNodeByAddress(selectedNodeId.value)
    if (node && node.noteId) {
      const newNote = await knowledgeTreeStore.createAdjacentNote(node.noteId, 'child')
      // 使用小窗打开新笔记
      noteStore.openNoteEditor(newNote.id)
    }
  } catch (error) {
    console.error('添加子节点失败:', error)
  }
  closeContextMenu()
}

/**
 * 初始化 JsMind 实例
 * @async
 * @description 初始化思维导图，设置配置项，加载数据并绑定事件
 */
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
      line_style: 'bezier',
      enable_device_pixel_ratio: true
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
        // 添加右键菜单事件
        node.addEventListener('contextmenu', ((e: Event) => {
          if (e instanceof MouseEvent) {
            const nodeId = node.getAttribute('nodeid')
            if (nodeId) {
              handleContextMenu(e, nodeId)
            }
          }
        }) as EventListener)
      })
    }
  } catch (error) {
    console.error('Failed to initialize jsMind:', error)
  }
}

/**
 * 处理节点点击事件
 * @async
 * @param {MouseEvent} e 鼠标事件对象
 * @description 处理节点的单击事件，包括展开/折叠按钮点击和节点预览
 */
const handleNodeClick = async (e: MouseEvent) => {
  if (!jm.value) return

  const element = e.target as HTMLElement

  // 处理展开/折叠按钮点击
  if (element.classList.contains('node-expand-btn')) {
    // 阻止事件冒泡
    e.stopPropagation()
    e.preventDefault()

    const address = element.getAttribute('data-address')

    if (address) {
      // 防止重复点击
      if (element.hasAttribute('data-processing')) {
        return
      }
      element.setAttribute('data-processing', 'true')

      try {
        const node = knowledgeTreeStore.findNodeByAddress(address)

        if (node) {
          // 保存当前视图位置
          const viewPosition = {
            x: jm.value.view.e_panel.scrollLeft,
            y: jm.value.view.e_panel.scrollTop
          }

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
              }
              // 恢复视图位置
              jm.value.view.e_panel.scrollLeft = viewPosition.x
              jm.value.view.e_panel.scrollTop = viewPosition.y
            })
          } else {
            // 折叠节点
            node.isExpanded = false
            node.children = [] // 清空子节点数据

            // 更新视图
            const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
            jm.value.show(jsMindData)

            // 确保节点被折叠
            requestAnimationFrame(() => {
              const clickedNode = jm.value.get_node(address)
              if (clickedNode) {
                jm.value.collapse_node(address)
              }
              // 恢复视图位置
              jm.value.view.e_panel.scrollLeft = viewPosition.x
              jm.value.view.e_panel.scrollTop = viewPosition.y
            })
          }
        }
      } finally {
        // 处理完成后移除标记
        setTimeout(() => {
          element.removeAttribute('data-processing')
        }, 100)
      }
    }
    return
  }

  // 获取节点元素
  const jmnodeElement = element.closest('jmnode')
  if (jmnodeElement) {
    const nodeId = jmnodeElement.getAttribute('nodeid')
    if (nodeId) {
      const node = jm.value.get_node(nodeId)
      if (node && node.data && node.data.data.noteId) {
        if (e.altKey) {
          // Alt + 点击：跳转到卡片盒查看笔记
          router.push({
            name: 'cardbox',
            query: {
              mode: 'context',
              noteId: node.data.data.noteId
            }
          })
        } else if (e.metaKey || e.ctrlKey) {
          // Command/Ctrl + 点击：在扩展编辑器中打开
          router.push({
            name: 'NoteExpandEditor',
            params: { id: node.data.data.noteId }
          })
        } else {
          // 普通点击：原有的预览功能
          noteStore.openBacklinkPreview(node.data.data.noteId)
          uiStore.openRightSidebarWithTab('backlink')
        }
      }
    }
  }
}

/**
 * 处理节点双击事件
 * @async
 * @param {MouseEvent} e 鼠标事件对象
 * @description 处理节点的双击事件，实现节点聚焦和返回功能
 */
const handleNodeDblClick = async (e: MouseEvent) => {
  if (!jm.value) return

  const element = e.target as HTMLElement

  // 向上查找最近的 jmnode 元素
  const jmnodeElement = element.closest('jmnode')
  if (!jmnodeElement) {
    return
  }

  const nodeId = jmnodeElement.getAttribute('nodeid')

  if (nodeId) {
    // 如果是当前聚焦的根节点，则返回上一层
    if (knowledgeTreeStore.viewState.isInFocusMode) {
      // 检查是否是顶级节点（以000结尾的节点）
      const isTopLevelNode = nodeId.endsWith('000')
      // 检查是否是当前聚焦的节点
      const isFocusedNode = nodeId === knowledgeTreeStore.focusedNode?.address

      if (isFocusedNode) {
        if (isTopLevelNode) {
          try {
            // 完全重置所有状态
            knowledgeTreeStore.reset()

            // 重新获取顶层节点
            await knowledgeTreeStore.fetchTopLevelNodes()

            // 重新初始化视图
            const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)

            // 保存当前视图位置
            const viewPosition = jm.value.view.e_panel
              ? {
                  x: jm.value.view.e_panel.scrollLeft,
                  y: jm.value.view.e_panel.scrollTop
                }
              : null

            // 更新视图
            jm.value.show(jsMindData)

            // 恢复视图位置
            if (viewPosition) {
              requestAnimationFrame(() => {
                if (jm.value.view.e_panel) {
                  jm.value.view.e_panel.scrollLeft = viewPosition.x
                  jm.value.view.e_panel.scrollTop = viewPosition.y
                }
              })
            }

            // 重新绑定事件监听器
            setTimeout(() => {
              const jmnodes = container.value?.querySelectorAll('jmnode')
              jmnodes?.forEach((node) => {
                node.addEventListener('click', ((e: Event) => {
                  if (e instanceof MouseEvent) {
                    handleNodeClick(e)
                  }
                }) as EventListener)
                node.addEventListener('dblclick', ((e: Event) => {
                  if (e instanceof MouseEvent) {
                    handleNodeDblClick(e)
                  }
                }) as EventListener)
              })
            }, 100)
          } catch (error) {
            console.error('返回根节点时发生错误:', error)
          }
        } else {
          await knowledgeTreeStore.backToParent()
        }
      } else {
        // 其他节点保持原有的聚焦行为
        const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
        if (treeNode) {
          await knowledgeTreeStore.focusNodeWithChildren(treeNode)
        }
      }
    } else {
      // 非聚焦模式下，聚焦到点击的节点
      const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
      if (treeNode) {
        await knowledgeTreeStore.focusNodeWithChildren(treeNode)
      }
    }
  }
}

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

          jmnodes?.forEach((node) => {
            // 重新绑定单击事件
            node.addEventListener('click', ((e: Event) => {
              if (e instanceof MouseEvent) {
                handleNodeClick(e)
              }
            }) as EventListener)
            // 重新绑定双击事件
            node.addEventListener('dblclick', ((e: Event) => {
              if (e instanceof MouseEvent) {
                handleNodeDblClick(e)
              }
            }) as EventListener)
            // 重新绑定右键菜单事件
            node.addEventListener('contextmenu', ((e: Event) => {
              if (e instanceof MouseEvent) {
                const nodeId = node.getAttribute('nodeid')
                if (nodeId) {
                  handleContextMenu(e, nodeId)
                }
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

/**
 * 导航到指定节点
 * @async
 * @param {string} address 节点地址
 * @returns {Promise<boolean>} 导航是否成功
 * @description 根据节点地址进行导航，加载并聚焦到目标节点
 */
const navigateToNode = async (address: string) => {
  // console.log('开始导航到节点:', address)
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
  [() => route.params.address, () => route.query.address],
  async ([paramAddress, queryAddress]) => {
    const address = (queryAddress || paramAddress) as string
    if (address) {
      try {
        // console.log('准备导航到地址:', address)

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

        // console.log('导航路径:', navigationPath)

        // 按顺序执行导航
        for (const pathAddress of navigationPath) {
          const success = await navigateToNode(pathAddress)
          if (!success) {
            // console.error('导航失败，找不到节点:', pathAddress)
            break
          }
          // 等待一小段时间确保节点加载完成
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // 确保目标节点（最后一个节点）是展开状态
        const targetNode = knowledgeTreeStore.findNodeByAddress(address)
        if (targetNode) {
          // 加载并展开目标节点的子节点
          const childNodes = await knowledgeTreeStore.fetchChildNodes(address)
          targetNode.children = childNodes
          targetNode.isExpanded = true

          // 更新视图
          const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
          jm.value.show(jsMindData)

          // 确保节点被展开
          requestAnimationFrame(() => {
            const node = jm.value.get_node(address)
            if (node) {
              jm.value.expand_node(address)
            }
          })
        }
      } catch (error) {
        // console.error('导航到节点失败:', error)
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

  // 移除文档点击事件监听
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('scroll', closeContextMenu, true)
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
  width: 15px;
  height: 15px;
  border: 1px solid var(--color-border-default);
  border-radius: 50%;
  background: var(--color-bg-secondary);
  cursor: pointer;
  font-size: 11px;
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

/* 右键菜单样式 */
.context-menu {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 160px;
  max-width: 220px;
  will-change: transform;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.context-menu-item:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
</style>
