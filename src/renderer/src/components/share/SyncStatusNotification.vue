<template>
  <div class="sync-status-notification" :class="{ active: isActive }">
    <div class="sync-status-content">
      <div class="sync-status-icon">
        <component
          :is="syncStatusIcon"
          theme="outline"
          size="20"
          :fill="iconColor"
          :strokeWidth="2"
        />
      </div>
      <div class="sync-status-message">
        {{ message }}
        <div v-if="showProgress" class="sync-progress">{{ syncState.progress }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWebDAVStore } from '@renderer/stores/webdavStore'
import { LinkCloud, LinkCloudFaild, LinkCloudSucess } from '@icon-park/vue-next'

const webdavStore = useWebDAVStore()

const isActive = computed(() => webdavStore.syncState.status !== 'idle')

const syncState = computed(() => webdavStore.syncState)

const showProgress = computed(() => syncState.value.status === 'syncing')

const syncStatusIcon = computed(() => {
  const status = syncState.value.status
  switch (status) {
    case 'syncing':
      return LinkCloud
    case 'error':
      return LinkCloudFaild
    case 'completed':
      return LinkCloudSucess
    default:
      return LinkCloud
  }
})

const iconColor = computed(() => {
  const status = syncState.value.status
  switch (status) {
    case 'error':
      return 'var(--color-error)'
    case 'completed':
      return 'var(--color-success)'
    default:
      return 'var(--color-icon-primary)'
  }
})

const message = computed(() => {
  const state = syncState.value
  const type = state.type
  const typeText =
    type === 'auto' ? '自动' : type === 'manual' ? '手动' : type === 'backup' ? '备份' : 'WebDAV'

  switch (state.status) {
    case 'syncing':
      return `${typeText}同步中...`
    case 'error':
      return `${typeText}同步失败: ${state.error || '未知错误'}`
    case 'completed':
      return `${typeText}同步完成`
    default:
      return ''
  }
})
</script>

<style lang="scss" scoped>
.sync-status-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  // background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  box-shadow: var(--shadow-card);
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s ease;
  pointer-events: none;
  z-index: 9999;

  &.active {
    opacity: 1;
    transform: translateY(0);
  }

  .sync-status-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .sync-status-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-fill-secondary);

      &.syncing {
        animation: rotate 1.5s linear infinite;
      }
    }

    .sync-status-message {
      flex: 1;
      font-size: 14px;
      color: var(--color-text-primary);

      .sync-progress {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
