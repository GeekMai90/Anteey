<!-- SidebarFooterToolbar.vue -->
<template>
  <div class="sidebar-footer-toolbar">
    <el-tooltip content="新建卡片" placement="top" :show-after="1000">
      <el-button class="toolbar-button" @click="openNewCardDialog">
        <el-icon>
          <Plus />
        </el-icon>
        <span>New Card</span>
      </el-button>
    </el-tooltip>
    <div class="toolbar-icons">
      <el-tooltip content="搜索" placement="top" :show-after="1000">
        <el-button class="toolbar-button icon-only" @click="search">
          <el-icon>
            <Search />
          </el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="帮助" placement="top" :show-after="1000">
        <el-button class="toolbar-button icon-only" @click="showHelp">
          <el-icon>
            <QuestionFilled />
          </el-icon>
        </el-button>
      </el-tooltip>
    </div>
    <NewCardDialog
      :is-visible="isNewCardDialogVisible"
      @close="closeNewCardDialog"
      @create="handleCreateCard"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, Search, QuestionFilled } from '@element-plus/icons-vue'
import NewCardDialog from './NewCardDialog.vue'
import { useNoteStore } from '@/stores/noteStores'

const noteStore = useNoteStore()
const isNewCardDialogVisible = ref(false)

const openNewCardDialog = () => {
  isNewCardDialogVisible.value = true
}

const closeNewCardDialog = () => {
  isNewCardDialogVisible.value = false
}

const handleCreateCard = (newCard) => {
  // 使用 Pinia store 来添加新卡片
  noteStore.addNote({
    id: Date.now().toString(),
    title: newCard.title,
    content: newCard.content,
    createdAt: newCard.createdAt,
    updatedAt: newCard.updatedAt
  })
  alert('Card created successfully!')
  closeNewCardDialog()
}

const search = () => {
  console.log('Search')
}

const showHelp = () => {
  console.log('Show help')
}
</script>

<style scoped>
.sidebar-footer-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
  width: 200px;
  box-sizing: border-box;
}

.toolbar-button {
  border: none;
  background: none;
  padding: 6px 8px;
  color: #606266;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-button:hover {
  color: #409eff;
}

.toolbar-button .el-icon {
  font-size: 14px;
}

.toolbar-icons {
  display: flex;
  gap: 4px;
}

.icon-only {
  padding: 6px;
}

.icon-only .el-icon {
  margin: 0;
}
</style>
