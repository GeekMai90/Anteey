import { SemanticVectorizer } from './semanticVector'

async function testSemanticVector() {
  try {
    console.log('开始测试语义向量...')

    const vectorizer = SemanticVectorizer.getInstance()
    await vectorizer.initialize()

    // 测试用例
    const testCases = [
      {
        text1: '卢曼卡片盒笔记法是一种知识管理方法',
        text2: 'Zettelkasten是德国社会学家尼克拉斯·卢曼发明的笔记系统',
        keywords1: [
          { word: '卢曼', weight: 1 },
          { word: '笔记', weight: 0.8 }
        ],
        keywords2: [
          { word: 'zettelkasten', weight: 1 },
          { word: '笔记系统', weight: 0.8 }
        ]
      },
      {
        text1: 'React是一个前端框架',
        text2: 'Vue也是一个流行的前端框架',
        keywords1: [
          { word: 'React', weight: 1 },
          { word: '前端', weight: 0.8 }
        ],
        keywords2: [
          { word: 'Vue', weight: 1 },
          { word: '前端', weight: 0.8 }
        ]
      }
    ]

    // 测试每一组
    for (const testCase of testCases) {
      console.log('\n测试案例:', {
        文本1: testCase.text1,
        文本2: testCase.text2
      })

      const similarity = await vectorizer.calculateHybridSimilarity(
        { type: 'text', text: testCase.text1 },
        { type: 'text', text: testCase.text2 },
        testCase.keywords1,
        testCase.keywords2
      )

      console.log('相似度:', similarity)
    }

    console.log('\n测试完成!')
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
testSemanticVector()
