import { ipcMain } from 'electron'
import {
  getMachineId,
  activateLicense,
  checkLicenseStatus
} from '../../services/activation/licenseService'

export function setupLicenseHandlers() {
  ipcMain.handle('get-machine-id', async () => {
    try {
      return await getMachineId()
    } catch (error) {
      console.error('获取机器码失败:', error)
      throw error
    }
  })

  ipcMain.handle('activate-license', async (_event, activationCode: string) => {
    try {
      return await activateLicense(activationCode)
    } catch (error) {
      console.error('激活失败:', error)
      throw error
    }
  })

  ipcMain.handle('check-license', async () => {
    try {
      return await checkLicenseStatus()
    } catch (error) {
      console.error('检查激活状态失败:', error)
      throw error
    }
  })
}
