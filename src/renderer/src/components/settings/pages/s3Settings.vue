<template>
  <div class="s3-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">S3 同步</div>
    </div>
    <div class="s3-settings-divider"></div>
    <div class="s3-settings-content">
      <div class="s3-content">
        <!-- S3 服务配置 -->
        <div class="s3-item">
          <div class="title">S3 服务</div>
          <div class="description">
            配置 S3 服务信息，支持 AWS S3、阿里云 OSS、腾讯云 COS 等兼容 S3 协议的服务。
          </div>
          <div class="s3-settings-form">
            <div class="form-item">
              <div class="label">服务提供商</div>
              <div class="value">
                <div class="select-wrapper">
                  <div class="select" @click="showProviderSelect = !showProviderSelect">
                    <span class="selected-value">{{ getProviderName(provider) }}</span>
                    <div class="select-arrow">
                      <Down theme="outline" size="16" :strokeWidth="3" />
                    </div>
                  </div>
                  <div v-show="showProviderSelect" class="select-dropdown">
                    <div
                      v-for="type in providers"
                      :key="type.value"
                      class="select-option"
                      :class="{ active: provider === type.value }"
                      @click="selectProvider(type.value)"
                    >
                      {{ type.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-item">
              <div class="label">区域</div>
              <div class="value">
                <div class="select-wrapper">
                  <div class="select" @click="showRegionSelect = !showRegionSelect">
                    <span class="selected-value">{{ getRegionName(region) }}</span>
                    <div class="select-arrow">
                      <Down theme="outline" size="16" :strokeWidth="3" />
                    </div>
                  </div>
                  <div v-show="showRegionSelect" class="select-dropdown">
                    <div
                      v-for="r in getRegionsByProvider(provider)"
                      :key="r.value"
                      class="select-option"
                      :class="{ active: region === r.value }"
                      @click="selectRegion(r.value)"
                    >
                      {{ r.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-item">
              <div class="label">存储桶</div>
              <div class="value">
                <input v-model="bucket" type="text" placeholder="请输入存储桶名称" />
              </div>
            </div>
            <div class="form-item">
              <div class="label">访问密钥 ID</div>
              <div class="value">
                <input v-model="accessKeyId" type="text" placeholder="请输入访问密钥 ID" />
              </div>
            </div>
            <div class="form-item">
              <div class="label">访问密钥</div>
              <div class="value">
                <input v-model="secretAccessKey" type="password" placeholder="请输入访问密钥" />
              </div>
            </div>
            <div class="s3-actions">
              <div
                class="s3-item-button test"
                :class="{ 'is-loading': isConnecting }"
                @click="handleTestConnection"
              >
                {{ isConnecting ? '测试中...' : '测试连接' }}
              </div>
              <div
                class="s3-item-button"
                :class="{ 'is-loading': isSaving }"
                @click="handleSaveConfig"
              >
                {{ isSaving ? '保存中...' : '保存配置' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 同步设置 -->
        <div class="s3-item">
          <div class="title">同步设置</div>
          <div class="description">配置自动同步和同步方式，确保数据的安全性和一致性。</div>
          <div class="s3-settings-form">
            <div class="form-item">
              <div class="label">自动同步</div>
              <div class="value">
                <div class="auto-sync-setting">
                  <Switch
                    :model-value="Boolean(autoSync)"
                    @update:model-value="autoSync = $event"
                  />
                  <div class="auto-sync-description">
                    {{ autoSync ? '定时自动同步' : '仅支持手动同步' }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="autoSync" class="form-item">
              <div class="label">同步间隔</div>
              <div class="value">
                <div class="select-wrapper sync-interval-select">
                  <div class="select" @click="showIntervalSelect = !showIntervalSelect">
                    <span class="selected-value">{{ getSyncIntervalText(syncInterval) }}</span>
                    <div class="select-arrow">
                      <Down theme="outline" size="16" :strokeWidth="3" />
                    </div>
                  </div>
                  <div v-show="showIntervalSelect" class="select-dropdown">
                    <div
                      v-for="interval in syncIntervals"
                      :key="interval.value"
                      class="select-option"
                      :class="{ active: syncInterval === interval.value }"
                      @click="selectInterval(interval.value)"
                    >
                      {{ interval.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="s3-actions">
              <div class="s3-item-button" :class="{ 'is-loading': isSyncing }" @click="handleSync">
                {{ isSyncing ? '同步中...' : '立即同步' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 同步历史 -->
        <div class="s3-item">
          <div class="title">同步历史</div>
          <div class="sync-history">
            <div v-if="s3Store.syncHistory.length === 0" class="history-empty">
              <div class="empty-text">暂无同步历史</div>
            </div>
            <div v-for="item in s3Store.syncHistory" :key="item.id" class="history-item">
              <div class="history-item-left">
                <div class="history-item-icon">
                  <CloudStorage
                    theme="outline"
                    size="16"
                    :strokeWidth="3"
                    fill="var(--color-text-secondary)"
                  />
                </div>
                <div class="history-item-info">
                  <div class="history-item-name">
                    {{ item.type === 'auto' ? '自动同步' : '手动同步' }}
                  </div>
                  <div class="history-item-meta">
                    <span class="time">{{
                      new Date(item.timestamp).toLocaleString('zh-CN', {
                        timeZone: 'Asia/Shanghai'
                      })
                    }}</span>
                    <span class="dot">·</span>
                    <span class="status" :class="item.status">
                      {{ item.status === 'success' ? '成功' : '失败' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CloudStorage, Down } from '@icon-park/vue-next'
import { useS3Store } from '@renderer/stores/s3Store'
import { ref, onMounted, computed, watch } from 'vue'
import type { S3Provider, S3Config } from '@shared/types'
import { message } from '../../../utils/message'
import Switch from '@renderer/components/ui/Switch.vue'

const s3Store = useS3Store()
const isConnecting = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)

// 表单数据
const provider = ref<S3Provider>('aws')
const region = ref('')
const bucket = ref('')
const accessKeyId = ref('')
const secretAccessKey = ref('')
const endpoint = ref('')
const autoSync = computed({
  get: () => s3Store.config?.autoSync ?? false,
  set: async (value) => {
    await s3Store.updateConfig({ autoSync: value })
  }
})
const syncInterval = computed({
  get: () => s3Store.config?.syncInterval ?? 15,
  set: async (value) => {
    await s3Store.updateConfig({ syncInterval: value })
  }
})

// 添加状态
const showProviderSelect = ref(false)
const showRegionSelect = ref(false)
const showIntervalSelect = ref(false)

// 添加类型定义
interface ProviderOption {
  value: S3Provider
  label: string
}

// 服务提供商选项
const providers: ProviderOption[] = [
  { value: 'aws', label: 'AWS S3' },
  { value: 'aliyun', label: '阿里云 OSS' },
  { value: 'tencent', label: '腾讯云 COS' },
  { value: 'binfenyun', label: '缤纷云 S4' }
]

// 添加同步间隔选项的类型
interface SyncIntervalOption {
  value: number
  label: string
}

// 同步间隔选项
const syncIntervals: SyncIntervalOption[] = [
  { value: 0.5, label: '30秒' },
  { value: 5, label: '5分钟' },
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' }
]

// 添加区域选项类型
interface RegionOption {
  value: string
  label: string
}

// AWS 区域选项
const awsRegions: RegionOption[] = [
  { value: 'us-east-1', label: '美国东部（弗吉尼亚）' },
  { value: 'us-east-2', label: '美国东部（俄亥俄）' },
  { value: 'us-west-1', label: '美国西部（加利福尼亚）' },
  { value: 'us-west-2', label: '美国西部（俄勒冈）' },
  { value: 'ap-east-1', label: '亚太地区（香港）' },
  { value: 'ap-northeast-1', label: '亚太地区（东京）' },
  { value: 'ap-southeast-1', label: '亚太地区（新加坡）' }
]

// 阿里云区域选项
const aliyunRegions: RegionOption[] = [
  { value: 'oss-cn-hangzhou', label: '华东 1（杭州）' },
  { value: 'oss-cn-shanghai', label: '华东 2（上海）' },
  { value: 'oss-cn-beijing', label: '华北 2（北京）' },
  { value: 'oss-cn-shenzhen', label: '华南 1（深圳）' },
  { value: 'oss-cn-hongkong', label: '香港' }
]

// 腾讯云区域选项
const tencentRegions: RegionOption[] = [
  { value: 'ap-beijing', label: '华北地区（北京）' },
  { value: 'ap-shanghai', label: '华东地区（上海）' },
  { value: 'ap-guangzhou', label: '华南地区（广州）' },
  { value: 'ap-hongkong', label: '中国香港' },
  { value: 'ap-singapore', label: '新加坡' }
]

// 添加缤纷云区域选项
const binfenyunRegions: RegionOption[] = [{ value: 'cn-east-1', label: '华东区域 (上海)' }]

// 获取区域名称
const getRegionName = (regionValue: string): string => {
  const allRegions = [...awsRegions, ...aliyunRegions, ...tencentRegions, ...binfenyunRegions]
  return allRegions.find((r) => r.value === regionValue)?.label || regionValue
}

// 根据服务提供商获取对应的区域列表
const getRegionsByProvider = (providerType: S3Provider): RegionOption[] => {
  switch (providerType) {
    case 'aws':
      return awsRegions
    case 'aliyun':
      return aliyunRegions
    case 'tencent':
      return tencentRegions
    case 'binfenyun':
      return binfenyunRegions
    case 'custom':
      return []
  }
}

// 选择区域
const selectRegion = (regionValue: string): void => {
  region.value = regionValue
  showRegionSelect.value = false
}

// 添加方法
const getProviderName = (type: S3Provider): string => {
  return providers.find((t) => t.value === type)?.label || '未知'
}

const getSyncIntervalText = (interval: number) => {
  return syncIntervals.find((i) => i.value === interval)?.label || '未知'
}

// 修改服务提供商选择逻辑
const selectProvider = (type: S3Provider): void => {
  // 如果选择了不同的提供商，则尝试加载该提供商的配置
  if (provider.value !== type) {
    // 切换到新的提供商
    provider.value = type

    // 尝试从 store 中获取该提供商的配置
    if (s3Store.providerConfigs[type]) {
      const savedConfig = s3Store.providerConfigs[type]
      region.value = savedConfig.region || ''
      bucket.value = savedConfig.bucket || ''
      accessKeyId.value = savedConfig.accessKeyId || ''
      secretAccessKey.value = savedConfig.secretAccessKey || ''
      endpoint.value = savedConfig.endpoint || ''
    } else {
      // 如果没有保存的配置，则清空表单
      region.value = ''
      bucket.value = ''
      accessKeyId.value = ''
      secretAccessKey.value = ''
      endpoint.value = ''
    }
  }

  showProviderSelect.value = false
}

const selectInterval = async (value: number) => {
  syncInterval.value = value
  showIntervalSelect.value = false
}

onMounted(async () => {
  await s3Store.fetchConfig()
  await s3Store.fetchSyncHistory()

  // 获取所有提供商的配置
  await s3Store.fetchAllProviderConfigs()

  if (s3Store.config) {
    provider.value = s3Store.config.provider
    region.value = s3Store.config.region
    bucket.value = s3Store.config.bucket
    accessKeyId.value = s3Store.config.accessKeyId
    secretAccessKey.value = s3Store.config.secretAccessKey
    endpoint.value = s3Store.config.endpoint || ''
  }

  // 添加点击外部关闭下拉菜单
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.select-wrapper')) {
      showProviderSelect.value = false
      showRegionSelect.value = false
      showIntervalSelect.value = false
    }
  })
})

async function handleTestConnection() {
  isConnecting.value = true
  try {
    if (!region.value || !bucket.value || !accessKeyId.value || !secretAccessKey.value) {
      message.error('请填写完整的配置信息')
      return
    }

    // 根据不同的服务提供商构建配置
    const testConfig: Partial<S3Config> = {
      provider: provider.value,
      region: region.value,
      bucket: bucket.value,
      accessKeyId: accessKeyId.value,
      secretAccessKey: secretAccessKey.value
    }

    // 根据服务提供商添加特定配置
    switch (provider.value) {
      case 'aliyun':
        testConfig.endpoint = `https://${bucket.value}.${region.value}.aliyuncs.com`
        break
      case 'tencent':
        // 腾讯云 COS 的正确端点格式
        // 我们不设置完整的端点，仅用于参考格式：https://{存储桶名称}.cos.{地域}.myqcloud.com
        // SDK 会根据 region 和 bucket 自动构建正确的 URL
        break
      case 'binfenyun':
        // 缤纷云配置，使用真实端点和区域
        testConfig.endpoint = `https://s3.bitiful.net`
        break
      case 'aws':
        // AWS 不需要手动设置 endpoint
        break
    }

    try {
      const success = await s3Store.testConnection(testConfig)
      if (success) {
        message.success('连接成功')
      }
    } catch (error: any) {
      console.error('连接测试失败:', error)
      // 如果是 NoSuchKey 错误，说明连接是成功的
      if (error.Code === 'NoSuchKey') {
        message.success('连接成功')
        return
      }

      // 处理常见错误
      let errorMessage = '连接失败'
      if (error.Code) {
        switch (error.Code) {
          case 'InvalidAccessKeyId':
            errorMessage = '访问密钥 ID 无效'
            break
          case 'SignatureDoesNotMatch':
            errorMessage = '访问密钥错误'
            break
          case 'NoSuchBucket':
            errorMessage = '存储桶不存在'
            break
          case 'AccessDenied':
            errorMessage = '访问被拒绝，请检查权限设置'
            break
          case 'PathStyleDomainForbidden':
            errorMessage = '服务不支持路径样式访问，请确认配置是否正确'
            break
          default:
            errorMessage = `连接失败: ${error.Code}`
        }
      }

      if (error.RecommendDoc) {
        console.log('故障排查文档:', error.RecommendDoc)
      }

      message.error(errorMessage)
    }
  } finally {
    isConnecting.value = false
  }
}

async function handleSaveConfig() {
  isSaving.value = true
  try {
    console.log('s3Settings → 开始保存配置')

    // 构建配置，使用与测试连接相同的逻辑
    const saveConfig: Partial<S3Config> = {
      provider: provider.value,
      region: region.value,
      bucket: bucket.value,
      accessKeyId: accessKeyId.value,
      secretAccessKey: secretAccessKey.value,
      syncInterval: syncInterval.value,
      autoSync: autoSync.value, // 保持自动同步设置
      enabled: true // 保存时默认启用
    }

    // 根据服务提供商添加特定配置
    switch (provider.value) {
      case 'aliyun':
        saveConfig.endpoint = `https://${bucket.value}.${region.value}.aliyuncs.com`
        break
      case 'tencent':
        // 腾讯云 COS 的端点由 SDK 根据 region 和 bucket 自动构建
        // 参考格式: https://{存储桶名称}.cos.{地域}.myqcloud.com
        break
      case 'binfenyun':
        // 缤纷云配置，使用真实端点
        saveConfig.endpoint = `https://s3.bitiful.net`
        break
      case 'aws':
        // AWS 不需要手动设置 endpoint
        break
    }

    // 检查必填字段
    if (
      !saveConfig.region ||
      !saveConfig.bucket ||
      !saveConfig.accessKeyId ||
      !saveConfig.secretAccessKey
    ) {
      message.error('请填写完整的配置信息')
      return
    }

    console.log('s3Settings → 即将调用store.updateConfig方法')

    try {
      // 保存配置，但不自动重启同步 (restartSync: false)
      await s3Store.updateConfig(saveConfig, { restartSync: false })
      message.success('配置已保存，您可以通过"立即同步"按钮手动触发同步')
    } catch (storeError) {
      console.error('s3Settings → 调用store.updateConfig失败:', storeError)
      message.error('保存失败：' + (storeError instanceof Error ? storeError.message : '未知错误'))
    }
  } catch (error) {
    console.error('s3Settings → 保存配置失败:', error)
    message.error('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isSaving.value = false
  }
}

async function handleSync() {
  isSyncing.value = true
  try {
    await s3Store.triggerSync()
    message.success('同步完成，正在刷新...')
    // 同步完成后重新加载历史记录
    await s3Store.fetchSyncHistory()

    // 确保同步状态被重置
    setTimeout(() => {
      isSyncing.value = false
    }, 500)

    // 延迟一秒刷新页面，让用户看到成功提示
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error('同步失败:', error)
    message.error('同步失败: ' + (error instanceof Error ? error.message : '未知错误'))
    isSyncing.value = false
  }
}

// 添加调试代码
watch(
  () => s3Store.syncHistory,
  (history) => {
    console.log('同步历史更新:', history)
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
.s3-settings {
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

.s3-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-bottom: 10px;
  width: 100%;
  opacity: 1;
  flex-shrink: 0;
}

.s3-settings-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-bottom: 58px;

  .s3-content {
    padding-right: 10px;

    .s3-item {
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

      .s3-item-button {
        width: 80px;
        height: 35px;
        background-color: var(--color-primary);
        color: var(--color-text-white);
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

        &.test {
          background-color: var(--color-primary);
        }

        &.is-loading {
          opacity: 0.7;
          cursor: not-allowed;
        }
      }
    }
  }
}

.s3-settings-form {
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

      input,
      select {
        width: 100%;
        max-width: 300px;
        height: 35px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 0 12px;
        font-size: 14px;
        color: var(--color-text-primary);
        outline: none;
        transition: all 0.2s ease;

        &:focus {
          border-color: var(--color-primary);
        }

        &::placeholder {
          color: var(--color-text-placeholder);
        }
      }
    }
  }
}

.s3-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.auto-sync-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .auto-sync-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.sync-history {
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
    border-bottom: 1px solid var(--color-border);
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
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

      .status {
        &.success {
          color: var(--color-success);
        }
        &.error {
          color: var(--color-error);
        }
      }
    }
  }

  .history-empty {
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: center;

    .empty-text {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
  }
}

.select-wrapper {
  position: relative;
  width: 100%;
  max-width: 300px;

  &.sync-interval-select {
    max-width: 120px;

    .select-dropdown {
      min-width: 120px;
    }
  }

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

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-scrollbar);
      border-radius: 4px;
    }
  }
}
</style>
