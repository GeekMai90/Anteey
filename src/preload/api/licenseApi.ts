import { ipcRenderer } from 'electron'

export const licenseApi = {
  getMachineId: async (): Promise<string> => {
    return await ipcRenderer.invoke('get-machine-id')
  },

  activateLicense: async (activationCode: string) => {
    return await ipcRenderer.invoke('activate-license', activationCode)
  },

  checkLicense: async () => {
    return await ipcRenderer.invoke('check-license')
  }
}
