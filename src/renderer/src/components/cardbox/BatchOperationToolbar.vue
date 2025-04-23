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
        <Button ref="moveButtonRef" :icon="Install" @click="toggleCardBoxMenu"> 设置卡片盒 </Button>

        <!-- 修改卡片类型 -->
        <Button ref="changeTypeButtonRef" :icon="Notes" @click="toggleCardTypeMenu">
          设置卡片类型
        </Button>

        <!-- 标签管理 -->
        <Button ref="tagButtonRef" :icon="Tag" @click="handleTagManage"> 设置标签 </Button>

        <!-- 闪卡转换 -->
        <Button :icon="StorageCardOne" @click="toggleFlashcard"> 转换为闪卡 </Button>

        <!-- 合并笔记 -->
        <Button :icon="MergeCells" @click="handleMerge"> 合并笔记 </Button>

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

      <!-- 卡片类型列表 -->
      <BatchChangeCardTypeList
        v-if="showCardTypeMenu"
        :is-open="showCardTypeMenu"
        :selected-count="noteStore.selectedNoteIds.length"
        :button-ref="changeTypeButtonRef.$el"
        @close="showCardTypeMenu = false"
        @change="handleChangeCardType"
      />

      <!-- 标签列表 -->
      <BatchChangeTagList
        v-if="showTagMenu"
        :is-open="showTagMenu"
        :selected-count="noteStore.selectedNoteIds.length"
        :button-ref="tagButtonRef.$el"
        @close="showTagMenu = false"
        @add="handleAddTag"
      />

      <!-- 闪卡转换确认对话框 -->
      <ConfirmDialog
        v-model:visible="showFlashcardConfirm"
        title="转换为闪卡确认"
        :message="`确定要将选中的 ${noteStore.selectedNoteIds.length} 张卡片转换为闪卡吗？`"
        confirm-text="确认"
        cancel-text="取消"
        @confirm="confirmConvertToFlashcard"
        @cancel="showFlashcardConfirm = false"
      />

      <!-- 删除确认对话框 -->
      <ConfirmDialog
        v-model:visible="showDeleteConfirm"
        title="删除确认"
        :message="`确定要将选中的 ${noteStore.selectedNoteIds.length} 张卡片移到回收站吗？`"
        confirm-text="确认"
        cancel-text="取消"
        @confirm="confirmDelete"
        @cancel="showDeleteConfirm = false"
      />

      <!-- 合并确认对话框 -->
      <ConfirmDialog
        v-model:visible="showMergeConfirm"
        title="合并笔记确认"
        :message="`确定要将选中的 ${noteStore.selectedNoteIds.length} 张卡片合并吗？合并后将保留第一张卡片，其他卡片将被移到回收站。`"
        confirm-text="确认"
        cancel-text="取消"
        @confirm="confirmMerge"
        @cancel="showMergeConfirm = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNoteStore } from '@renderer/stores/noteStore'
import { Install, Notes, Tag, StorageCardOne, Delete, Close, MergeCells } from '@icon-park/vue-next'
import type { CardType, Note } from '@shared/types'
import Button from '@renderer/components/ui/Button.vue'
import BatchMoveCardBoxList from './BatchMoveCardBoxList.vue'
import BatchChangeCardTypeList from './BatchChangeCardTypeList.vue'
import BatchChangeTagList from './BatchChangeTagList.vue'
import { message } from '@renderer/utils/message'
import { useTagStore } from '@renderer/stores/tagStore'
import { useFlashcardStore } from '@renderer/stores/flashcardStore'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'

const noteStore = useNoteStore()
const tagStore = useTagStore()
const flashcardStore = useFlashcardStore()

// 下拉菜单状态
const showCardBoxMenu = ref(false)
const showCardTypeMenu = ref(false)
const showTagMenu = ref(false)
const showFlashcardConfirm = ref(false)
const showDeleteConfirm = ref(false)
const showMergeConfirm = ref(false)

