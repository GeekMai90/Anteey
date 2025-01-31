// 思维板基本信息
export interface Mindboard {
  id: string
  name: string
  description?: string
  flow_data: any // 存储 VueFlow 的完整状态(包含节点、边和视图信息)
  created_at: string
  updated_at: string
}

// 数据库操作接口
export interface MindboardService {
  createMindboard(data: Omit<Mindboard, 'id' | 'created_at' | 'updated_at'>): Promise<Mindboard>
  getMindboard(id: string): Promise<Mindboard>
  updateMindboard(id: string, data: Partial<Mindboard>): Promise<Mindboard>
  deleteMindboard(id: string): Promise<void>
  getAllMindboards(): Promise<Mindboard[]>
}
