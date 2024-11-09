// 设置测试环境
process.env.NODE_ENV = 'test'

import { SemanticVectorizer } from './semanticVector'

async function testVectorIndex() {
  try {
    console.log('开始测试 FAISS 向量索引...')

    const vectorizer = SemanticVectorizer.getInstance()
    await vectorizer.initialize()

    // 测试用例
    const testCases = [
      {
        id: 'note1',
        text: '卢曼卡片盒笔记法是一种知识管理方法'
      },
      {
        id: 'note2',
        text: 'Zettelkasten是德国社会学家尼克拉斯·卢曼发明的笔记系统'
      },
      {
        id: 'note3',
        text: '人工智能和机器学习是现代科技的重要领域'
      }
    ]

    // 1. 测试向量获取和索引添加
    console.log('\n1. 测试向量获取和索引添加')
    for (const testCase of testCases) {
      const vector = await vectorizer.getVector(testCase.text, testCase.id)
      console.log(`笔记 ${testCase.id} 的向量已添加到索引`)
    }

    // 2. 测试相似度搜索
    console.log('\n2. 测试相似度搜索')
    const queryText = '卢曼的笔记方法对知识管理很有帮助'
    const queryVector = await vectorizer.getVector(queryText)
    const similarNotes = await vectorizer.searchSimilar(queryVector, 2)

    console.log('查询文本:', queryText)
    console.log('相似笔记:', similarNotes)

    // 3. 验证结果
    console.log('\n3. 验证结果')
    for (const result of similarNotes) {
      const testCase = testCases.find((tc) => tc.id === result.id)
      if (testCase) {
        console.log(`\n找到相似笔记:`)
        console.log(`ID: ${result.id}`)
        console.log(`文本: ${testCase.text}`)
        console.log(`相似度: ${(result.similarity * 100).toFixed(2)}%`)
      }
    }

    console.log('\n测试完成!')
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
testVectorIndex()
