import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { License } from '@shared/types'

export const useLicenseStore = defineStore('license', () => {
  const license = ref<License | null>(null)
  const machineId = ref<string>('')
  const isActivating = ref(false)
  const error = ref<string>('')

  // 获取机器码
  async function getMachineId() {
    try {
      machineId.value = await window.electronAPI.getMachineId()
    } catch (err) {
      error.value = '获取机器码失败'
      console.error('获取机器码失败:', err)
    }
  }

  // 激活软件
  // 激活软件
  async function activateLicense(activationCode: string) {
    isActivating.value = true
    error.value = ''

    try {
      const result = await window.electronAPI.activateLicense(activationCode)
      if (result.success && result.license) {
        // 添加 result.license 检查
        license.value = result.license
        return true
      } else {
        error.value = result.message
        return false
      }
    } catch (err) {
      error.value = '激活失败'
      console.error('激活失败:', err)
      return false
    } finally {
      isActivating.value = false
    }
  }

  // 检查激活状态
  async function checkLicenseStatus() {
    try {
      const result = await window.electronAPI.checkLicense()
      license.value = result
      return result !== null
    } catch (err) {
      error.value = '检查激活状态失败'
      console.error('检查激活状态失败:', err)
      return false
    }
  }

  return {
    license,
    machineId,
    isActivating,
    error,
    getMachineId,
    activateLicense,
    checkLicenseStatus
  }
})
