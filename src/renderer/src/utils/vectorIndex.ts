import faiss from 'faiss-node'

export class VectorIndex {
  private index: faiss.IndexFlatL2
  private dimension: number = 384 // 与 MiniLM 模型输出维度匹配

  constructor() {
    this.index = new faiss.IndexFlatL2(this.dimension)
  }

  /**
   * 添加向量到索引
   * @param vectors 向量数组
   */
  addVectors(vectors: number[]) {
    try {
      this.index.add(vectors)
      console.info('向量添加成功，当前索引包含向量数:', this.index.ntotal)
    } catch (error) {
      console.error('添加向量失败:', error)
      throw error
    }
  }

  /**
   * 搜索最相似的向量
   * @param queryVector 查询向量
   * @param k 返回结果数量
   */
  searchSimilar(queryVector: number[], k: number = 5) {
    try {
      const result = this.index.search(queryVector, k)
      return {
        distances: result.distances,
        labels: result.labels
      }
    } catch (error) {
      console.error('向量搜索失败:', error)
      throw error
    }
  }
}