// 添加 props 定义
const props = defineProps<{
  displayedNotes: Note[]
}>()

// 添加全选相关的计算属性和方法
const isAllSelected = computed(() => {
  if (!props.displayedNotes.length) return false
  return props.displayedNotes.every((note) => noteStore.selectedNoteIds.includes(note.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选：只取消当前页面显示的笔记的选中状态
    props.displayedNotes.forEach((note) => {
      const index = noteStore.selectedNoteIds.indexOf(note.id)
      if (index !== -1) {
        noteStore.selectedNoteIds.splice(index, 1)
      }
    })
  } else {
    // 全选：将当前页面显示的笔记全部选中
    props.displayedNotes.forEach((note) => {
      if (!noteStore.selectedNoteIds.includes(note.id)) {
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

// 修改卡片类型
const handleChangeCardType = async (cardType: CardType) => {
  try {
    await noteStore.batchUpdateNotesCardType(noteStore.selectedNoteIds, cardType)
    message.success('批量修改卡片类型成功')
    showCardTypeMenu.value = false
    noteStore.toggleMultiSelectMode()
  } catch (error) {
    message.error('批量修改卡片类型失败')
  }
}

// 检查是否有选中的卡片
const checkSelectedNotes = () => {
  if (noteStore.selectedNoteIds.length === 0) {
    message.info('请先选择要处理的卡片')
    return false
  }
  return true
}

// 修改卡片盒菜单切换方法
const toggleCardBoxMenu = () => {
  if (checkSelectedNotes()) {
    showCardBoxMenu.value = !showCardBoxMenu.value
  }
}

// 修改卡片类型菜单切换方法
const toggleCardTypeMenu = () => {
  if (checkSelectedNotes()) {
    showCardTypeMenu.value = !showCardTypeMenu.value
  }
}

// 修改标签管理方法
const handleTagManage = () => {
  if (checkSelectedNotes()) {
    showTagMenu.value = !showTagMenu.value
  }
}

// 修改闪卡转换方法
const toggleFlashcard = () => {
  if (checkSelectedNotes()) {
    showFlashcardConfirm.value = true
  }
}

// 确认转换为闪卡
const confirmConvertToFlashcard = async () => {
  try {
    await flashcardStore.batchConvertToFlashcards(noteStore.selectedNoteIds)
    message.success('批量转换闪卡成功')
    showFlashcardConfirm.value = false
    noteStore.toggleMultiSelectMode()
  } catch (error) {
    message.error('批量转换闪卡失败')
  }
}

// 修改删除操作方法
const handleDelete = async () => {
  if (checkSelectedNotes()) {
    showDeleteConfirm.value = true
  }
}

// 确认删除
const confirmDelete = async () => {
  try {
    await noteStore.batchSoftDeleteNotes(noteStore.selectedNoteIds)
    message.success('批量删除笔记成功')
    showDeleteConfirm.value = false
    noteStore.toggleMultiSelectMode()
  } catch (error) {
    message.error('批量删除笔记失败')
  }
}

// 处理添加标签
const handleAddTag = async (tagId: string) => {
  try {
    await tagStore.batchAddTagToNotes(noteStore.selectedNoteIds, tagId)
    message.success('批量添加标签成功')
    showTagMenu.value = false
    noteStore.toggleMultiSelectMode()
  } catch (error) {
    message.error('批量添加标签失败')
  }
}

// 添加合并相关的方法
const handleMerge = () => {
  if (noteStore.selectedNoteIds.length < 2) {
    message.info('请至少选择两张卡片进行合并')
    return
  }
  showMergeConfirm.value = true
}

const confirmMerge = async () => {
  try {
    await noteStore.mergeNotes(noteStore.selectedNoteIds)
    message.success('笔记合并成功')
    showMergeConfirm.value = false
  } catch (error) {
    message.error('笔记合并失败')
  }
}

const moveButtonRef = ref<HTMLElement | null>(null)
const changeTypeButtonRef = ref<any>(null)
const tagButtonRef = ref<any>(null)
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
