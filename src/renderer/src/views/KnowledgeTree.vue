<template>
  <div class="knowledge-tree-container">
    <!-- 顶部工具栏组件 -->
    <AppToolbar :show-refresh-button="true" @refresh="refreshCurrentData" />

    <!-- 左侧工具条 -->
    <KnowledgeTreeToolbar
      @zoomIn="handleZoomIn"
      @zoomOut="handleZoomOut"
      @resetZoom="handleResetZoom"
      @backToRoot="handleBackToRoot"
    />

    <!-- 主要内容区域 -->
    <div
      class="main-content"
      :style="{ height: isPanelExpanded ? 'calc(100% - 40px - 300px)' : 'calc(100% - 40px)' }"
    >
      <!-- 思维导图容器 -->
      <div ref="container" class="jsmind-container"></div>
    </div>

    <!-- 底部可折叠面板 -->
    <CollapsiblePanel v-model="isPanelExpanded" :notes="visibleNotes" />

    <!-- 右键菜单 -->
    <NoteContextMenu
      :show="contextMenuVisible"
      :button-ref="referenceRef"
      :note-id="selectedNodeNoteId"
      :menu-config="{
        addSibling: true,
        addChild: true,
        toggleIndex: true,
        addToRightSidebar: true,
        copyAddress: true,
        expandEdit: true,
        viewInCardbox: true
      }"
      @close="closeContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
/** * @file KnowledgeTree.vue * @description 知识树组件，用于展示和管理卢曼卡片笔记的层级结构 * *
主要功能： * 1. 知识树的可视化展示 * - 使用 jsMind 实现思维导图式的展示 * - 支持节点的展开/折叠 *
-支持节点的聚焦/返回 * 2. 节点交互 * - 单击节点预览笔记内容 * - 双击节点进入聚焦模式 * -
点击展开/折叠按钮管理子节点 * 3. 导航功能 * - 支持通过路由参数直接定位节点 * -
支持通过搜索结果跳转到指定节点 * * @author 麦先生 * @created 2024-03-20 */
// 导入必要的 Vue 组件和工具
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import '../styles/jsmind-antinet-theme.css'
import jsMind from 'jsmind'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import type { KnowledgeTreeNode } from '@shared/types'
import type { Note } from '@shared/types/note'
import AppToolbar from '../components/layout/AppToolbar.vue'
import { useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useUIStore } from '@renderer/stores/UIStore'
import CollapsiblePanel from '@renderer/components/knowledge/CollapsiblePanel.vue'
import KnowledgeTreeToolbar from '../components/knowledge/KnowledgeTreeToolbar.vue'
import NoteContextMenu from '@renderer/components/common/NoteContextMenu.vue'
import { useEventBus } from '@vueuse/core'

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
    isIndexed: boolean
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
const referenceRef = ref<HTMLElement | null>(null)
const selectedNodeId = ref('')

// 在顶部添加新的响应式状态
const isPanelExpanded = ref(false)
const visibleNotes = ref<Note[]>([])

// 单击延迟处理相关变量
const clickTimer = ref<number | null>(null)
const clickDelay = 300 // 毫秒

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
        noteId: node.noteId,
        isIndexed: node.isIndexed || false
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
      noteId: null,
      isIndexed: false
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
  referenceRef.value = jmnodeElement as HTMLElement

  // 显示菜单
  contextMenuVisible.value = true
}

/**
 * 关闭右键菜单
 */
