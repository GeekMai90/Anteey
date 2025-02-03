<template>
  <div class="backup-settings">
    <div class="settings-content-header">
      <div class="icon">
        <DatabaseDownload
          theme="outline"
          size="20"
          fill="var(--color-icon-primary)"
          :strokeWidth="3"
        />
      </div>
      <div class="name">备份</div>
    </div>
    <div class="backup-settings-divider"></div>
    <div class="backup-settings-content">
      <div class="backup-content">
        <div class="backup-item">
          <div class="title">导出数据</div>
          <div class="description">
            将所有卡片笔记以 Markdown 格式导出，保留原有结构和内容的完整性。
          </div>
          <div class="backup-item-button" @click="handleBulkExport">立即导出</div>
        </div>

        <div class="backup-item">
          <div class="title">数据库备份</div>
          <div class="description">
            备份整个数据库，包括所有笔记、标签、关系等数据。建议定期备份以防数据丢失。
          </div>
          <div class="backup-settings-form">
            <div class="form-item">
              <div class="label">备份路径</div>
              <div class="value">
                <div class="path" @click="handleSelectBackupPath">
                  {{ backupStore.settings?.backup_path || '点击选择备份路径' }}
                </div>
              </div>
            </div>
            <div class="form-item">
              <div class="label">自动备份</div>
              <div class="value">
                <div class="auto-backup-setting">
                  <Switch :model-value="autoBackup" @update:model-value="autoBackup = $event" />
                  <div class="auto-backup-description">
                    {{ autoBackup ? '应用启动和关闭时自动备份' : '仅支持手动备份' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="backup-actions">
              <div
                class="backup-item-button"
                :class="{ 'is-loading': isBackingUp }"
                @click="handleCreateBackup"
              >
                {{ isBackingUp ? '备份中...' : '立即备份' }}
              </div>
              <div
                class="backup-item-button restore"
                :class="{ 'is-loading': isRestoring }"
                @click="handleRestoreClick"
              >
                {{ isRestoring ? '恢复中...' : '备份恢复' }}
              </div>
            </div>
          </div>
        </div>

        <div class="backup-item">
          <div class="title-row">
            <div class="title">备份历史</div>
            <div class="clear-history" @click="handleClearHistory">清空历史</div>
          </div>
          <div class="backup-history">
            <div v-if="backupStore.history.length === 0" class="history-empty">
              <div class="empty-text">暂无备份历史</div>
            </div>
            <div
              v-for="item in backupStore.history"
              :key="item.id"
              class="history-item"
              @click="handleRestoreClick"
            >
              <div class="history-item-left">
                <div class="history-item-icon">
                  <DatabaseDownload
                    theme="outline"
                    size="16"
                    :strokeWidth="3"
                    fill="var(--color-text-secondary)"
                  />
                </div>
                <div class="history-item-info">
                  <div class="history-item-name">{{ item.backup_file_name }}</div>
                  <div class="history-item-meta">
                    <span class="time">{{
                      new Date(item.created_at).toLocaleString('zh-CN', {
                        timeZone: 'Asia/Shanghai',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })
                    }}</span>
                    <span class="dot">·</span>
                    <span class="size">{{ formatBytes(item.backup_size) }}</span>
                  </div>
                </div>
              </div>
              <div class="history-item-action">
                <div class="restore-button">从此备份恢复</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-model:visible="showRestoreConfirm"
    title="确定要恢复此备份吗？"
    message="当前的所有数据将被替换。"
    type="danger"
    confirm-text="确定恢复"
    cancel-text="取消"
    @confirm="handleRestoreConfirm"
  />
</template>

<script setup lang="ts">
import { DatabaseDownload } from '@icon-park/vue-next'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { useBackupStore } from '@renderer/stores/backupStore'
import { ref, onMounted, computed } from 'vue'
import { formatBytes } from '@renderer/utils/format'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import Switch from '@renderer/components/ui/Switch.vue'

const noteId = ref('')
const { handleBulkExport } = useNoteMenu({
  noteId: noteId.value,
  menuItems: ['star']
})

const backupStore = useBackupStore()
const isBackingUp = ref(false)
const isRestoring = ref(false)
const showRestoreConfirm = ref(false)
const selectedBackupPath = ref<string | null>(null)

const autoBackup = computed({
  get: () => backupStore.settings?.auto_backup ?? false,
  set: async (value) => {
    if (!backupStore.settings?.backup_path && value) {
      await handleSelectBackupPath()
      if (!backupStore.settings?.backup_path) {
        return
      }
    }
    await backupStore.updateSettings({ auto_backup: value })
  }
})

onMounted(async () => {
  await backupStore.getSettings()
  await backupStore.getHistory()
})

async function handleSelectBackupPath() {
  await backupStore.selectBackupDirectory()
}

async function handleCreateBackup() {
  if (!backupStore.settings?.backup_path) {
    await handleSelectBackupPath()
    if (!backupStore.settings?.backup_path) {
      return
    }
  }
  isBackingUp.value = true
  try {
    await backupStore.createBackup()
  } finally {
    isBackingUp.value = false
  }
}

async function handleRestoreClick() {
  const backupPath = await backupStore.selectBackupFile()
  if (!backupPath) return

  selectedBackupPath.value = backupPath
  showRestoreConfirm.value = true
}

async function handleRestoreConfirm() {
  if (!selectedBackupPath.value) return

  isRestoring.value = true
  try {
    await backupStore.restoreBackup(selectedBackupPath.value)
  } finally {
    isRestoring.value = false
  }
}

async function handleClearHistory() {
  try {
    await window.electronAPI.backup.clearBackupHistory()
    await backupStore.getHistory()
  } catch (error) {
    console.error('清空备份历史失败:', error)
  }
}
</script>

<style scoped lang="scss">
.backup-settings {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
}

.settings-content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;

  .icon {
    background: none;
    border: 1px solid var(--color-border);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 4px;
    border-radius: 6px;

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .name {
    font-size: 20px;
    line-height: 1;
    font-weight: 500;
    user-select: none;
  }
}

.backup-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.backup-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;

  .backup-content {
    padding-right: 10px;

    .backup-item {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      margin-top: 4px;
      margin-bottom: 30px;

      .title {
        font-size: 18px;
        line-height: 1;
        color: var(--color-text-primary);
        font-weight: 500;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 15px;
        user-select: none;
      }

      .description {
        font-size: 14px;
        line-height: 1;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 15px;
        user-select: none;
      }

      .backup-item-button {
        width: 80px;
        height: 35px;
        background-color: var(--color-primary);
        color: var(--color-text-inverse);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;

        &:hover {
          opacity: 0.9;
        }
      }
    }
  }
}

.backup-settings-form {
  width: 100%;
  margin-top: 15px;

  .form-item {
    display: flex;
    align-items: center;
    margin-bottom: 15px;

    .label {
      width: 80px;
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .value {
      flex: 1;

      .path {
        font-size: 14px;
        color: var(--color-text-primary);
        cursor: pointer;
        padding: 8px 12px;
        background-color: var(--color-fill-secondary);
        border-radius: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &:hover {
          background-color: var(--color-fill-secondary-hover);
        }
      }
    }
  }
}

.backup-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;

  .backup-item-button {
    &.is-loading {
      opacity: 0.7;
      cursor: not-allowed;
    }

    &.restore {
      background-color: var(--color-warning);

      &:hover {
        opacity: 0.9;
      }
    }
  }
}

.backup-history {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;

  .history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    // background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    transition: all 0.2s ease;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--color-fill-secondary);

      .restore-button {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .history-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .history-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--color-fill-secondary);
    }

    .history-item-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-item-name {
      font-size: 14px;
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .history-item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-secondary);

      .dot {
        color: var(--color-text-placeholder);
      }

      .size {
        color: var(--color-text-secondary);
      }
    }

    .history-item-action {
      .restore-button {
        font-size: 13px;
        color: var(--color-primary);
        opacity: 0;
        transform: translateX(10px);
        transition: all 0.2s ease;

        &:hover {
          color: var(--color-primary-hover);
        }
      }
    }
  }

  .history-empty {
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    // background: var(--color-bg-secondary);

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
  }
}

.auto-backup-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .auto-backup-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.title-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .title {
    font-size: 18px;
    line-height: 1;
    color: var(--color-text-primary);
    font-weight: 500;
    user-select: none;
  }

  .clear-history {
    font-size: 13px;
    color: var(--color-warning);
    cursor: pointer;
    user-select: none;

    &:hover {
      color: var(--color-warning-hover);
    }
  }
}
</style>
