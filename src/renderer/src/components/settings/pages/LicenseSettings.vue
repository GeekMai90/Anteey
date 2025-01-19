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
            <div class="section-title">账号登录</div>
            <div class="account-section">
              <!-- 未登录状态 -->
              <div v-if="!authStore.isAuthenticated" class="setting-item">
                <div class="setting-label">登录账号</div>
                <div class="login-form">
                  <input
                    v-model="email"
                    type="email"
                    placeholder="请输入邮箱"
                    :disabled="authStore.loading"
                  />
                  <input
                    v-model="password"
                    type="password"
                    placeholder="请输入密码"
                    :disabled="authStore.loading"
                  />
                  <div class="button-group">
                    <button
                      class="login-button"
                      :class="{ loading: authStore.loading }"
                      :disabled="!email || !password || authStore.loading"
                      @click="handleLogin"
                    >
                      {{ authStore.loading ? '登录中...' : '登录' }}
                    </button>
                    <button class="register-button" @click="handleRegister">注册账号</button>
                  </div>
                  <div class="register-tip">
                    👋🏻 请先注册账号，然后将注册邮箱发送至开发者微信 GeekMai 进行激活
                  </div>
                </div>
                <div v-if="authStore.error" class="error-message">
                  {{ authStore.error }}
                </div>
              </div>

              <!-- 已登录状态 -->
              <div v-else class="setting-item">
                <div class="setting-label">账号信息</div>
                <div class="account-info">
                  <div class="info-details">
                    <div data-label="用户名">{{ authStore.user?.username }}</div>
                    <div data-label="邮箱">{{ authStore.user?.email }}</div>
                    <div data-label="许可类型">
                      <span :class="['license-type', authStore.user?.licenseType]">
                        {{ authStore.isDesktopPermanent ? '桌面端永久授权' : '免费版' }}
                      </span>
                    </div>
                  </div>
                  <button class="logout-button" @click="handleLogout">退出登录</button>
                </div>
              </div>
            </div>
          </div>
          <!-- 会员感谢区域 -->
          <div
            v-if="authStore.isAuthenticated && authStore.isDesktopPermanent"
            class="premium-member-section"
          >
            <div class="decoration-line">
              <div class="line"></div>
              <CrownThree theme="filled" size="20" fill="var(--color-primary)" :strokeWidth="3" />
              <div class="line"></div>
            </div>
            <div class="thank-you-content">
              <h3>感谢您的支持 ❤️</h3>
              <p>因为有您的支持，Anteey 才能继续前行，与您相伴</p>
              <div class="benefits">
                <div class="benefit-item">
                  <Check theme="filled" size="16" fill="var(--color-success)" />
                  <span>无限制创建笔记</span>
                </div>
                <div class="benefit-item">
                  <Check theme="filled" size="16" fill="var(--color-success)" />
                  <span>优先体验新功能</span>
                </div>
                <div class="benefit-item">
                  <Check theme="filled" size="16" fill="var(--color-success)" />
                  <span>专属技术支持</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 离线状态提示 -->
    <div v-if="authStore.isOffline" class="offline-status-warning">
      <div class="warning-icon">
        <Attention theme="filled" size="24" fill="#ff9800" />
      </div>
      <div class="warning-content">
        <h4>当前处于离线状态</h4>
        <p v-if="authStore.remainingOfflineDays > 0">
          离线使用期限还剩 {{ authStore.remainingOfflineDays }} 天
        </p>
        <p v-else class="error-text">离线使用期限已过，请连接网络重新验证</p>
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
import { ref, onMounted } from 'vue'
import { CrownThree, Check, Attention } from '@icon-park/vue-next'
import { useLicenseStore } from '../../../stores/licenseStore'
import { useNoteStore } from '../../../stores/noteStore'
import Modal from '../../../components/common/Modal.vue'
import confetti from 'canvas-confetti'
import { useUIStore } from '../../../stores/UIStore'
import { useAuthStore } from '../../../stores/authStore'
const licenseStore = useLicenseStore()
const noteStore = useNoteStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
// const activationCode = ref('')
const noteCount = ref(0)
const email = ref('')
const password = ref('')

// 从 store 中获取状态
// const isActivating = computed(() => licenseStore.isActivating)

// const formattedMachineId = computed(() => {
//   return licenseStore.machineId.match(/.{8}/g)?.join('-') || ''
// })

// const copyMachineId = async () => {
//   try {
//     await navigator.clipboard.writeText(licenseStore.machineId)
//     // 可以添加一个简单的提示
//   } catch (err) {
//     console.error('复制失败:', err)
//   }
// }

// 添加日期格式化函数
// const formatDate = (date: Date | number) => {
//   return new Date(date).toLocaleString('zh-CN', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit'
//   })
// }
const showSuccessModal = ref(false)

