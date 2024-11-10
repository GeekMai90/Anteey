<template>
  <div class="backup-settings">
    <div class="settings-content-header">
      <div class="icon">
        <DatabaseDownload
          theme="outline"
          size="20"
          fill="var(--color-icon-menu-default)"
          :strokeWidth="3"
        />
      </div>
      <div class="name">备份</div>
    </div>
    <div class="backup-settings-divider"></div>
    <div class="backup-settings-content">
      <div class="backup-item">
        <div class="title">导出数据</div>
        <div class="description">
          将所有卡片笔记以 Markdown 格式导出，保留原有结构和内容的完整性。
        </div>
        <div class="backup-item-button" @click="handleBulkExport">立即导出</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DatabaseDownload } from '@icon-park/vue-next'
import { useNoteMenu } from '@renderer/composables/useNoteMenu'
import { ref } from 'vue'

const noteId = ref('')
const { handleBulkExport } = useNoteMenu({
  noteId: noteId.value,
  menuItems: ['star']
})
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
  margin: 4px 0;
  width: 100%;
}

.backup-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;

  .backup-item {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin: 15px 0;
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
      color: var(--color-text-inversion);
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
</style>
