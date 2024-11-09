import faiss from 'faiss-node'

async function testFaissInstallation() {
  try {
    console.log('开始测试 FAISS...')

    // 创建一个小一点的测试维度
    const dimension = 4
    console.log('创建维度为', dimension, '的索引')

    const index = new faiss.IndexFlatL2(dimension)

    // 创建测试数据 - 使用扁平数组表示多个向量
    const vectors = [
      1.0,
      2.0,
      3.0,
      4.0, // 第一个向量
      1.1,
      2.1,
      3.1,
      4.1 // 第二个向量
    ]

    console.log('添加向量数据:', vectors)
    console.log('向量数据长度:', vectors.length)

    // 添加向量到索引
    index.add(vectors)

    console.log('添加成功，当前索引包含', index.ntotal, '个向量')

    // 搜索最近邻
    const queryVector = [1.0, 2.0, 3.0, 4.0]
    console.log('搜索向量:', queryVector)

    const searchResult = index.search(queryVector, 2)

    console.log('FAISS 测试结果:', {
      向量数量: index.ntotal,
      搜索结果: {
        distances: searchResult.distances,
        labels: searchResult.labels
      }
    })

    console.log('FAISS 安装成功!')
  } catch (error) {
    console.error('FAISS 测试失败:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error) {
      console.error('错误堆栈:', error.stack)
    }
  }
}

// 运行测试
testFaissInstallation()
