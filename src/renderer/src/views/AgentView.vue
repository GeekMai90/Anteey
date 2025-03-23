<template>
  <div class="agent-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="topToolBar">
        <div class="topToolBar-header">
          <div class="topToolBar-left">
            <div class="icon">
              <Robot theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">AI 助手</div>
          </div>
          <div class="topToolBar-right">
            <!-- 分段按钮：全部/笔记菜单 -->
            <SegmentedButton
              v-model="displayMode"
              :options="displayOptions"
              width="140px"
              height="36px"
              name="display-mode"
              tooltipPlacement="top"
              class="display-mode-button"
            />
            <!-- 新增助手 -->
            <SpreadButton
              :icon="Plus"
              type="default"
              :height="36"
              :tooltip="{
                content: '新建AI助手',
                delay: { show: 1000 }
              }"
              tooltipPlacement="top"
              @click="openCreateAgent"
            >
              新增助手
            </SpreadButton>

            <!-- 搜索框 -->
            <div class="search-container">
              <SearchInput
                v-model="searchQuery"
                :width="150"
                :height="36"
                placeholder="搜索助手..."
                @input="handleSearch"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="agent-view-container">
      <!-- 空状态 -->
      <div v-if="filteredAgents.length === 0" class="empty-state">
        <img src="@renderer/assets/images/empty.svg" alt="暂无内容" class="empty-icon" />
        <div class="empty-text">暂无AI助手，点击右上角"新增助手"开始创建</div>
      </div>
      <!-- 卡片网格 -->
      <div v-else class="card-grid">
        <AgentPreviewCard
          v-for="agent in filteredAgents"
          :key="agent.id"
          :agent="agent"
          @edit="handleEditAgent"
          @delete="handleDeleteAgent"
        />
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <AgentEdited
      v-model:visible="showAgentEdited"
      :editingAgent="editingAgent"
      @success="handleEditSuccess"
    />

    <!-- 删除确认对话框 -->
    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      title="删除AI助手"
      message="确定要删除这个AI助手吗？此操作不可撤销。"
      type="danger"
      cancel-text="取消"
      confirm-text="删除"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Robot, Plus } from '@icon-park/vue-next'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import SegmentedButton from '@renderer/components/ui/SegmentedButton.vue'
import SpreadButton from '@renderer/components/ui/SpreadButton.vue'
import SearchInput from '@renderer/components/ui/SearchInput.vue'
import AgentPreviewCard from '@renderer/components/agent/AgentPreviewCard.vue'
import AgentEdited from '@renderer/components/agent/AgentEdited.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { useAgentStore } from '@renderer/stores/agentStore'
import type { Agent } from '@shared/types'

const agentStore = useAgentStore()
const searchQuery = ref('')
const displayMode = ref('all')
const showAgentEdited = ref(false)
const showDeleteConfirm = ref(false)
const editingAgent = ref<Agent | null>(null)
const pendingDeleteAgent = ref<Agent | null>(null)

// 显示选项
const displayOptions = [
  {
    value: 'all',
    label: '全部',
    tooltip: {
      content: '显示所有AI助手',
      delay: { show: 1000 }
    }
  },
  {
    value: 'menu',
    label: '笔记菜单',
    tooltip: {
      content: '只显示在笔记菜单中的助手',
      delay: { show: 1000 }
    }
  }
]

// 初始加载数据
onMounted(async () => {
  await agentStore.refreshAgents()
})

// 过滤后的助手列表
const filteredAgents = computed(() => {
  let agents = displayMode.value === 'all' ? agentStore.agents : agentStore.menuAgents
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    agents = agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) || agent.description?.toLowerCase().includes(query)
    )
  }
  return agents
})

// 处理搜索
const handleSearch = () => {
  // 使用计算属性自动过滤
}

// 打开创建助手对话框
const openCreateAgent = () => {
  editingAgent.value = null
  showAgentEdited.value = true
}

// 处理编辑助手
const handleEditAgent = (agent: Agent) => {
  editingAgent.value = agent
  showAgentEdited.value = true
}

// 处理删除助手
const handleDeleteAgent = (agent: Agent) => {
  pendingDeleteAgent.value = agent
  showDeleteConfirm.value = true
}

// 处理编辑成功
const handleEditSuccess = async () => {
  await agentStore.refreshAgents()
  showAgentEdited.value = false
}

// 处理确认删除
const handleConfirmDelete = async () => {
  if (pendingDeleteAgent.value) {
    await agentStore.deleteAgent(pendingDeleteAgent.value.id)
    showDeleteConfirm.value = false
    pendingDeleteAgent.value = null
  }
}

// 取消删除
const handleCancelDelete = () => {
  showDeleteConfirm.value = false
  pendingDeleteAgent.value = null
}
</script>

<style lang="scss" scoped>
.agent-view {
  height: 100vh;
  display: flex;
  flex-direction: column;

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--color-bg-primary);
  }

  .topToolBar {
    display: flex;
    align-items: center;
    padding: 0px 20px;
    background-color: var(--color-bg-primary);

    .topToolBar-header {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border);
    }
  }

  .topToolBar-left {
    position: relative;
    display: flex;
    align-items: center;
    border: none;
    background: none;
    border-radius: 6px;
    padding: 4px 0px;
    margin: 2px;

    .icon {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      padding: 0;
      border-radius: 8px;
      background-color: var(--color-primary-light);
      border: 1px solid var(--color-primary);

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 18px;
        height: 18px;
      }
    }

    .name {
      flex-grow: 0;
      text-align: left;
      color: var(--color-text-primary);
      font-size: 20px;
      font-weight: 600;
      margin-left: 8px;
      white-space: nowrap;
      writing-mode: horizontal-tb;
      user-select: none;
      line-height: 1;
    }
  }

  .topToolBar-right {
    display: flex;
    gap: 10px;
    align-items: center;

    .search-container {
      width: 150px;
    }
  }

  .agent-view-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    overflow: hidden;
    position: relative;
    background-color: var(--color-bg-primary);

    .card-grid-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: var(--color-bg-primary);
      position: relative;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      align-content: start;
      justify-content: center;
      padding: 20px;

      @media (max-width: 768px) {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
        padding: 16px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -90%);
      width: 100%;
      text-align: center;
      padding: 20px;

      .empty-icon {
        width: 300px;
        height: 300px;
      }

      .empty-text {
        color: var(--color-text-secondary);
        font-size: 14px;
        text-align: center;
      }
    }
  }
}
</style>
