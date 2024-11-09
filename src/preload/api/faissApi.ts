import { ipcRenderer } from 'electron'

export const faissApi = {
  initializeFaiss: async (): Promise<void> => {
    await ipcRenderer.invoke('faiss:initialize')
  },
  isFaissReady: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('faiss:status')
  }
}
