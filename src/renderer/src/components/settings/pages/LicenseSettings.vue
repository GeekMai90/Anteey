<template>
  <div class="license-settings">
    <div class="license-settings-wrapper">
      <div class="settings-content-header">
        <div class="icon">
          <CrownThree
            theme="outline"
            size="20"
            fill="var(--color-icon-menu-default)"
            :strokeWidth="3"
          />
        </div>
        <div class="name">软件激活</div>
      </div>
      <div class="shortcuts-settings-divider"></div>
      <div class="license-settings-content">
        <div class="license-content">
          <div class="settings-section">
            <div class="section-title">激活信息</div>

            <!-- 未激活状态：显示使用统计 -->
            <div v-if="!licenseStore.license" class="usage-status-section">
              <div class="setting-item">
                <div class="setting-label">使用情况</div>
                <div class="usage-info">
                  <div class="progress-bar">
                    <div
                      class="progress"
                      :class="{ exceed: noteCount >= 100 }"
                      :style="{ width: `${(noteCount / 100) * 100}%` }"
                    ></div>
                  </div>
                  <div class="usage-details">
                    <div class="note-count">{{ noteCount }}/100</div>
                    <div class="usage-tip">免费版用户可创建 100 张卡片笔记</div>
                    <div class="activation-tip">激活软件后可无限制创建笔记</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 已激活状态显示 -->
            <div v-if="licenseStore.license" class="license-status-section">
              <div class="setting-item">
                <div class="setting-label">当前状态</div>
                <div class="license-info">
                  <div class="license-details">
                    <div class="status-line">
                      激活状态：<span class="status-badge active">已激活</span>
                    </div>
                    <div>激活时间：{{ formatDate(licenseStore.license.activatedAt) }}</div>
                    <div>到期时间：{{ formatDate(licenseStore.license.expiresAt) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 机器码部分 -->
            <div class="machine-id-section">
              <div class="setting-item">
                <div class="setting-label">机器码</div>
                <div class="machine-id-display">
                  <div class="machine-id">{{ formattedMachineId }}</div>
                  <button class="copy-button" @click="copyMachineId">复制</button>
                </div>
                <div class="setting-desc">
                  添加开发者微信：GeekMai，将此机器码发送给开发者获取激活码
                </div>
              </div>
            </div>

            <!-- 激活码部分 -->
            <div class="activation-section">
              <div class="setting-item">
                <div class="setting-label">激活码</div>
                <div class="activation-input">
                  <input
                    v-model="activationCode"
                    type="text"
                    placeholder="请输入激活码"
                    :disabled="isActivating"
                  />
                  <button
                    class="activate-button"
                    :class="{ loading: isActivating }"
                    :disabled="!activationCode || isActivating"
                    @click="handleActivate"
                  >
                    {{ isActivating ? '激活中...' : '激活' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 使用项目的 Modal 组件 -->
  <Modal v-model="showSuccessModal">
    <div class="success-modal">
      <div class="success-icon">
        <Check theme="filled" size="48" fill="var(--color-primary)" />
      </div>
      <h2>激活成功</h2>
      <p>感谢您的支持，现在您可以无限制地创建笔记了！</p>
      <button class="primary-button" @click="handleSuccessModalClose">开始使用</button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CrownThree } from '@icon-park/vue-next'
import { useLicenseStore } from '../../../stores/licenseStore'
import { useNoteStore } from '../../../stores/noteStore'
import Modal from '../../../components/common/Modal.vue'
import confetti from 'canvas-confetti'
import { useUIStore } from '../../../stores/UIStore'
const licenseStore = useLicenseStore()
const noteStore = useNoteStore()
const uiStore = useUIStore()
const activationCode = ref('')
const noteCount = ref(0)

// 从 store 中获取状态
const isActivating = computed(() => licenseStore.isActivating)

const formattedMachineId = computed(() => {
  return licenseStore.machineId.match(/.{8}/g)?.join('-') || ''
})

const copyMachineId = async () => {
  try {
    await navigator.clipboard.writeText(licenseStore.machineId)
    // 可以添加一个简单的提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 添加日期格式化函数
const formatDate = (date: Date | number) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
const showSuccessModal = ref(false)

// 烟花效果函数
const fireConfetti = () => {
  const count = 200 // 每次发射的数量
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999
  }

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      spread: 60,
      startVelocity: 55
    })
  }

  // 第一波烟花
  fire(0.25, {
    origin: { x: 0.3 },
    colors: ['#00c8a8', '#4361ee', '#f72585']
  })
  fire(0.35, {
    origin: { x: 0.5 },
    colors: ['#00c8a8', '#4361ee', '#f72585']
  })
  fire(0.25, {
    origin: { x: 0.7 },
    colors: ['#00c8a8', '#4361ee', '#f72585']
  })

  // 延迟200ms发射第二波
  setTimeout(() => {
    fire(0.2, {
      origin: { x: 0.2 },
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
    fire(0.3, {
      origin: { x: 0.4 },
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
    fire(0.3, {
      origin: { x: 0.6 },
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
    fire(0.2, {
      origin: { x: 0.8 },
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
  }, 200)

  // 延迟400ms发射第三波
  setTimeout(() => {
    fire(0.3, {
      origin: { x: 0.3 },
      spread: 80,
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
    fire(0.4, {
      origin: { x: 0.5 },
      spread: 80,
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
    fire(0.3, {
      origin: { x: 0.7 },
      spread: 80,
      colors: ['#00c8a8', '#4361ee', '#f72585']
    })
  }, 400)
}

const handleActivate = async () => {
  if (!activationCode.value) return
  const success = await licenseStore.activateLicense(activationCode.value)
  if (success) {
    activationCode.value = ''
    showSuccessModal.value = true
    setTimeout(() => {
      fireConfetti()
    }, 100)
  }
}

const handleSuccessModalClose = () => {
  showSuccessModal.value = false
  // 返回到主页面或其他指定页面
  uiStore.showSettingsPage = false
}

// 组件挂载时获取机器码、许可证状态和笔记数量
onMounted(async () => {
  await licenseStore.getMachineId()
  await licenseStore.checkLicenseStatus()
  noteCount.value = await noteStore.getNoteCount()
})
</script>

<style scoped lang="scss">
.license-settings {
  width: 100%;
  height: 100%;
}
.license-settings-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
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

.shortcuts-settings-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 0 10px 0;
}

.settings-section {
  margin-bottom: 32px;

  .section-title {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 16px;
    color: var(--color-text-primary);
  }
}

.setting-item {
  margin-bottom: 24px;

  .setting-label {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
  }

  .setting-desc {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-top: 4px;
  }
}

.machine-id-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  // background-color: var(--color-bg-secondary);
  border-radius: 6px;

  .machine-id {
    flex: 1;
    font-family: monospace;
    overflow-x: auto;
    white-space: nowrap;
    color: var(--color-text-primary);

    &::-webkit-scrollbar {
      display: none;
    }
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .copy-button {
    flex-shrink: 0;
    height: 32px;
    padding: 0 16px;
    border-radius: 6px;
    border: none;
    background: var(--color-primary);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.9;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.setting-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.activation-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;

  input {
    flex: 1;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--color-border);
    // background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 13px;
    transition: all 0.2s ease;

    &::placeholder {
      color: var(--color-text-placeholder);
    }

    &:hover {
      border-color: var(--color-primary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .activate-button {
    height: 32px;
    padding: 0 16px;
    border-radius: 6px;
    border: none;
    background: var(--color-primary);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.loading {
      cursor: wait;
    }
  }
}

.error-message {
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-danger);
}

.license-status-section {
  .license-info {
    // background-color: var(--color-bg-secondary);
    padding: 12px;
    border-radius: 6px;
  }

  .status-line {
    color: var(--color-text-primary);
    margin-bottom: 4px;
  }

  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 14px;

    &.active {
      background-color: var(--color-success-bg);
      color: var(--color-success);
    }
  }

  .license-details {
    font-size: 14px;
    color: var(--color-text-primary);

    > div {
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
.usage-status-section {
  margin-bottom: 24px;

  .usage-info {
    background-color: var(--color-bg-secondary);
    padding: 12px;
    border-radius: 6px;
  }

  .progress-bar {
    height: 4px;
    background-color: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;

    .progress {
      height: 100%;
      background-color: var(--color-primary);
      border-radius: 2px;
      transition: width 0.3s ease;
      &.exceed {
        background-color: var(--color-danger); // 超出限制时使用危险色
      }
    }
  }

  .usage-details {
    .note-count {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 4px;
    }

    .usage-tip {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
    }

    .activation-tip {
      font-size: 13px;
      color: var(--color-primary);
    }
  }
}

.success-modal {
  background: var(--color-bg-primary);
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
  width: 90%;

  .success-icon {
    margin-bottom: 16px;
  }

  h2 {
    font-size: 24px;
    color: var(--color-text-primary);
    margin-bottom: 16px;
    font-weight: 500;
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
  }

  .primary-button {
    background: var(--color-primary);
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