const closeContextMenu = () => {
  contextMenuVisible.value = false
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

      // 3. 展开所有节点
      const root = jm.value.get_root()
      if (root) {
        const expandNode = (node: { id: string; children?: any[] }) => {
          if (!node) return
          jm.value.expand_node(node.id)
          if (node.children) {
            node.children.forEach(expandNode)
          }
        }
        expandNode(root)
      }

      // 添加事件监听器
      const jmnodes = container.value.querySelectorAll('jmnode')
      // console.log('找到的节点数量:', jmnodes.length)

      jmnodes.forEach((node) => {
        bindNodeEvents(node)
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

  // 处理展开/折叠按钮点击 - 这些需要立即响应，不需要延迟
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
  if (!jmnodeElement) return

  const nodeId = jmnodeElement.getAttribute('nodeid')
  if (!nodeId) return

  // 清除可能存在的定时器
  if (clickTimer.value !== null) {
    clearTimeout(clickTimer.value)
    clickTimer.value = null
  }

  // 设置新的定时器，延迟执行单击操作
  clickTimer.value = window.setTimeout(() => {
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
  }, clickDelay)
}

/**
 * 处理节点双击事件
 * @async
 * @param {MouseEvent} e 鼠标事件对象
 * @description 处理节点的双击事件，实现节点聚焦和返回功能
 */
const handleNodeDblClick = async (e: MouseEvent) => {
  if (!jm.value) return

  // 清除单击定时器，防止单击事件触发
  if (clickTimer.value !== null) {
    clearTimeout(clickTimer.value)
    clickTimer.value = null
  }

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
                bindNodeEvents(node)
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

// 修改数据收集函数为异步函数
const collectVisibleNotes = async () => {
  const notes: Note[] = []

  const processNode = async (node: KnowledgeTreeNode) => {
    if (node.noteId) {
      // 获取完整的笔记数据
      const noteData = await noteStore.fetchNote(node.noteId)
      if (noteData) {
        notes.push(noteData)
      }
    }
    if (node.isExpanded && node.children) {
      for (const child of node.children) {
        await processNode(child)
      }
    }
  }

  for (const node of knowledgeTreeStore.nodes) {
    await processNode(node)
  }
  visibleNotes.value = notes
}

// 修改 watch 部分，使用异步函数
watch(
  () => knowledgeTreeStore.nodes,
  async () => {
    if (jm.value) {
      const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
      jm.value.show(jsMindData)

      // 收集可见的笔记信息
      await collectVisibleNotes()

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
            bindNodeEvents(node)
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

// 工具栏相关的处理函数
const handleZoomIn = () => {
  if (!jm.value) return
  jm.value.view.zoomIn()
}

const handleZoomOut = () => {
  if (!jm.value) return
  jm.value.view.zoomOut()
}

const handleResetZoom = () => {
  if (!jm.value) return
  jm.value.view.setZoom(1) // 重置为默认缩放比例
}

const handleBackToRoot = async () => {
  try {
    // 完全重置所有状态
    knowledgeTreeStore.reset()

    // 重新获取顶层节点
    await knowledgeTreeStore.fetchTopLevelNodes()

    // 重新初始化视图
    const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
    jm.value.show(jsMindData)

    // 重置缩放比例为1
    jm.value.view.setZoom(1)

    // 重新绑定事件监听器
    setTimeout(() => {
      const jmnodes = container.value?.querySelectorAll('jmnode')
      jmnodes?.forEach((node: Element) => {
        bindNodeEvents(node)
      })
    }, 100)
  } catch (error) {
    console.error('返回根节点时发生错误:', error)
  }
}

// 生命周期钩子
onMounted(() => {
  initJsMind()
})

// 添加组件卸载前的清理工作
onBeforeUnmount(() => {
  // 清除点击定时器
  if (clickTimer.value !== null) {
    clearTimeout(clickTimer.value)
    clickTimer.value = null
  }

  // 关闭右侧边栏
  // uiStore.closeRightSidebar()
})

// 在 script 部分添加 selectedNodeNoteId 计算属性
const selectedNodeNoteId = computed(() => {
  const node = knowledgeTreeStore.findNodeByAddress(selectedNodeId.value)
  return node?.noteId || ''
})

/**
 * 绑定节点事件
 * @param {Element} node DOM节点元素
 */
const bindNodeEvents = (node: Element) => {
  // 绑定单击事件
  node.addEventListener('click', ((e: Event) => {
    if (e instanceof MouseEvent) {
      handleNodeClick(e)
    }
  }) as EventListener)

  // 绑定双击事件
  node.addEventListener('dblclick', ((e: Event) => {
    if (e instanceof MouseEvent) {
      handleNodeDblClick(e)
    }
  }) as EventListener)

  // 绑定右键菜单事件
  node.addEventListener('contextmenu', ((e: Event) => {
    if (e instanceof MouseEvent) {
      const nodeId = node.getAttribute('nodeid')
      if (nodeId) {
        handleContextMenu(e, nodeId)
      }
    }
  }) as EventListener)

  // 设置索引属性
  const nodeId = node.getAttribute('nodeid')
  if (nodeId) {
    const treeNode = knowledgeTreeStore.findNodeByAddress(nodeId)
    if (treeNode && treeNode.isIndexed) {
      node.setAttribute('indexed', 'true')
    } else {
      node.removeAttribute('indexed')
    }
  }
}

// 监听笔记更新事件，更新知识树节点
const noteUpdatedBus = useEventBus<Note>('note-updated')
noteUpdatedBus.on((updatedNote) => {
  if (!updatedNote || !jm.value) return

  // 通过noteId查找需要更新的节点
  const findNodeByNoteId = (noteId: string) => {
    // 深度优先搜索树中的所有节点
    const findInNode = (jmNode: any): any => {
      if (!jmNode) return null

      // 检查当前节点是否匹配
      if (jmNode.data && jmNode.data.data && jmNode.data.data.noteId === noteId) {
        return jmNode
      }

      // 递归检查所有子节点
      if (jmNode.children) {
        for (const child of jmNode.children) {
          const result = findInNode(child)
          if (result) return result
        }
      }

      return null
    }

    // 从根节点开始搜索
    const rootNode = jm.value.get_root()
    return rootNode ? findInNode(rootNode) : null
  }

  // 查找需要更新的节点
  const nodeToUpdate = findNodeByNoteId(updatedNote.id)

  if (nodeToUpdate) {
    // 获取节点地址
    const address = nodeToUpdate.id

    // 找到对应的知识树节点并更新标题
    const treeNode = knowledgeTreeStore.findNodeByAddress(address)
    if (treeNode) {
      treeNode.title = updatedNote.title || ''
      // 同步索引状态
      treeNode.isIndexed = updatedNote.isIndexed || false

      // 更新节点在树中的显示内容，保持与transformToJsMindData函数一致的生成方式
      const hasChildren = nodeToUpdate.data.data.childCount > 0

      nodeToUpdate.topic = `<div class="node-content">
              <div class="node-content-wrapper">
                <div class="node-address">${address || ''}</div>
                <div class="node-title">${updatedNote.title || ''}</div>
              </div>
              ${
                hasChildren
                  ? `<div class="node-expand-btn" data-address="${address}">
                          ${nodeToUpdate.expanded ? '-' : '+'}
                     </div>`
                  : ''
              }
            </div>`

      // 更新节点的索引状态
      nodeToUpdate.data.data.isIndexed = updatedNote.isIndexed || false

      // 仅更新这个节点，不重新绘制整个树
      jm.value.update_node(nodeToUpdate)

      // 等待DOM更新后重新绑定事件
      nextTick(() => {
        // 查找DOM中新更新的节点
        if (container.value) {
          const updatedDomNode = container.value.querySelector(`jmnode[nodeid="${address}"]`)
          if (updatedDomNode) {
            // 重新绑定事件
            bindNodeEvents(updatedDomNode)

            // 更新DOM节点的索引属性
            if (updatedNote.isIndexed) {
              updatedDomNode.setAttribute('indexed', 'true')
            } else {
              updatedDomNode.removeAttribute('indexed')
            }

            // 如果有展开/折叠按钮，也需要重新绑定其事件
            const expandBtn = updatedDomNode.querySelector(
              `.node-expand-btn[data-address="${address}"]`
            )
            if (expandBtn) {
              expandBtn.addEventListener('click', ((e: Event) => {
                if (e instanceof MouseEvent) {
                  handleNodeClick(e)
                }
              }) as EventListener)
            }
          }
        }
      })
    }
  }
})

// 添加对notes-index-updated事件的监听，处理索引状态变化
const notesIndexUpdatedBus = useEventBus<Note[]>('notes-index-updated')
notesIndexUpdatedBus.on((updatedNotes) => {
  if (!updatedNotes || !updatedNotes.length || !jm.value) return
  console.log(
    'KnowledgeTree.vue→ 收到笔记索引更新事件:',
    updatedNotes.map((note) => note.id)
  )

  updatedNotes.forEach((updatedNote) => {
    // 通过noteId查找需要更新的节点
    const findNodeByNoteId = (noteId: string) => {
      // 深度优先搜索树中的所有节点
      const findInNode = (jmNode: any): any => {
        if (!jmNode) return null

        // 检查当前节点是否匹配
        if (jmNode.data && jmNode.data.data && jmNode.data.data.noteId === noteId) {
          return jmNode
        }

        // 递归检查所有子节点
        if (jmNode.children) {
          for (const child of jmNode.children) {
            const result = findInNode(child)
            if (result) return result
          }
        }

        return null
      }

      // 从根节点开始搜索
      const rootNode = jm.value.get_root()
      return rootNode ? findInNode(rootNode) : null
    }

    // 查找需要更新的节点
    const nodeToUpdate = findNodeByNoteId(updatedNote.id)

    if (nodeToUpdate) {
      // 获取节点地址
      const address = nodeToUpdate.id

      // 找到对应的知识树节点并更新索引状态
      const treeNode = knowledgeTreeStore.findNodeByAddress(address)
      if (treeNode) {
        // 更新索引状态
        treeNode.isIndexed = updatedNote.isIndexed || false
        console.log('KnowledgeTree.vue→ 更新节点索引状态:', address, updatedNote.isIndexed)

        // 更新节点的索引状态
        nodeToUpdate.data.data.isIndexed = updatedNote.isIndexed || false

        // 仅更新这个节点，不重新绘制整个树
        jm.value.update_node(nodeToUpdate)

        // 等待DOM更新后重新绑定事件
        nextTick(() => {
          // 查找DOM中新更新的节点
          if (container.value) {
            const updatedDomNode = container.value.querySelector(`jmnode[nodeid="${address}"]`)
            if (updatedDomNode) {
              // 重新绑定事件
              bindNodeEvents(updatedDomNode)

              // 更新DOM节点的索引属性
              if (updatedNote.isIndexed) {
                updatedDomNode.setAttribute('indexed', 'true')
              } else {
                updatedDomNode.removeAttribute('indexed')
              }
            }
          }
        })
      }
    }
  })
})

/**
 * 刷新当前数据
 * @async
 * @description 刷新当前视图中的节点数据，不改变视图状态
 */
const refreshCurrentData = async () => {
  try {
    if (!jm.value) return

    // 保存当前视图位置
    const viewPosition = {
      x: jm.value.view.e_panel.scrollLeft,
      y: jm.value.view.e_panel.scrollTop
    }

    // 保存当前缩放比例
    const currentZoom = jm.value.view.actualZoom || 1

    // 收集当前所有节点的展开状态
    const expandedNodeIds = new Set<string>()
    const collectExpandedNodes = (nodeObj: any) => {
      if (!nodeObj) return

      if (nodeObj.expanded) {
        expandedNodeIds.add(nodeObj.id)
      }

      if (nodeObj.children) {
        nodeObj.children.forEach((child: any) => collectExpandedNodes(child))
      }
    }

    // 从根节点开始收集
    const rootNode = jm.value.get_root()
    if (rootNode) {
      collectExpandedNodes(rootNode)
    }

    // 处理聚焦模式和非聚焦模式的刷新
    if (knowledgeTreeStore.viewState.isInFocusMode && knowledgeTreeStore.focusedNode) {
      // 获取聚焦节点的地址
      const focusedNodeAddress = knowledgeTreeStore.focusedNode.address

      // 重新获取子节点
      const childNodes = await knowledgeTreeStore.fetchChildNodes(focusedNodeAddress)

      // 遍历旧子节点，记录展开状态
      const oldExpandedNodeMap = new Map<string, boolean>()

      if (knowledgeTreeStore.focusedNode.children) {
        const processNode = (node: KnowledgeTreeNode) => {
          if (!node) return
          // 使用类型断言确保类型安全
          oldExpandedNodeMap.set(node.address, node.isExpanded || false)

          if (node.children && node.children.length > 0 && node.isExpanded) {
            node.children.forEach(processNode)
          }
        }

        knowledgeTreeStore.focusedNode.children.forEach(processNode)
      }

      // 应用展开状态到新节点
      const applyExpandState = async (nodes: KnowledgeTreeNode[]) => {
        for (const node of nodes) {
          // 如果在展开状态映射中找到，应用状态
          if (oldExpandedNodeMap.has(node.address)) {
            const isExpanded = oldExpandedNodeMap.get(node.address)
            node.isExpanded = isExpanded === true

            // 如果节点应展开，获取其子节点
            if (node.isExpanded) {
              const subNodes = await knowledgeTreeStore.fetchChildNodes(node.address)
              node.children = subNodes
              // 递归处理子节点
              await applyExpandState(subNodes)
            }
          }
        }
      }

      // 应用展开状态
      await applyExpandState(childNodes)

      // 更新聚焦节点的子节点
      if (knowledgeTreeStore.focusedNode) {
        knowledgeTreeStore.focusedNode.children = childNodes
        knowledgeTreeStore.focusedNode.isExpanded = true
      }
    } else {
      // 非聚焦模式：获取并保存当前所有节点的状态
      const oldNodeMap = new Map<string, { isExpanded: boolean; children: KnowledgeTreeNode[] }>()

      const saveNodeStates = (nodes: KnowledgeTreeNode[]) => {
        if (!nodes) return

        nodes.forEach((node) => {
          oldNodeMap.set(node.address, {
            isExpanded: node.isExpanded || false,
            children: node.children || []
          })

          if (node.children && node.isExpanded) {
            saveNodeStates(node.children)
          }
        })
      }

      saveNodeStates(knowledgeTreeStore.nodes)

      // 重新获取顶层节点
      await knowledgeTreeStore.fetchTopLevelNodes()

      // 恢复节点状态
      const restoreStates = async (nodes: KnowledgeTreeNode[]) => {
        for (const node of nodes) {
          const oldState = oldNodeMap.get(node.address)
          if (oldState) {
            node.isExpanded = oldState.isExpanded === true

            if (node.isExpanded) {
              // 获取新的子节点
              const childNodes = await knowledgeTreeStore.fetchChildNodes(node.address)
              node.children = childNodes

              // 递归处理子节点
              await restoreStates(childNodes)
            }
          }
        }
      }

      await restoreStates(knowledgeTreeStore.nodes)
    }

    // 重新渲染思维导图
    const jsMindData = transformToJsMindData(knowledgeTreeStore.nodes)
    jm.value.show(jsMindData)

    // 恢复缩放级别
    jm.value.view.setZoom(currentZoom)

    // 恢复视图位置
    requestAnimationFrame(() => {
      if (jm.value && jm.value.view.e_panel) {
        jm.value.view.e_panel.scrollLeft = viewPosition.x
        jm.value.view.e_panel.scrollTop = viewPosition.y
      }
    })

    // 重新绑定事件
    setTimeout(() => {
      if (container.value) {
        const jmnodes = container.value.querySelectorAll('jmnode')
        jmnodes.forEach((node) => {
          bindNodeEvents(node)
        })
      }
    }, 100)

    // 展开节点
    setTimeout(() => {
      try {
        // 将Set转为数组
        const expandedIds = Array.from(expandedNodeIds)

        // 过滤掉可能有问题的节点ID（例如，特殊形式的分支节点ID）
        const validIds = expandedIds.filter((id) => {
          // 跳过根节点
          if (id === 'root') return false

          // 检查节点是否实际存在
          const node = jm.value?.get_node(id)
          return !!node
        })

        // 展开所有有效的展开节点
        validIds.forEach((id) => {
          if (jm.value) {
            try {
              jm.value.expand_node(id)
            } catch (nodeError) {
              // 忽略展开错误
              console.log(`节点 ${id} 展开失败，跳过`)
            }
          }
        })
      } catch (error) {
        console.error('恢复节点展开状态时出错:', error)
      }
    }, 200)

    // 更新可见笔记
    await collectVisibleNotes()
  } catch (error) {
    console.error('刷新数据时发生错误:', error)
  }
}
</script>

<style scoped>
.knowledge-tree-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.main-content {
  flex: 1;
  position: relative;
  transition: height 0.3s ease;
}

.jsmind-container {
  width: 100%;
  height: 100%;
  overflow: auto;
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
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.3s ease;
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
  color: var(--color-text-secondary);
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
  color: var(--color-primary);
  opacity: 1;
  transform: scale(1.1);
}

/* 添加单独的样式让索引节点的按钮也保持主题色 */
:deep(jmnode[indexed='true'] .node-expand-btn) {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
  opacity: 1;
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

/* 确保工具条不会被其他元素遮挡 */
.knowledge-tree-container {
  position: relative;
}
</style>
