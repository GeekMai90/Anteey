<template>
  <div v-if="noteStore.isMultiSelectMode" class="batch-operation-toolbar">
    <div class="toolbar-content">
      <div class="selection-group">
        <div class="selected-count">已选择 {{ noteStore.selectedNoteIds.length }} 张卡片</div>
        <Button
          class="select-all-btn"
          :class="{ active: isAllSelected }"
          size="small"
          @click="toggleSelectAll"
        >
          {{ isAllSelected ? '取消全选' : '全选' }}
        </Button>
      </div>

      <div class="operation-buttons">
        <!-- 设置卡片盒 -->
        <Button ref="moveButtonRef" :icon="Install" @click="toggleCardBoxMenu">
          移动到卡片盒
        </Button>

        <!-- 修改卡片类型 -->
        <Button :icon="Notes" @click="showCardTypeMenu = true"> 修改类型 </Button>

        <!-- 标签管理 -->
        <Button :icon="Tag" @click="showTagMenu = true"> 标签 </Button>

        <!-- 闪卡转换 -->
        <Button :icon="StorageCardOne" @click="toggleFlashcard">
          {{ hasFlashcards ? '取消闪卡' : '转换为闪卡' }}
        </Button>

        <!-- 删除 -->
        <Button :icon="Delete" class="danger" @click="handleDelete"> 删除 </Button>

        <!-- 取消按钮 -->
        <Button :icon="Close" @click="cancelMultiSelect"> 取消 </Button>
      </div>

      <!-- 卡片盒列表 -->
      <BatchMoveCardBoxList
        v-if="showCardBoxMenu"
        :is-open="showCardBoxMenu"
        :selected-count="noteStore.selectedNoteIds.length"
        :button-ref="moveButtonRef"
        @close="showCardBoxMenu = false"
        @move="handleMoveToCardBox"
      />

      <!-- 卡片类型下拉菜单 -->
      <div v-if="showCardTypeMenu" class="dropdown-menu card-type-menu">
        <div
          v-for="type in cardTypes"
          :key="type.value"
          class="menu-item"
          @click="handleChangeCardType(type.value)"
        >
          <component :is="type.icon" theme="outline" size="16" />
          <span>{{ type.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Install, Notes, Tag, StorageCardOne, Delete, Close } from '@icon-park/vue-next'
import type { CardType } from '@shared/types'
import Button from '@renderer/components/ui/Button.vue'
import BatchMoveCardBoxList from './BatchMoveCardBoxList.vue'
import { message } from '@renderer/utils/message'

const noteStore = useNoteStore()

// 下拉菜单状态
const showCardBoxMenu = ref(false)
const showCardTypeMenu = ref(false)
const showTagMenu = ref(false)

// 卡片类型选项
const cardTypes = [
  { value: 'Maincard' as CardType, label: '主要卡', icon: Notes },
  { value: 'Bibcard' as CardType, label: '书目卡', icon: Notes },
  { value: 'Indexcard' as CardType, label: '索引卡', icon: Notes },
  { value: 'Hoplinkcard' as CardType, label: '跳转卡', icon: Notes }
]

// 计算是否包含闪卡
const hasFlashcards = computed(() => {
  return noteStore.selectedNoteIds.some((id) => {
    const note = noteStore.notes.find((n) => n.id === id)
    return note?.isFlashcard
  })
})

// 添加全选相关的计算属性和方法
const isAllSelected = computed(() => {
  const displayedNotes = noteStore.cardboxNotes
  return displayedNotes.length > 0 && noteStore.selectedNoteIds.length === displayedNotes.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选
    noteStore.clearSelectedNotes()
  } else {
    // 全选当前显示的笔记
    const displayedNotes = noteStore.cardboxNotes
    displayedNotes.forEach((note) => {
      if (!noteStore.isNoteSelected(note.id)) {
        noteStore.selectNote(note.id)
      }
    })
  }
}

// 取消多选
const cancelMultiSelect = () => {
  noteStore.toggleMultiSelectMode()
}

// 移动到卡片盒
const handleMoveToCardBox = async (cardBoxId: string) => {
  try {
    await noteStore.batchMoveNotesToCardBox(noteStore.selectedNoteIds, cardBoxId)
    message.success('批量设置卡片盒成功')
    showCardBoxMenu.value = false
    noteStore.toggleMultiSelectMode()
  } catch (error) {
    message.error('批量设置卡片盒成功失败')
  }
}

// 修改卡片类型 - 暂时留空
const handleChangeCardType = async (cardType: CardType) => {
  // TODO: 待实现
  message.info('功能开发中')
  showCardTypeMenu.value = false
}

// 切换闪卡状态 - 暂时留空
const toggleFlashcard = async () => {
  // TODO: 待实现
  message.info('功能开发中')
}

// 删除操作 - 暂时留空
const handleDelete = async () => {
  // TODO: 待实现
  message.info('功能开发中')
}

const moveButtonRef = ref<HTMLElement | null>(null)

const toggleCardBoxMenu = () => {
  showCardBoxMenu.value = !showCardBoxMenu.value
}
</script>

<style lang="scss" scoped>
.batch-operation-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;

  .toolbar-content {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: var(--shadow-primary);
    pointer-events: auto;

    .selection-group {
      display: flex;
      align-items: center;
      gap: 8px;

      .selected-count {
        color: var(--color-text-secondary);
        font-size: 14px;
        white-space: nowrap;
      }

      .select-all-btn {
        font-size: 13px;
        height: 24px;
        padding: 0 8px;
        border-radius: 4px;

        &:hover {
          color: var(--color-primary);
          border-color: var(--color-primary);
        }

        &.active {
          background: rgba(var(--color-primary-rgb), 0.1);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      }
    }

    .operation-buttons {
      display: flex;
      gap: 8px;
      align-items: center;

      .ant-btn {
        height: 32px;
        padding: 0 12px;

        &.danger {
          color: var(--color-danger);
          &:hover {
            color: var(--color-danger);
            border-color: var(--color-danger);
            background: rgba(var(--color-danger-rgb), 0.1);
          }
        }
      }
    }
  }
}

.dropdown-menu {
  position: absolute;
  top: -120px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: var(--shadow-primary);

  &.card-type-menu {
    right: 50%;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      background: var(--color-hover-bg);
    }
  }
}
</style>
