<template>
  <div class="image-bed-settings">
    <div class="settings-content-header">
      <div class="icon">
        <CloudStorage theme="outline" size="20" fill="var(--color-icon-primary)" :strokeWidth="3" />
      </div>
      <div class="name">图床设置</div>
    </div>
    <div class="image-bed-settings-divider"></div>
    <div class="image-bed-settings-content">
      <div class="image-bed-content">
        <!-- 全局设置 -->
        <div class="image-bed-item">
          <div class="title">图床功能</div>
          <div class="description">
            启用图床功能后，新上传的图片会自动保存到本地并异步上传到图床，已有图片可手动迁移到图床。
          </div>
          <div class="image-bed-form">
            <div class="form-item">
              <div class="label">启用图床</div>
              <div class="value">
                <Switch
                  :model-value="Boolean(imageBedStore.settings?.enabled ?? false)"
                  @update:model-value="handleToggleEnabled"
                />
              </div>
            </div>
            <div v-if="imageBedStore.settings?.enabled" class="form-item">
              <div class="label">显示模式</div>
              <div class="value">
                <select
                  class="display-mode-select"
                  :value="imageBedStore.settings?.displayMode ?? 'auto'"
                  @change="handleDisplayModeChange"
                >
                  <option value="local-only">仅本地显示</option>
                  <option value="remote-first">优先远程显示</option>
                  <option value="auto">智能显示</option>
                </select>
              </div>
            </div>
            <div v-if="imageBedStore.settings?.enabled" class="form-item">
              <div class="label">自动上传</div>
              <div class="value">
                <div class="auto-upload-setting">
                  <Switch
                    :model-value="Boolean(imageBedStore.settings?.autoUpload ?? false)"
                    @update:model-value="handleToggleAutoUpload"
                  />
                  <div class="auto-upload-description">
                    {{
                      imageBedStore.settings?.autoUpload
                        ? '新图片自动上传到图床'
                        : '需要手动上传到图床'
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 阿里云OSS配置 -->
        <div v-if="imageBedStore.settings?.enabled" class="image-bed-item">
          <div class="title">阿里云OSS配置</div>
          <div class="description">配置阿里云OSS作为图床服务，支持自定义域名和路径前缀。</div>
          <div class="image-bed-form">
            <div class="form-item">
              <div class="label">配置名称</div>
              <div class="value">
                <input
                  v-model="configForm.name"
                  type="text"
                  class="config-input"
                  placeholder="为此配置起个名字"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">Access Key ID</div>
              <div class="value">
                <input
                  v-model="configForm.accessKeyId"
                  type="text"
                  class="config-input"
                  placeholder="请输入Access Key ID"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">Access Key Secret</div>
              <div class="value">
                <input
                  v-model="configForm.accessKeySecret"
                  type="password"
                  class="config-input"
                  placeholder="请输入Access Key Secret"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">存储桶名称</div>
              <div class="value">
                <input
                  v-model="configForm.bucket"
                  type="text"
                  class="config-input"
                  placeholder="请输入存储桶名称"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">地域</div>
              <div class="value">
                <select v-model="configForm.region" class="config-select">
                  <option value="">请选择地域</option>
                  <option value="oss-cn-hangzhou">华东 1（杭州）</option>
                  <option value="oss-cn-shanghai">华东 2（上海）</option>
                  <option value="oss-cn-beijing">华北 2（北京）</option>
                  <option value="oss-cn-shenzhen">华南 1（深圳）</option>
                  <option value="oss-cn-guangzhou">华南 2（广州）</option>
                  <option value="oss-cn-chengdu">西南 1（成都）</option>
                </select>
              </div>
            </div>
            <div class="form-item">
              <div class="label">自定义端点（可选）</div>
              <div class="value">
                <input
                  v-model="configForm.endpoint"
                  type="text"
                  class="config-input"
                  placeholder="https://oss-cn-hangzhou.aliyuncs.com"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">自定义域名（可选）</div>
              <div class="value">
                <input
                  v-model="configForm.customDomain"
                  type="text"
                  class="config-input"
                  placeholder="https://your-domain.com"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">路径前缀（可选）</div>
              <div class="value">
                <input
                  v-model="configForm.pathPrefix"
                  type="text"
                  class="config-input"
                  placeholder="images/"
                />
              </div>
            </div>
            <div class="form-item">
              <div class="label">设为默认配置</div>
              <div class="value">
                <div class="default-config-setting">
                  <Switch
                    :model-value="Boolean(configForm.isDefault ?? false)"
                    @update:model-value="handleToggleDefault"
                  />
                  <div class="default-config-description">
                    设为默认配置后，右键菜单上传图片时将使用此配置
                  </div>
                </div>
              </div>
            </div>
            <div class="config-actions">
              <Button
                :disabled="!isFormValid"
                type="default"
                :height="36"
                :class="{ 'is-loading': isTesting }"
                @click="handleTestConnection"
              >
                {{ isTesting ? '测试中...' : '测试连接' }}
              </Button>
              <Button
                :disabled="!isFormValid"
                type="primary"
                :height="36"
                :class="{ 'is-loading': isSaving }"
                @click="handleSaveConfig"
              >
                {{ isSaving ? '保存中...' : '保存配置' }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CloudStorage } from '@icon-park/vue-next'
import { useImageBedStore } from '@renderer/stores/imageBedStore'
import { message } from '@renderer/utils/message'
import Switch from '@renderer/components/ui/switch/Switch.vue'
import Button from '@renderer/components/ui/buttons/Button.vue'

const imageBedStore = useImageBedStore()

// 表单状态
const isTesting = ref(false)
const isSaving = ref(false)

// 配置表单数据
const configForm = ref({
  id: '',
  name: '',
  accessKeyId: '',
  accessKeySecret: '',
  bucket: '',
  region: '',
  endpoint: '',
  customDomain: '',
  pathPrefix: 'images/',
  isDefault: false
})

// 计算属性
const isFormValid = computed(() => {
  return !!(
    configForm.value.name &&
    configForm.value.accessKeyId &&
    configForm.value.accessKeySecret &&
    configForm.value.bucket &&
    configForm.value.region
  )
})

// 初始化
onMounted(async () => {
  // 只加载配置和设置，不涉及映射
  await imageBedStore.getAllConfigs()
  await imageBedStore.getSettings()

  // 如果已有配置，加载到表单
  const configs = imageBedStore.configs
  if (configs.length > 0) {
    const defaultConfig = configs.find((c) => c.enabled) || configs[0]
    if (defaultConfig) {
      configForm.value = {
        id: defaultConfig.id,
        name: defaultConfig.name,
        accessKeyId: defaultConfig.accessKeyId || '',
        accessKeySecret: defaultConfig.accessKeySecret || '',
        bucket: defaultConfig.bucket || '',
        region: defaultConfig.region || '',
        endpoint: defaultConfig.endpoint || '',
        customDomain: defaultConfig.customDomain || '',
        pathPrefix: defaultConfig.pathPrefix || 'images/',
        isDefault: defaultConfig.isDefault || false
      }
    }
  }
})

// 事件处理函数
const handleToggleEnabled = async (enabled: boolean) => {
  await imageBedStore.updateSettings({ enabled })
}

const handleDisplayModeChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement
  await imageBedStore.updateSettings({
    displayMode: target.value as 'local-only' | 'remote-first' | 'auto'
  })
}

const handleToggleAutoUpload = async (autoUpload: boolean) => {
  await imageBedStore.updateSettings({ autoUpload })
}

const handleTestConnection = async () => {
  if (!isFormValid.value) return

  isTesting.value = true
  try {
    // 构建临时配置对象进行测试
    const testConfig = {
      id: 'temp',
      name: configForm.value.name,
      type: 'aliyun-oss' as const,
      enabled: true,
      isDefault: false,
      accessKeyId: configForm.value.accessKeyId,
      accessKeySecret: configForm.value.accessKeySecret,
      bucket: configForm.value.bucket,
      region: configForm.value.region,
      endpoint: configForm.value.endpoint,
      customDomain: configForm.value.customDomain,
      pathPrefix: configForm.value.pathPrefix,
      extraConfig: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await imageBedStore.testConnection(testConfig)
    if (result.success) {
      message.success('连接测试成功')
    } else {
      message.error(`连接测试失败: ${result.message || '请检查配置信息'}`)
    }
  } catch (error: any) {
    message.error(`连接测试失败: ${error.message || '网络错误，请重试'}`)
  } finally {
    isTesting.value = false
  }
}

const handleSaveConfig = async () => {
  if (!isFormValid.value) return

  isSaving.value = true
  try {
    // 检查是否为更新现有配置
    const existingConfig = imageBedStore.configs.find((c) => c.name === configForm.value.name)

    if (existingConfig) {
      // 更新现有配置
      await imageBedStore.updateConfig(existingConfig.id, {
        ...configForm.value,
        enabled: true
      })
    } else {
      // 创建新配置
      await imageBedStore.createConfig({
        ...configForm.value,
        type: 'aliyun-oss',
        enabled: true
      })
    }

    message.success('图床配置已保存')
  } catch (error: any) {
    message.error(`保存失败: ${error.message || '保存配置时出错'}`)
  } finally {
    isSaving.value = false
  }
}

const handleToggleDefault = async (isDefault: boolean) => {
  // 如果是新配置（没有id），先保存再设置默认
  if (!configForm.value.id) {
    message.warning('请先保存配置再设置为默认配置')
    return
  }

  try {
    await imageBedStore.updateConfig(configForm.value.id, {
      ...configForm.value,
      isDefault
    })
    configForm.value.isDefault = isDefault
    message.success(isDefault ? '已设为默认配置' : '已取消默认配置')
  } catch (error: any) {
    message.error(`设置默认配置失败: ${error.message || '操作失败'}`)
  }
}
</script>

<style scoped lang="scss">
.image-bed-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.settings-content-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px 0;

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .name {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.image-bed-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 16px 24px 0;
}

.image-bed-settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.image-bed-content {
  max-width: 600px;
}

.image-bed-item {
  margin-bottom: 32px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 8px;
  }

  .description {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin-bottom: 16px;
  }
}

.image-bed-form {
  .form-item {
    display: flex;
    align-items: center;
    margin-bottom: 16px;

    .label {
      width: 140px;
      font-size: 14px;
      color: var(--color-text-primary);
      flex-shrink: 0;
    }

    .value {
      flex: 1;
    }
  }
}

.config-input,
.config-select,
.display-mode-select {
  width: 100%;
  height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 14px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
}

.auto-upload-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .auto-upload-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.default-config-setting {
  display: flex;
  align-items: center;
  gap: 12px;

  .default-config-description {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
}

.config-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.is-loading {
  pointer-events: none;
  opacity: 0.7;
}
</style>
