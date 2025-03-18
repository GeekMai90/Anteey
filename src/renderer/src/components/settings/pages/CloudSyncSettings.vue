<template>
  <div class="cloud-sync-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">云同步</div>
    </div>
    <div class="cloud-sync-settings-divider"></div>
    <div class="cloud-sync-settings-content">
      <!-- 同步方式选择 -->
      <div class="sync-type-selector">
        <div class="title">同步方式</div>
        <div class="description">选择云同步方式，支持 WebDAV 和 S3 协议。</div>
        <div class="description">
          切换同步方式后，需要先保存配置，然后点击立即同步按钮进行一次同步。
        </div>
        <div class="description">开启云同步后，在应用启动或退出时，会自动进行一次同步。</div>
        <div class="sync-type-form">
          <div class="form-item">
            <div class="label">同步类型</div>
            <div class="value">
              <div class="select-wrapper">
                <div class="select" @click="showSyncTypeSelect = !showSyncTypeSelect">
                  <span class="selected-value">{{ getSyncTypeName(syncType) }}</span>
                  <div class="select-arrow">
                    <Down theme="outline" size="16" :strokeWidth="3" />
                  </div>
                </div>
                <div v-show="showSyncTypeSelect" class="select-dropdown">
                  <div
                    v-for="type in syncTypes"
                    :key="type.value"
                    class="select-option"
                    :class="{ active: syncType === type.value }"
                    @click="selectSyncType(type.value)"
                  >
                    {{ type.label }}
                  </div>
                </div>
              </div>
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
        <div class="sync-disabled-content">
          <div class="sync-disabled-icon">
            <CloudStorage theme="outline" size="48" :strokeWidth="3" />
          </div>
          <div class="sync-disabled-text">
            <div class="title">未开启云同步</div>
            <div class="description">
              选择一种同步方式来启用云同步功能，可以将您的数据安全地备份到云端。
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CloudStorage, Down } from '@icon-park/vue-next'
import WebDAVSettings from './WebDAVSettings.vue'
import S3Settings from './s3Settings.vue'
import { useCloudSyncStore } from '@renderer/stores/cloudSyncStore'
import type { CloudSyncType } from '@shared/types'

// 同步类型选项
const syncTypes = [
  { value: 'none' as const, label: '不开启云同步' },
  { value: 'webdav' as const, label: 'WebDAV 同步' },
  { value: 's3' as const, label: 'S3 同步' }
] as const

const cloudSyncStore = useCloudSyncStore()
const syncType = ref<CloudSyncType>('none')
const showSyncTypeSelect = ref(false)

// 获取同步类型名称
const getSyncTypeName = (type: CloudSyncType): string => {
  return syncTypes.find((t) => t.value === type)?.label || '未知'
}

// 选择同步类型
const selectSyncType = async (type: CloudSyncType) => {
  try {
    await cloudSyncStore.switchSyncType(type)
    syncType.value = type
    showSyncTypeSelect.value = false
  } catch (error) {
    console.error('切换同步类型失败:', error)
  }
}

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

// 添加点击外部关闭下拉菜单
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (!target.closest('.select-wrapper')) {
    showSyncTypeSelect.value = false
  }
})
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
}

.sync-type-selector {
  width: 100%;
  margin-bottom: 30px;

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

.select-wrapper {
  position: relative;
  width: 100%;
  max-width: 300px;

  .select {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-hover-bg);
    }

    .select-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 100%;
      :deep(.i-icon) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }
  }

  .select-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: var(--shadow-card);

    .select-option {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 14px;
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-hover-bg);
      }

      &.active {
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }
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

  .sync-disabled-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    max-width: 400px;
    text-align: center;

    .sync-disabled-icon {
      color: var(--color-text-secondary);
      opacity: 0.5;
    }

    .sync-disabled-text {
      .title {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-primary);
        margin-bottom: 8px;
      }

      .description {
        font-size: 14px;
        color: var(--color-text-secondary);
        line-height: 1.5;
      }
    }
  }
}
</style>
