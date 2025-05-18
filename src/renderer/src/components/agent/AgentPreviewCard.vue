<template>
  <div class="agent-card">
    <div class="card-header">
      <div class="agent-icon">
        <RobotOne theme="outline" size="24" :strokeWidth="3" />
      </div>
      <div class="agent-name">{{ agent.name }}</div>
      <div class="actions">
        <IconButton :icon="Edit" tooltip="编辑" size="medium" @click.stop="$emit('edit', agent)" />
        <IconButton
          :icon="Delete"
          tooltip="删除"
          size="medium"
          @click.stop="$emit('delete', agent)"
        />
      </div>
    </div>
    <div class="card-content">
      <div class="description">{{ agent.description || '暂无描述' }}</div>
      <div class="info">
        <div class="model">模型: {{ getModelName(agent.modelConfigId) }}</div>
        <div class="temperature">温度: {{ agent.temperature }}</div>
      </div>
      <div
        v-if="agent.includeNoteContext"
        class="menu-status"
        :class="{ active: agent.includeNoteContext }"
      >
        笔记菜单专属
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RobotOne, Edit, Delete } from '@icon-park/vue-next'
import IconButton from '@renderer/components/ui/buttons/IconButton.vue'
import type { Agent } from '@shared/types'
import { useModelConfigStore } from '@renderer/stores/modelConfigStore'
import { onMounted } from 'vue'

const modelConfigStore = useModelConfigStore()

defineProps<{
  agent: Agent
}>()

defineEmits<{
  (e: 'edit', agent: Agent): void
  (e: 'delete', agent: Agent): void
}>()

// 确保模型配置已加载
onMounted(async () => {
  if (modelConfigStore.configs.length === 0) {
    await modelConfigStore.loadConfigs()
  }
})

// 获取模型名称
const getModelName = (modelConfigId: string) => {
  const config = modelConfigStore.configs.find((config) => config.id === modelConfigId)
  return config?.name || '未知模型'
}
</script>

<style lang="scss" scoped>
.agent-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
  position: relative;

  .card-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    position: relative;

    .agent-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--color-primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;

      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      :deep(svg) {
        width: 24px;
        height: 24px;
        color: var(--color-primary);
      }
    }

    .agent-name {
      flex: 1;
      font-weight: 600;
      font-size: 16px;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: flex;
      gap: 4px;
      visibility: hidden;
      transition: visibility 0.2s ease;
      flex-shrink: 0;
      margin-left: 8px;

      :deep(.icon-button) {
        opacity: 0;
        transition: opacity 0.2s ease;
      }
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-primary);

    .actions {
      visibility: visible;

      :deep(.icon-button) {
        opacity: 1;
      }
    }
  }

  .card-content {
    .description {
      color: var(--color-text-secondary);
      font-size: 14px;
      margin-bottom: 12px;
      min-height: 40px;

      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .info {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .menu-status {
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      display: inline-block;

      &.active {
        background: var(--color-primary-light);
        color: var(--color-primary);
      }
    }
  }
}
</style>
