// 思维板基本信息
export interface Mindboard {
  id: string
  name: string
  description?: string
  flow_data: any // 存储 VueFlow 的完整状态(包含节点、边和视图信息)
  preview_image?: string // 添加预览图字段,存储 base64 格式的图片数据
  created_at: string
  updated_at: string
  is_favorite: boolean // 收藏标记
}

// 创建思维板的参数接口
export interface CreateMindboardParams {
  name: string
  description?: string
  flow_data: any
  preview_image?: string
  is_favorite?: boolean // 可选的收藏标记
}

// 更新思维板的参数接口
export interface UpdateMindboardParams {
  name?: string
  description?: string
  flow_data?: any
  preview_image?: string
  is_favorite?: boolean // 可选的收藏标记
}

// 数据库操作接口
export interface MindboardService {
  createMindboard(data: CreateMindboardParams): Promise<Mindboard>
  getMindboard(id: string): Promise<Mindboard>
  updateMindboard(id: string, data: UpdateMindboardParams): Promise<Mindboard>
  deleteMindboard(id: string): Promise<void>
  getAllMindboards(): Promise<Mindboard[]>
  // 可以添加一个专门用于更新预览图的方法
  updatePreviewImage(id: string, previewImage: string): Promise<void>
  // 收藏相关方法
  toggleFavorite(id: string): Promise<void>
  getFavoriteMindboards(): Promise<Mindboard[]>
}

// 预览图压缩配置接口
export interface PreviewImageConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'image/jpeg' | 'image/png'
}
