interface ElectronAPI {
  getResourcePath: (filename: string) => Promise<string>
}

export {}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
