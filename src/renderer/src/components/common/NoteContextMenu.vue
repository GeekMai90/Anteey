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
import PopupMenu from './PopupMenu.vue'
import type { MenuItem } from './PopupMenu.vue'
import { BranchOne, AddItem, Copy, FileEditing, ViewGridCard, Sapling } from '@icon-park/vue-next'

const router = useRouter()
const noteStore = useNoteStore()
const knowledgeTreeStore = useKnowledgeTreeStore()

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
  }
}

// 处理函数映射
const actionHandlers: Record<string, () => void> = {
  addSibling: () => handleAddSibling(),
  addChild: () => handleAddChild(),
  copyAddress: () => handleCopyAddress(),
  expandEdit: () => handleExpandEdit(),
  viewInCardbox: () => handleViewInCardbox(),
  viewInTree: () => handleViewInTree()
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
      noteStore.openNoteEditor(newNote.id)
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
      noteStore.openNoteEditor(newNote.id)
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
</script>