// 烟花效果函数
const fireConfetti = () => {
  const count = 200
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

// const handleActivate = async () => {
//   if (!activationCode.value) return
//   const success = await licenseStore.activateLicense(activationCode.value)
//   if (success) {
//     activationCode.value = ''
//     showSuccessModal.value = true
//     setTimeout(() => {
//       fireConfetti()
//     }, 100)
//   }
// }

const handleSuccessModalClose = () => {
  showSuccessModal.value = false
  // 返回到主页面或其他指定页面
  uiStore.showSettingsPage = false
}

// 登录处理
const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value)
    email.value = ''
    password.value = ''
    // 如果是桌面端永久会员，显示烟花效果
    if (authStore.isDesktopPermanent) {
      setTimeout(() => {
        fireConfetti()
      }, 100)
    }
  } catch (error) {
    // 错误已在 store 中处理
  }
}

// 登出处理
const handleLogout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    // 错误已在 store 中处理
  }
}

// 添加注册处理函数
const handleRegister = () => {
  window.open('https://member.anteey.com', '_blank')
}

// 初始化认证状态
onMounted(async () => {
  console.log('LicenseSettings→ 组件挂载')
  await authStore.initAuth()
  console.log('LicenseSettings→ 认证初始化完成')
})

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

.account-section {
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    border-radius: 12px;
    background: var(--color-bg-secondary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    input {
      height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      border: 1.5px solid var(--color-border);
      color: var(--color-text-primary);
      font-size: 14px;
      background: var(--color-bg-primary);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &::placeholder {
        color: var(--color-text-placeholder);
      }

      &:hover:not(:disabled) {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--color-bg-secondary);
      }
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 8px;

      button {
        flex: 1;
        height: 40px;
        padding: 0 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.login-button {
          background: var(--color-primary);
          color: #fff;
          border: none;

          &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
          }

          &:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 2px 6px rgba(var(--color-primary-rgb), 0.2);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          &.loading {
            cursor: wait;
            position: relative;
            padding-left: 40px;

            &::before {
              content: '';
              position: absolute;
              left: 16px;
              top: 50%;
              transform: translateY(-50%);
              width: 16px;
              height: 16px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-top-color: #fff;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
          }
        }

        &.register-button {
          background: transparent;
          border: 1.5px solid var(--color-border);
          color: var(--color-text-primary);

          &:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
            background: rgba(var(--color-primary-rgb), 0.04);
            transform: translateY(-1px);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }
    }

    .register-tip {
      margin-top: 16px;
      padding: 12px;
      background: rgba(var(--color-primary-rgb), 0.05);
      border-radius: 8px;
      color: var(--color-text-secondary);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }
  }

  .error-message {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 6px;
    background: rgba(var(--color-danger-rgb), 0.08);
    color: var(--color-danger);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '!';
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: var(--color-danger);
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
    }
  }

  .account-info {
    padding: 24px;
    border-radius: 12px;
    background: var(--color-bg-secondary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .info-details {
      margin-bottom: 24px;

      > div {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        font-size: 14px;
        color: var(--color-text-secondary);

        &:last-child {
          margin-bottom: 0;
        }

        // 标签样式
        &::before {
          content: attr(data-label);
          width: 70px;
          color: var(--color-text-secondary);
        }
      }

      .status-line {
        margin-bottom: 16px;

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;

          &.active {
            background: rgba(var(--color-success-rgb), 0.1);
            color: var(--color-success);

            &::before {
              content: '';
              display: inline-block;
              width: 6px;
              height: 6px;
              margin-right: 6px;
              background: var(--color-success);
              border-radius: 50%;
              animation: pulse 2s infinite;
            }
          }
        }
      }

      .license-type {
        font-weight: 500;

        &.desktop_permanent {
          color: var(--color-success);
          background: rgba(var(--color-success-rgb), 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
        }

        &.free {
          color: var(--color-warning);
          background: rgba(var(--color-warning-rgb), 0.1);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
        }
      }
    }

    .logout-button {
      width: 100%;
      height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      border: none;
      background: var(--color-primary);
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
      }

      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(var(--color-primary-rgb), 0.2);
      }
    }
  }
}

@keyframes spin {
  to {
    transform: translateY(-50%) rotate(360deg);
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(var(--color-success-rgb), 0.4);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(var(--color-success-rgb), 0);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(var(--color-success-rgb), 0);
  }
}

.offline-status-warning {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid #ff9800;
  border-radius: 6px;
  margin: 16px 0;

  .warning-content {
    margin-left: 12px;

    h4 {
      margin: 0;
      color: #ff9800;
    }

    p {
      margin: 4px 0 0;
      font-size: 14px;
    }

    .error-text {
      color: #f44336;
    }
  }
}

.premium-member-section {
  margin-top: 32px;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.05) 0%,
    rgba(var(--color-primary-rgb), 0.02) 100%
  );
  text-align: center;

  .decoration-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;

    .line {
      height: 1px;
      width: 80px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(var(--color-primary-rgb), 0.3) 50%,
        transparent 100%
      );
    }
  }

  .thank-you-content {
    h3 {
      color: var(--color-primary);
      font-size: 18px;
      font-weight: 500;
      margin: 0 0 8px 0;
    }

    p {
      color: var(--color-text-secondary);
      font-size: 14px;
      margin: 0 0 20px 0;
    }

    .benefits {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 200px;
      margin: 0 auto;

      .benefit-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--color-text-primary);

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }
  }

  // 添加微妙的悬浮效果
  @media (hover: hover) {
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(var(--color-primary-rgb), 0.1);
    }
  }
}
</style>
