export interface TagSearchParams {
  query?: string // 搜索关键词
  pinned?: boolean // 是否只搜索置顶标签
  parentPath?: string[] // 在特定路径下搜索
  limit?: number // 返回结果数量限制
  offset?: number // 分页偏移量
}
