export interface License {
  id: string
  machineId: string
  activationCode: string
  activatedAt: Date
  expiresAt: Date
  status: 'active' | 'inactive'
  version: string
  level: 'pro'
}

export interface ActivationResult {
  success: boolean
  message: string
  license?: License | null
}
