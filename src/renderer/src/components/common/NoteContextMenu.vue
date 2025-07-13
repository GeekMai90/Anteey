<template>
  <PopupMenu
    :menu-items="menuItems"
    :button-ref="buttonRef"
    :show="show"
    @close="handleClose"
    @item-click="handleItemClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNoteStore } from '@renderer/stores/noteStore'
import { useKnowledgeTreeStore } from '@renderer/stores/knowledgeTreeStore'
import { useUIStore } from '@renderer/stores/UIStore'
import PopupMenu from './PopupMenu.vue'
import type { MenuItem } from './PopupMenu.vue'
import {
  BranchOne,
  AddItem,
  Copy,
  FileEditing,
  ViewGridCard,
  Sapling,
  ListAlphabet,
  RightBar
} from '@icon-park/vue-next'
import { useEventBus } from '@vueuse/core'
import { Note } from '@/shared/types'

const router = useRouter()
const noteStore = useNoteStore()
const knowledgeTreeStore = useKnowledgeTreeStore()
const uiStore = useUIStore()

// 定义菜单项配置类型
interface MenuItemConfig {
  name: string
  label: string
  icon: any
  visible?: boolean
}

// 定义组件的 props
const props = defineProps<{
  show: boolean
  buttonRef: HTMLElement | null
  noteId?: string
  menuConfig?: Record<string, true | Partial<MenuItemConfig>> // 菜单配置，true 表示使用默认配置
}>()

// 定义组件的 emits
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-sibling', noteId: string): void
  (e: 'add-child', noteId: string): void
}>()

// 定义默认菜单配置
const DEFAULT_MENU_CONFIG: Record<string, MenuItemConfig> = {
  addSibling: {
    name: 'addSibling',
    label: '添加同级节点',
    icon: AddItem,
    visible: true
  },
  addChild: {
    name: 'addChild',
    label: '添加子节点',
    icon: BranchOne,
    visible: true
  },
  copyAddress: {
    name: 'copyAddress',
    label: '复制编码地址',
    icon: Copy,
    visible: true
  },
  expandEdit: {
    name: 'expandEdit',
    label: '展开编辑',
    icon: FileEditing,
    visible: true
  },
  viewInCardbox: {
    name: 'viewInCardbox',
    label: '卡片盒翻阅',
    icon: ViewGridCard,
    visible: true
  },
  viewInTree: {
    name: 'viewInTree',
    label: '知识树查看',
    icon: Sapling,
    visible: true
  },
  toggleIndex: {
    name: 'toggleIndex',
    label: '切换索引状态',
    icon: ListAlphabet,
    visible: true
  },
  addToRightSidebar: {
    name: 'addToRightSidebar',
    label: '右侧显示',
    icon: RightBar,
    visible: true
  }
}

// 处理函数映射
const actionHandlers: Record<string, () => void> = {
  addSibling: () => handleAddSibling(),
  addChild: () => handleAddChild(),
  copyAddress: () => handleCopyAddress(),
  expandEdit: () => handleExpandEdit(),
  viewInCardbox: () => handleViewInCardbox(),
  viewInTree: () => handleViewInTree(),
  toggleIndex: () => handleToggleIndex(),
  addToRightSidebar: () => handleAddToRightSidebar()
}

// 合并配置并生成菜单项
const menuItems = computed(() => {
  // 如果没有提供配置，使用默认配置的所有项
  if (!props.menuConfig) {
    return Object.values(DEFAULT_MENU_CONFIG)
      .filter((item) => item.visible)
      .map((item) => ({
        name: item.name,
        label: item.label,
        icon: item.icon,
        action: actionHandlers[item.name]
      }))
  }

  // 根据传入的配置顺序生成菜单项
  return Object.entries(props.menuConfig)
    .filter(([key]) => {
      // 确保该菜单项在默认配置中存在
      return key in DEFAULT_MENU_CONFIG
    })
    .map(([key, config]) => {
      const defaultConfig = DEFAULT_MENU_CONFIG[key]
      // 如果配置为 true，使用默认配置
      if (config === true) {
        return {
          name: defaultConfig.name,
          label: defaultConfig.label,
          icon: defaultConfig.icon,
          action: actionHandlers[key]
        }
      }
      // 否则合并配置
      return {
        name: defaultConfig.name,
        label: config.label || defaultConfig.label,
        icon: config.icon || defaultConfig.icon,
        action: actionHandlers[key]
      }
    })
})

