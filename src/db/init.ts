import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import { importQuotes } from '../services/widget/quotesImporter'

export async function initDatabase(db: Knex): Promise<void> {
  // 创建 notes 表
  if (!(await db.schema.hasTable('notes'))) {
    await db.schema.createTable('notes', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('note')
      table.string('address').notNullable().index()
      table.string('cardType').notNullable().defaultTo('Maincard').index()
      table.json('content').notNullable()
      table.datetime('createdAt').notNullable().index()
      table.datetime('updatedAt').notNullable().index()

      // 引用关系
      table
        .json('references')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            outgoing: [],
            incoming: []
          })
        )

      // 其他字段保持不变
      table.json('relationshipTree').nullable()
      table.json('graphData').nullable()
      table.string('cardBoxId').nullable().index()
      table.string('parentId').nullable().index()
      table.boolean('isDeleted').notNullable().defaultTo(false).index()
      table.boolean('isStarred').notNullable().defaultTo(false).index()
      table.integer('starredOrder').nullable()
      table.integer('rightBarOrder').nullable()
      table.json('metadata').nullable()

      // 新增：闪卡相关字段
      table.boolean('isFlashcard').notNullable().defaultTo(false).index()
      table.json('flashcard').nullable() // 存储闪卡的所有相关数据
      table.datetime('nextReviewAt').nullable().index() // 将重要的查询字段单独存储

      // 保持现有的索引
      table.index(['cardBoxId', 'updatedAt'])
      table.index(['cardBoxId', 'createdAt'])
      table.index(['cardType', 'createdAt'])
      table.index(['cardBoxId', 'isDeleted', 'updatedAt'])
      table.index(['cardBoxId', 'isDeleted', 'createdAt'])
      table.index(['isStarred', 'starredOrder', 'updatedAt'])
      // 新增：用于闪卡查询的索引
      table.index(['isFlashcard', 'nextReviewAt']) // 用于查询待复习的卡片
    })
    console.log('notes 表创建成功')
  } // 如果表已存在，需要添加新字段
  else {
    // 检查是否需要添加新列
    const hasFlashcardColumn = await db.schema.hasColumn('notes', 'isFlashcard')
    if (!hasFlashcardColumn) {
      await db.schema.alterTable('notes', (table) => {
        table.boolean('isFlashcard').notNullable().defaultTo(false)
        table.json('flashcard').nullable()
        table.datetime('nextReviewAt').nullable()
      })

      // 添加新索引
      await db.schema.table('notes', (table) => {
        table.index('isFlashcard')
        table.index(['isFlashcard', 'nextReviewAt'])
      })

      console.log('闪卡相关字段添加成功')
    }
  }

  // 2. 创建 tags 表
  if (!(await db.schema.hasTable('tags'))) {
    await db.schema.createTable('tags', (table) => {
      table.string('id').primary()
      table.string('name').notNullable().unique()
      table.json('path').notNullable()
      table.string('color').nullable()
      table.string('icon').nullable()
      table.boolean('pinned').notNullable().defaultTo(false)
      table.integer('pinOrder').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('name')
      table.index(['pinned', 'pinOrder'])
    })
    console.log('tags 表创建成功')
  }

  // 3. 创建 note_tags 关联表
  if (!(await db.schema.hasTable('note_tags'))) {
    await db.schema.createTable('note_tags', (table) => {
      table.string('noteId').notNullable()
      table.string('tagId').notNullable()
      table.datetime('createdAt').notNullable()

      // 复合主键
      table.primary(['noteId', 'tagId'])

      // 外键约束
      table.foreign('noteId').references('notes.id').onDelete('CASCADE')
      table.foreign('tagId').references('tags.id').onDelete('CASCADE')

      // 索引
      table.index('noteId')
      table.index('tagId')
    })
    console.log('note_tags 表创建成功')
  }

  // 创建 note_references 表
  if (!(await db.schema.hasTable('note_references'))) {
    await db.schema.createTable('note_references', (table) => {
      table.string('id').primary()
      table.string('sourceNoteId').notNullable().index() // 引用来源笔记ID
      table.string('targetNoteId').notNullable().index() // 被引用笔记ID
      table.string('type').notNullable().defaultTo('reference') // 引用类型，现在固定为 reference

      // 引用上下文，使用 JSON 类型存储更复杂的结构
      table
        .json('context')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            text: '', // 上下文文本
            position: 0 // 在文档中的位置
          })
        )

      // 引用元数据
      table
        .json('metadata')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            title: '', // 被引用笔记的标题
            preview: '', // 预览内容
            cardType: null // 被引用笔记的类型（可选）
          })
        )

      // 时间戳
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加复合索引以优化查询
      table.index(['sourceNoteId', 'targetNoteId'])
      table.index(['createdAt'])
      table.index(['updatedAt'])
    })
    console.log('note_references 表创建成功')
  }

  // 创建 cardboxes 表
  if (!(await db.schema.hasTable('cardboxes'))) {
    await db.schema.createTable('cardboxes', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('cardbox')
      table.string('name').notNullable()
      table.text('description').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('noteIds').notNullable()
      table.string('parentId').nullable().index()
      table.boolean('isStarred').notNullable().defaultTo(false).index()
      table.integer('starredOrder').nullable()
      table.boolean('isPinned').notNullable().defaultTo(false).index()
      table.integer('pinnedOrder').nullable()
    })
    console.log('cardboxes 表创建成功')
  }

  // 创建 whiteboards 表
  if (!(await db.schema.hasTable('whiteboards'))) {
    await db.schema.createTable('whiteboards', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.string('parentId').notNullable()
      table.boolean('isTopLevel').notNullable().defaultTo(true)
      table.boolean('isStarred').notNullable().defaultTo(false)
      table.integer('starredOrder').nullable()
      table.float('zoomLevel').notNullable()
      table.json('scrollPosition').notNullable()
      table.float('scale').notNullable()
      table.float('translateX').notNullable()
      table.float('translateY').notNullable()
    })
    console.log('whiteboards 表创建成功')
  }

  //  创建 root_whiteboards 表
  if (!(await db.schema.hasTable('root_whiteboards'))) {
    await db.schema.createTable('root_whiteboards', (table) => {
      table.string('id').primary()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.float('zoomLevel').notNullable()
      table.json('scrollPosition').notNullable()
      table.float('scale').notNullable()
      table.float('translateX').notNullable()
      table.float('translateY').notNullable()
      table.unique(['id'])
    })
    console.log('root_whiteboards 表创建成功')
  }

  // 创建 whiteboard_notes 表
  // if (!(await db.schema.hasTable('whiteboard_notes'))) {
  //   await db.schema.createTable('whiteboard_notes', (table) => {
  //     table.string('id').primary()
  //     table.string('whiteboardId').notNullable().index()
  //     table.string('noteId').notNullable().index()
  //     table.json('position').notNullable()
  //     table.json('size').notNullable()
  //     table.integer('zIndex').notNullable()
  //     table.float('rotation').notNullable().defaultTo(0)
  //     table.boolean('isAutoHeight').notNullable().defaultTo(false)
  //     table.string('type').notNullable().defaultTo('card')
  //     table.string('content').nullable()
  //     table.string('imageUrl').nullable()
  //   })
  //   console.log('whiteboard_notes 表创建成功')
  // }

  if (!(await db.schema.hasTable('whiteboard_notes'))) {
    await db.schema.createTable('whiteboard_notes', (table) => {
      table.string('id').primary()
      table.string('whiteboardId').notNullable().index()
      table.string('type').notNullable().defaultTo('card') // 新增：元素类型
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.integer('zIndex').notNullable()
      table.float('rotation').notNullable().defaultTo(0)

      // 样式相关
      table.json('style').nullable() // 新增：统一的样式配置

      // card类型特有属性
      table.string('noteId').nullable().index() // 改为可选
      table.boolean('isAutoHeight').nullable() // 改为可选

      // text类型特有属性
      table.text('content').nullable()

      // image类型特有属性
      table.string('imageUrl').nullable()
      table.json('originalSize').nullable() // 新增：图片原始尺寸
    })
    console.log('whiteboard_notes 表创建成功')
  }

  // 创建 whiteboard_groups 表
  if (!(await db.schema.hasTable('whiteboard_groups'))) {
    await db.schema.createTable('whiteboard_groups', (table) => {
      table.string('id').primary()
      table.string('whiteboardId').notNullable().index()
      table.string('name').notNullable()
      table.json('itemIds').notNullable()
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.integer('zIndex').notNullable()
      table.json('style').nullable()
      table.float('rotation').notNullable().defaultTo(0)
    })
    console.log('whiteboard_groups 表创建成功')
  }

  // 创建 connections 表
  if (!(await db.schema.hasTable('connections'))) {
    await db.schema.createTable('connections', (table) => {
      table.string('id').primary()
      table.string('whiteboardId').notNullable().index()
      table.string('startItemId').notNullable()
      table.string('endItemId').notNullable()
      table.string('startPoint').notNullable()
      table.string('endPoint').notNullable()
      table.string('description').nullable()
    })
    console.log('connections 表创建成功')
  }
  if (!(await db.schema.hasTable('user_settings'))) {
    await db.schema.createTable('user_settings', (table) => {
      table.string('id').primary()
      table.string('authorName').notNullable().defaultTo('麦先生的专栏')
      table.string('authorMotto').notNullable().defaultTo('一起践行终身成长')
      table.string('qrcodeUrl').notNullable().defaultTo('')
      table.string('globalHotkey').nullable()
      table.float('zoom_factor').notNullable().defaultTo(1.0)
      table.integer('window_width').nullable()
      table.integer('window_height').nullable()
      table.integer('window_x').nullable()
      table.integer('window_y').nullable()
      table.boolean('is_maximized').notNullable().defaultTo(true)
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })
    console.log('user_settings 表创建成功')

    // 创建默认设置
    await db('user_settings').insert({
      id: uuidv4(),
      authorName: '麦先生的专栏',
      authorMotto: '一起践行终身成长',
      qrcodeUrl: '',
      globalHotkey: 'Alt+CommandOrControl+U',
      zoom_factor: 1.0, // 设置默认值
      window_width: null,
      window_height: null,
      window_x: null,
      window_y: null,
      is_maximized: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    console.log('user_settings 默认数据创建成功')
  } else {
    // 检查并添加新列
    const hasWindowColumns = await Promise.all([
      db.schema.hasColumn('user_settings', 'window_width'),
      db.schema.hasColumn('user_settings', 'window_height'),
      db.schema.hasColumn('user_settings', 'window_x'),
      db.schema.hasColumn('user_settings', 'window_y'),
      db.schema.hasColumn('user_settings', 'is_maximized')
    ])

    if (!hasWindowColumns[0]) {
      await db.schema.alterTable('user_settings', (table) => {
        table.integer('window_width').nullable()
      })
    }
    if (!hasWindowColumns[1]) {
      await db.schema.alterTable('user_settings', (table) => {
        table.integer('window_height').nullable()
      })
    }
    if (!hasWindowColumns[2]) {
      await db.schema.alterTable('user_settings', (table) => {
        table.integer('window_x').nullable()
      })
    }
    if (!hasWindowColumns[3]) {
      await db.schema.alterTable('user_settings', (table) => {
        table.integer('window_y').nullable()
      })
    }
    if (!hasWindowColumns[4]) {
      await db.schema.alterTable('user_settings', (table) => {
        table.boolean('is_maximized').notNullable().defaultTo(true)
      })
    }
  }
  // 创建 custom_filters 表
  if (!(await db.schema.hasTable('custom_filters'))) {
    await db.schema.createTable('custom_filters', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.enum('matchType', ['all', 'any']).notNullable()
      table.boolean('isPinned').notNullable().defaultTo(false)
      table.boolean('isStarred').notNullable().defaultTo(false)
      table.integer('pinnedOrder').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('name')
      table.index(['isPinned', 'pinnedOrder'])
      table.index('isStarred')
      table.index('createdAt')
      table.index('updatedAt')
    })
    console.log('custom_filters 表创建成功')
  }

  // 创建 filter_rules 表
  if (!(await db.schema.hasTable('filter_rules'))) {
    await db.schema.createTable('filter_rules', (table) => {
      table.string('id').primary()
      table.string('filterId').notNullable().index()
      table.enum('field', ['tag', 'cardBox', 'keyword', 'cardType', 'isFlashcard']).notNullable()
      table.enum('operator', ['contains', 'doesNotContain', 'is', 'isNot']).notNullable()
      table.json('value').notNullable() // 使用 json 类型来存储 string | string[]
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 外键约束
      table.foreign('filterId').references('custom_filters.id').onDelete('CASCADE')

      // 索引
      table.index(['filterId', 'field'])
      table.index('createdAt')
    })
    console.log('filter_rules 表创建成功')
  }

  // 创建 note_embeddings 表
  if (!(await db.schema.hasTable('note_embeddings'))) {
    await db.schema.createTable('note_embeddings', (table) => {
      table.string('note_id').primary()
      table.binary('embedding').notNullable() // 使用 binary 类型存储向量数据
      table.json('keywords').notNullable().defaultTo('[]') // 新增字段，存储关键词数组
      table.integer('created_at').notNullable()
      table.integer('updated_at').notNullable()
      table.string('model_version').notNullable().defaultTo('minilm-l6-v2')

      // 外键约束
      table.foreign('note_id').references('notes.id').onDelete('CASCADE')

      // 索引
      table.index('updated_at')
      table.index(['note_id', 'updated_at'])
    })
    console.log('note_embeddings 表创建成功')
  }

  // 创建 dictionary 表
  if (!(await db.schema.hasTable('dictionary'))) {
    await db.schema.createTable('dictionary', (table) => {
      table.string('word').primary()
      table.float('weight').notNullable()
      table.integer('frequency').notNullable().defaultTo(0)
      table.integer('documents').notNullable().defaultTo(0)
      table.bigInteger('lastSeen').notNullable()
      table.json('cooccurrences').notNullable().defaultTo('{}')
      table.enum('source', ['auto', 'manual']).notNullable().defaultTo('auto')
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('createdAt').notNullable().defaultTo(db.fn.now())
      table.timestamp('updatedAt').notNullable().defaultTo(db.fn.now())

      // 索引
      table.index('frequency')
      table.index('lastSeen')
      table.index(['enabled', 'frequency'])
      table.index(['source', 'lastSeen'])
    })
    console.log('dictionary 表创建成功')
  }

  // 创建 dictionary_suggestions 表
  if (!(await db.schema.hasTable('dictionary_suggestions'))) {
    await db.schema.createTable('dictionary_suggestions', (table) => {
      table.string('word').primary()
      table.float('weight').notNullable()
      table.float('score').notNullable()
      table.json('reason').notNullable()
      table.enum('status', ['pending', 'accepted', 'rejected']).notNullable().defaultTo('pending')
      table.timestamp('createdAt').notNullable().defaultTo(db.fn.now())
      table.timestamp('processedAt').nullable()

      // 索引
      table.index(['status', 'score'])
      table.index('createdAt')
    })
    console.log('dictionary_suggestions 表创建成功')
  }

  // 创建 dictionary_categories 表
  if (!(await db.schema.hasTable('dictionary_categories'))) {
    await db.schema.createTable('dictionary_categories', (table) => {
      table.string('id').primary()
      table.string('name').notNullable().unique()
      table.string('description').nullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.integer('order').nullable()
      table.timestamp('createdAt').notNullable().defaultTo(db.fn.now())
      table.timestamp('updatedAt').notNullable().defaultTo(db.fn.now())

      // 索引
      table.index(['enabled', 'order'])
    })
    console.log('dictionary_categories 表创建成功')

    // 插入默认分类
    await db('dictionary_categories').insert([
      {
        id: uuidv4(),
        name: '核心术语',
        description: '领域核心概念和术语',
        order: 1
      },
      {
        id: uuidv4(),
        name: '评估标准',
        description: '评估和度量相关术语',
        order: 2
      },
      {
        id: uuidv4(),
        name: '方法论',
        description: '方法和流程相关术语',
        order: 3
      }
    ])
    console.log('dictionary_categories 默认数据建成功')
  }

  // 创建 word_category_relations 表
  if (!(await db.schema.hasTable('word_category_relations'))) {
    await db.schema.createTable('word_category_relations', (table) => {
      table.string('word').notNullable()
      table.string('categoryId').notNullable()
      table.timestamp('createdAt').notNullable().defaultTo(db.fn.now())

      // 复合主键
      table.primary(['word', 'categoryId'])

      // 外键约束
      table.foreign('word').references('dictionary.word').onDelete('CASCADE')
      table.foreign('categoryId').references('dictionary_categories.id').onDelete('CASCADE')

      // 索引
      table.index('word')
      table.index('categoryId')
    })
    console.log('word_category_relations 表创建成功')
  }

  // 创建 rag_history 表
  if (!(await db.schema.hasTable('rag_history'))) {
    await db.schema.createTable('rag_history', (table) => {
      table.string('id').primary()
      table.string('title').nullable() // 对话标题
      table.json('messages').notNullable() // 存储完整的对话消息数组
      table.json('contexts').notNullable() // 存储每次对话的上下文数组
      table.string('summary').nullable() // 对话摘要
      table.integer('totalTokens').nullable() // 总 token 数
      table
        .json('metadata')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            messageCount: 0,
            userMessageCount: 0,
            aiMessageCount: 0,
            averageRelevanceScore: 0
          })
        ) // 元数据
      table.boolean('isPinned').defaultTo(false) // 是否置顶
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('createdAt')
      table.index('isPinned')
      table.index(['isPinned', 'createdAt']) // 组合索引用于排序查询
    })
    console.log('rag_history 表创建成功')
  }

  // 创建 llm_configs 表
  if (!(await db.schema.hasTable('llm_configs'))) {
    await db.schema.createTable('llm_configs', (table) => {
      table.string('id').primary()
      table.string('model').notNullable() // 存储预设的模型ID，如 'glm-4'
      table.string('apiKey').notNullable() // 用户的 API Key
      table.boolean('isDefault').notNullable().defaultTo(false) // 是否为默认模型
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('model')
      table.index('isDefault')
    })

    console.log('llm_configs 表创建成功')
  }

  // 创建 appearance_settings 表
  // if (!(await db.schema.hasTable('appearance_settings'))) {
  //   await db.schema.createTable('appearance_settings', (table) => {
  //     table.string('id').primary()
  //     table.string('uiFont').notNullable().defaultTo('system') // UI 界面字体
  //     table.string('editorFont').notNullable().defaultTo('system') // 编辑器字体改为 system
  //     table.datetime('createdAt').notNullable()
  //     table.datetime('updatedAt').notNullable()
  //   })

  //   // 插入默认设置
  //   await db('appearance_settings').insert({
  //     id: uuidv4(),
  //     uiFont: 'system',
  //     editorFont: 'system', // 修改为 system
  //     createdAt: new Date(),
  //     updatedAt: new Date()
  //   })

  //   console.log('appearance_settings 表创建成功')
  // }
  if (!(await db.schema.hasTable('appearance_settings'))) {
    await db.schema.createTable('appearance_settings', (table) => {
      table.string('id').primary()
      table.string('uiFont').notNullable().defaultTo('system')
      table.string('editorFont').notNullable().defaultTo('system')
      table.string('defaultPage').notNullable().defaultTo('/home')
      // 分开添加三个展开状态字段
      table.boolean('starredExpanded').notNullable().defaultTo(true)
      table.boolean('tagsExpanded').notNullable().defaultTo(true)
      table.boolean('recentExpanded').notNullable().defaultTo(true)
      // 添加功能开关
      table.boolean('enableWhiteboard').notNullable().defaultTo(true)
      table.boolean('enableAIAssistant').notNullable().defaultTo(true)
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认设置
    await db('appearance_settings').insert({
      id: uuidv4(),
      uiFont: 'system',
      editorFont: 'system',
      defaultPage: '/home',
      starredExpanded: true,
      tagsExpanded: true,
      recentExpanded: true,
      enableWhiteboard: true,
      enableAIAssistant: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('appearance_settings 表创建成功')
  } else {
    // 检查是否需要添加 styleMode 列
    const hasStyleModeColumn = await db.schema.hasColumn('appearance_settings', 'styleMode')
    if (!hasStyleModeColumn) {
      await db.schema.alterTable('appearance_settings', (table) => {
        table.enum('styleMode', ['modern', 'classic']).notNullable().defaultTo('modern')
      })
      console.log('appearance_settings 表添加 styleMode 列成功')
    }
  }

  // 创建收藏的渐变表
  if (!(await db.schema.hasTable('favorite_gradients'))) {
    await db.schema.createTable('favorite_gradients', (table) => {
      table.string('id').primary()
      // 通用渐变
      table.json('universalGradients').notNullable().defaultTo('[]')
      // 明暗模式特定的渐变
      table.json('lightGradients').notNullable().defaultTo('[]')
      table.json('darkGradients').notNullable().defaultTo('[]')
      // 时间戳
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认记录
    await db('favorite_gradients').insert({
      id: uuidv4(),
      universalGradients: '[]',
      lightGradients: '[]',
      darkGradients: '[]',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('favorite_gradients 表创建成功')
  }

  // 创建番茄钟记录表
  if (!(await db.schema.hasTable('pomodoro_records'))) {
    await db.schema.createTable('pomodoro_records', (table) => {
      table.string('id').primary()
      table.date('date').notNullable() // YYYY-MM-DD 格式
      table.integer('count').notNullable().defaultTo(0) // 当天完成的番茄数
      table.integer('totalMinutes').notNullable().defaultTo(0) // 总专注时间(分钟)
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('date')
      table.index('createdAt')
    })
    console.log('pomodoro_records 表创建成功')
  }

  // 创建番茄钟设置表
  if (!(await db.schema.hasTable('pomodoro_settings'))) {
    await db.schema.createTable('pomodoro_settings', (table) => {
      table.string('id').primary()
      table.integer('defaultDuration').notNullable().defaultTo(25) // 默认时长(分钟)
      table.integer('breakDuration').notNullable().defaultTo(5) // 休息时长(分钟)
      table.enum('sound', ['ocean', 'rain', 'fire', 'none']).notNullable().defaultTo('none')
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认设置
    await db('pomodoro_settings').insert({
      id: uuidv4(),
      defaultDuration: 25,
      breakDuration: 5,
      sound: 'none',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('pomodoro_settings 表创建成功')
  } else {
    // 检查是否需要添加 breakDuration 列
    const hasBreakDurationColumn = await db.schema.hasColumn('pomodoro_settings', 'breakDuration')
    if (!hasBreakDurationColumn) {
      await db.schema.alterTable('pomodoro_settings', (table) => {
        table.integer('breakDuration').notNullable().defaultTo(5)
      })
      console.log('pomodoro_settings 表添加 breakDuration 列成功')
    }
  }

  // 创建每日金句表
  if (!(await db.schema.hasTable('daily_quotes'))) {
    await db.schema.createTable('daily_quotes', (table) => {
      table.string('id').primary()
      table.text('content').notNullable()
      table.string('author').notNullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })
    console.log('daily_quotes 表创建完成，开始导入金句...')

    // 导入默认金句
    await importQuotes()
    console.log('daily_quotes 表创建和数据导入完成')
  }

  // 创建 ed_whiteboards 表
  if (!(await db.schema.hasTable('ed_whiteboards'))) {
    await db.schema.createTable('ed_whiteboards', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.text('content').notNullable() // 使用 text 类型存储 JSON 字符串
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').notNullable()
      table.string('folder_id').nullable()
      table.json('tags').nullable() // 存储标签数组

      // 索引
      table.index('folder_id')
      table.index('created_at')
      table.index('updated_at')
    })
    console.log('ed_whiteboards 表创建成功')
  }

  // 创建 ed_whiteboard_note_refs 表
  if (!(await db.schema.hasTable('ed_whiteboard_note_refs'))) {
    await db.schema.createTable('ed_whiteboard_note_refs', (table) => {
      table.string('id').primary()
      table.string('note_id').notNullable()
      table.string('whiteboard_id').notNullable()
      table.json('position').notNullable() // 存储位置信息
      table.datetime('created_at').notNullable()

      // 外键约束
      table.foreign('note_id').references('notes.id').onDelete('CASCADE')
      table.foreign('whiteboard_id').references('ed_whiteboards.id').onDelete('CASCADE')

      // 索引
      table.index('note_id')
      table.index('whiteboard_id')
      table.index(['whiteboard_id', 'note_id']) // 组合索引
      table.index('created_at')
    })
    console.log('ed_whiteboard_note_refs 表创建成功')
  }

  // 创建认证状态表
  if (!(await db.schema.hasTable('auth_state'))) {
    await db.schema.createTable('auth_state', (table) => {
      table.string('id').primary()
      table.text('encryptedData').notNullable() // 加密存储的认证状态数据
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })
    console.log('auth_state 表创建成功')
  }
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists('connections')
  await db.schema.dropTableIfExists('whiteboard_groups')
  await db.schema.dropTableIfExists('whiteboard_notes')
  await db.schema.dropTableIfExists('root_whiteboards')
  await db.schema.dropTableIfExists('whiteboards')
  await db.schema.dropTableIfExists('tags')
  await db.schema.dropTableIfExists('cardboxes')
  await db.schema.dropTableIfExists('notes')
  await db.schema.dropTableIfExists('user_settings') // 添加这一行
  await db.schema.dropTableIfExists('filter_rules')
  await db.schema.dropTableIfExists('custom_filters')
  await db.schema.dropTableIfExists('note_embeddings')
  await db.schema.dropTableIfExists('word_category_relations')
  await db.schema.dropTableIfExists('dictionary_suggestions')
  await db.schema.dropTableIfExists('dictionary_categories')
  await db.schema.dropTableIfExists('dictionary')
  await db.schema.dropTableIfExists('rag_history')
  await db.schema.dropTableIfExists('llm_configs')
  await db.schema.dropTableIfExists('appearance_settings')
  // 注意删除顺序：先删除有外键约束的表
  await db.schema.dropTableIfExists('note_images')
  await db.schema.dropTableIfExists('image_references')
  // 注意删除顺序：先删除有外键约束的表
  await db.schema.dropTableIfExists('time_block_settings')
  await db.schema.dropTableIfExists('time_block_days')
  await db.schema.dropTableIfExists('time_blocks')
  await db.schema.dropTableIfExists('backup_history')
  await db.schema.dropTableIfExists('backup_settings')
  await db.schema.dropTableIfExists('licenses')
  await db.schema.dropTableIfExists('future_logs')
  await db.schema.dropTableIfExists('monthly_logs')
  await db.schema.dropTableIfExists('webdav_sync_history')
  await db.schema.dropTableIfExists('webdav_config')
  await db.schema.dropTableIfExists('note_versions')
  await db.schema.dropTableIfExists('flashcard_settings')
  await db.schema.dropTableIfExists('review_records')
  await db.schema.dropTableIfExists('daily_stats')
  await db.schema.dropTableIfExists('drafts')
  await db.schema.dropTableIfExists('theme_settings')
  await db.schema.dropTableIfExists('favorite_gradients')
  await db.schema.dropTableIfExists('pomodoro_records')
  await db.schema.dropTableIfExists('pomodoro_settings')
  await db.schema.dropTableIfExists('daily_quotes')
  await db.schema.dropTableIfExists('ed_whiteboard_note_refs')
  await db.schema.dropTableIfExists('ed_whiteboards')
  await db.schema.dropTableIfExists('auth_state')
  console.log('所有表已删除')
}
