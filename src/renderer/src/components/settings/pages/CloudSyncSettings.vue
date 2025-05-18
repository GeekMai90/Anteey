<template>
  <div class="cloud-sync-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">云同步</div>
    </div>
    <div class="cloud-sync-settings-divider"></div>
    <Description
      :text="[
        '选择云同步方式，支持 WebDAV 和 S3 协议。',
        '切换同步方式后，需要先保存配置，然后点击立即同步按钮进行一次同步。',
        '开启 S3 云同步后，在应用启动或退出时，会自动进行一次同步。WebDAV 同步则需要手动同步。'
      ]"
    />
    <div class="cloud-sync-settings-content">
      <!-- 同步方式选择 -->
      <div class="sync-type-selector">
        <div class="title">同步方式</div>

        <div class="sync-type-form">
          <div class="form-item">
            <div class="label">同步类型</div>
            <div class="value">
              <Dropdown
                :items="syncTypeItems"
                :value="syncType"
                width="300"
                showArrow
                @select="handleSyncTypeSelect"
              >
                {{ syncTypeItems.find((item) => item.key === syncType)?.label }}
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      <!-- WebDAV 设置 -->
      <WebDAVSettings v-if="syncType === 'webdav'" class="sync-settings-section" />

      <!-- S3 设置 -->
      <S3Settings v-if="syncType === 's3'" class="sync-settings-section" />

      <!-- 未开启同步时的提示 -->
      <div v-if="syncType === 'none'" class="sync-disabled">
        <EmptyState
          text="选择一种同步方式来启用云同步功能，可以将您的数据安全地备份到云端。"
          alt="未开启云同步"
        >
        </EmptyState>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CloudStorage } from '@icon-park/vue-next'
import WebDAVSettings from './WebDAVSettings.vue'
import S3Settings from './s3Settings.vue'
import { useCloudSyncStore } from '@renderer/stores/cloudSyncStore'
import type { CloudSyncType } from '@shared/types'
import Dropdown from '@renderer/components/ui/dropdowns/Dropdown.vue'
import EmptyState from '@renderer/components/ui/EmptyState.vue'
import Description from '@renderer/components/ui/Description.vue'
// // 同步类型选项
// const syncTypes = [
//   { value: 'none' as const, label: '不开启云同步' },
//   { value: 'webdav' as const, label: 'WebDAV 同步' },
//   { value: 's3' as const, label: 'S3 同步' }
// ] as const

const cloudSyncStore = useCloudSyncStore()
const syncType = ref<CloudSyncType>('none')

// 初始化配置
onMounted(async () => {
  try {
    const config = await cloudSyncStore.getCurrentConfig()
    if (config) {
      syncType.value = config.syncType
    }
  } catch (error) {
    console.error('初始化云同步配置失败:', error)
  }
})

// 修改同步类型选项的格式以匹配 Dropdown 组件的要求
const syncTypeItems = [
  { key: 'none', label: '不开启云同步' },
  { key: 'webdav', label: 'WebDAV 同步' },
  { key: 's3', label: 'S3 同步' }
]

// 修改选择处理方法
const handleSyncTypeSelect = async (key: string) => {
  try {
    await cloudSyncStore.switchSyncType(key as CloudSyncType)
    syncType.value = key as CloudSyncType
  } catch (error) {
    console.error('切换同步类型失败:', error)
  }
}
</script>

<style scoped lang="scss">
.cloud-sync-settings {
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
  padding: 0 20px;

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

.cloud-sync-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.cloud-sync-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;
  padding: 0 20px;
}

.sync-type-selector {
  width: 100%;
  margin-bottom: 30px;
  padding: 0 10px;

  .title {
    font-size: 18px;
    line-height: 1;
    color: var(--color-text-primary);
    font-weight: 500;
    margin-bottom: 15px;
    user-select: none;
  }

  .description {
    font-size: 14px;
    line-height: 1;
    color: var(--color-text-secondary);
    margin-bottom: 15px;
    user-select: none;
  }
}

.sync-type-form {
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
      max-width: 300px;
    }
  }
}

.sync-settings-section {
  margin-top: 20px;
}

.sync-disabled {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;

  .sync-disabled-icon {
    color: var(--color-text-secondary);
    opacity: 0.5;
    margin-bottom: 20px;
  }

  .title {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }
}
</style>
