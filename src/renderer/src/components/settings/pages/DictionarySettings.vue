<template>
  <div class="dictionary-settings">
    <div class="settings-content-header">
      <div class="icon">
        <BookOne theme="outline" size="20" fill="var(--color-icon-menu-default)" :strokeWidth="3" />
      </div>
      <div class="name">词库管理</div>
    </div>
    <div class="backup-settings-divider"></div>
    <div class="dictionary-settings-content">
      <div class="dictionary-item" @click="openDictionaryManage">
        <div class="title">词库管理</div>
        <div class="description">管理系统词库，添加或删除词条。</div>
        <div class="dictionary-item-button">进入管理</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOne } from '@icon-park/vue-next'
import { useRouter } from 'vue-router'
import { useUIStore } from '@renderer/stores/useUIStore'

const router = useRouter()
const uiStore = useUIStore()

const openDictionaryManage = () => {
  router.push('/dictionary/manage')
  uiStore.closeSettingsPage()
}
</script>

<style scoped lang="scss">
.dictionary-settings {
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

.dictionary-settings-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 20px;

  .dictionary-item {
    width: 100%;
    padding: 20px;
    background: var(--color-background-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .title {
      font-size: 18px;
      line-height: 1;
      color: var(--color-text-primary);
      font-weight: 500;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 12px;
    }

    .description {
      font-size: 14px;
      line-height: 1.4;
      color: var(--color-text-secondary);
      margin-bottom: 15px;
      user-select: none;
    }

    .dictionary-item-button {
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