// 处理菜单项点击
const handleItemClick = (item: MenuItem) => {
  item.action()
}

// 处理关闭菜单
const handleClose = () => {
  emit('close')
}

// 展开编辑处理函数
async function handleExpandEdit() {
  if (props.noteId) {
    router.push({
      name: 'NoteExpandEditor',
      params: { id: props.noteId }
    })
  }
  handleClose()
}

// 卡片盒翻阅处理函数
async function handleViewInCardbox() {
  if (props.noteId) {
    router.push({
      name: 'cardbox',
      query: {
        mode: 'context',
        noteId: props.noteId
      }
    })
  }
  handleClose()
}

// 复制地址处理函数
async function handleCopyAddress() {
  if (props.noteId) {
    await noteStore.copyNoteAddress(props.noteId)
  }
  handleClose()
}

// 添加同级节点处理函数
async function handleAddSibling() {
  if (props.noteId) {
    try {
      const newNote = await knowledgeTreeStore.createAdjacentNote(props.noteId, 'below')
      const lastCreatedNote = await noteStore.fetchNote(newNote.id)
      if (lastCreatedNote) {
        // 先设置 lastCreatedNote
        noteStore.lastCreatedNote = lastCreatedNote
        // 触发笔记创建事件
        const eventBus = useEventBus('note-created')
        eventBus.emit(lastCreatedNote)
        // 触发笔记更新事件
        const noteUpdatedBus = useEventBus<Note>('note-updated')
        noteUpdatedBus.emit(lastCreatedNote)
        // 最后打开编辑器
        noteStore.openNoteEditor(newNote.id)
      }
    } catch (error) {
      console.error('添加同级节点失败:', error)
    }
  }
  handleClose()
}

// 添加子节点处理函数
async function handleAddChild() {
  if (props.noteId) {
    try {
      const newNote = await knowledgeTreeStore.createAdjacentNote(props.noteId, 'child')
      const lastCreatedNote = await noteStore.fetchNote(newNote.id)
      if (lastCreatedNote) {
        // 先设置 lastCreatedNote
        noteStore.lastCreatedNote = lastCreatedNote
        // 触发笔记创建事件
        const eventBus = useEventBus('note-created')
        eventBus.emit(lastCreatedNote)
        // 触发笔记更新事件
        const noteUpdatedBus = useEventBus<Note>('note-updated')
        noteUpdatedBus.emit(lastCreatedNote)
        // 最后打开编辑器
        noteStore.openNoteEditor(newNote.id)
      }
    } catch (error) {
      console.error('添加子节点失败:', error)
    }
  }
  handleClose()
}

// 添加知识树查看处理函数
async function handleViewInTree() {
  if (props.noteId) {
    router.push({
      name: 'KnowledgeTreeNode',
      params: { address: props.noteId }
    })
  }
  handleClose()
}

// 添加索引处理函数
async function handleToggleIndex() {
  if (props.noteId) {
    try {
      await noteStore.toggleNoteIndex(props.noteId)
      handleClose()
    } catch (error) {
      console.error('切换索引状态失败:', error)
    }
  }
  handleClose()
}

// 添加到右侧边栏处理函数
async function handleAddToRightSidebar() {
  if (props.noteId) {
    await noteStore.addNoteToRightSidebar(props.noteId)
    uiStore.openRightSidebarWithTab('multi')
  }
  handleClose()
}
</script>
