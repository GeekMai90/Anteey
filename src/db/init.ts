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
      table.datetime('lastVectorizedAt').nullable().index()

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

    // 检查是否需要添加 lastVectorizedAt 字段
    const hasLastVectorizedAtColumn = await db.schema.hasColumn('notes', 'lastVectorizedAt')
    if (!hasLastVectorizedAtColumn) {
      await db.schema.alterTable('notes', (table) => {
        table.datetime('lastVectorizedAt').nullable()
      })

      // 添加索引
      await db.schema.table('notes', (table) => {
        table.index('lastVectorizedAt')
      })

      console.log('lastVectorizedAt 字段添加成功')
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

  if (!(await db.schema.hasTable('user_settings'))) {
    await db.schema.createTable('user_settings', (table) => {
      table.string('id').primary()
      table.string('authorName').notNullable().defaultTo('麦先生的专栏')
      table.string('authorMotto').notNullable().defaultTo('一起践行终身成长')
      table.string('globalHotkey').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加窗口相关的列
      table.integer('window_width')
      table.integer('window_height')
      table.integer('window_x')
      table.integer('window_y')
      table.boolean('is_maximized')
      table.float('zoom_factor')
    })
    console.log('user_settings 表创建成功')

    // 创建默认设置
    await db('user_settings').insert({
      id: uuidv4(),
      authorName: '麦先生的专栏',
      authorMotto: '一起践行终身成长',
      createdAt: new Date(),
      updatedAt: new Date(),
      window_width: 1280,
      window_height: 800,
      is_maximized: true,
      zoom_factor: 1.0
    })
  } else {
    // 检查并添加缺失的列
    const columns = [
      { name: 'globalHotkey', type: 'string' },
      { name: 'window_width', type: 'integer' },
      { name: 'window_height', type: 'integer' },
      { name: 'window_x', type: 'integer' },
      { name: 'window_y', type: 'integer' },
      { name: 'is_maximized', type: 'boolean' },
      { name: 'zoom_factor', type: 'float' }
    ]

    for (const column of columns) {
      const hasColumn = await db.schema.hasColumn('user_settings', column.name)
      if (!hasColumn) {
        await db.schema.alterTable('user_settings', (table) => {
          if (column.type === 'string') {
            table.string(column.name).nullable()
          } else if (column.type === 'integer') {
            table.integer(column.name).nullable()
          } else if (column.type === 'boolean') {
            table.boolean(column.name).defaultTo(true)
          } else if (column.type === 'float') {
            table.float(column.name).defaultTo(1.0)
          }
        })
        console.log(`user_settings 表添加 ${column.name} 列成功`)
      }
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
      table.json('deepseekConfig').nullable() // 添加 DeepSeek 配置字段

      // 索引
      table.index('model')
      table.index('isDefault')
    })

    console.log('llm_configs 表创建成功')
  } else {
    // 检查是否需要添加 deepseekConfig 列
    const hasDeepseekConfig = await db.schema.hasColumn('llm_configs', 'deepseekConfig')
    if (!hasDeepseekConfig) {
      await db.schema.table('llm_configs', (table) => {
        table.json('deepseekConfig').nullable()
      })
      console.log('llm_configs 表添加 deepseekConfig 列成功')
    }
  }

  // 创建 appearance_settings 表
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
    // 检查是否需要添加新列
    const columns = [
      { name: 'defaultPage', type: 'string', default: '/home' },
      { name: 'starredExpanded', type: 'boolean', default: true },
      { name: 'tagsExpanded', type: 'boolean', default: true },
      { name: 'recentExpanded', type: 'boolean', default: true },
      { name: 'enableWhiteboard', type: 'boolean', default: true },
      { name: 'enableAIAssistant', type: 'boolean', default: true }
    ]

    for (const column of columns) {
      const hasColumn = await db.schema.hasColumn('appearance_settings', column.name)
      if (!hasColumn) {
        await db.schema.alterTable('appearance_settings', (table) => {
          if (column.type === 'boolean') {
            table.boolean(column.name).notNullable().defaultTo(column.default)
          } else if (column.type === 'string') {
            table.string(column.name).notNullable().defaultTo(column.default)
          }
        })
        console.log(`appearance_settings 表添加 ${column.name} 列成功`)
      }
    }
  }

  // 创建激活许可证表
  if (!(await db.schema.hasTable('licenses'))) {
    await db.schema.createTable('licenses', (table) => {
      table.string('id').primary()
      table.string('machineId').notNullable()
      table.text('encryptedData').notNullable() // 新的加密数据字段
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      table.index('machineId')
    })
    console.log('licenses 表创建成功')
  }

  // 创建备份设置表
  if (!(await db.schema.hasTable('backup_settings'))) {
    await db.schema.createTable('backup_settings', (table) => {
      table.string('backup_path').notNullable()
      table.boolean('auto_backup').defaultTo(false)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
    console.log('backup_settings 表创建成功')
  }

  // 创建备份历史记录表
  if (!(await db.schema.hasTable('backup_history'))) {
    await db.schema.createTable('backup_history', (table) => {
      table.increments('id')
      table.string('backup_file_path').notNullable()
      table.string('backup_file_name').notNullable()
      table.integer('backup_size').notNullable()
      table.string('created_at').notNullable()

      // 添加索引以优化查询
      table.index('created_at')
    })
    console.log('backup_history 表创建成功')
  }

  // 重新创建时间块主表
  if (!(await db.schema.hasTable('time_block_days'))) {
    await db.schema.createTable('time_block_days', (table) => {
      table.string('id').primary()
      table.date('date').notNullable().unique() // YYYY-MM-DD
      table.string('weather').nullable() // 天气状态
      table.string('mood').nullable() // 心情状态
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('date')
      table.index('createdAt')
    })
    console.log('time_block_days 表创建成功')
  }

  // 时间块内容表
  if (!(await db.schema.hasTable('time_blocks'))) {
    await db.schema.createTable('time_blocks', (table) => {
      table.string('id').primary()
      table.string('dayId').notNullable()
      table.integer('hour').notNullable() // 0-23
      table.text('content').nullable() // 存储编辑器的 HTML 内容
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 外键约束
      table.foreign('dayId').references('time_block_days.id').onDelete('CASCADE')

      // 复合唯一约束
      table.unique(['dayId', 'hour'])

      // 索引
      table.index('dayId')
      table.index(['dayId', 'hour'])
    })
    console.log('time_blocks 表创建成功')
  }

  // 创建时间块设置表
  if (!(await db.schema.hasTable('time_block_settings'))) {
    await db.schema.createTable('time_block_settings', (table) => {
      table.boolean('enabled').notNullable().defaultTo(true)
      table.integer('startTime').notNullable().defaultTo(5)
      table.integer('endTime').notNullable().defaultTo(23)
    })

    // 插入默认设置
    await db('time_block_settings').insert({
      enabled: true,
      startTime: 5,
      endTime: 23
    })

    console.log('time_block_settings 表创建成功')
  }

  // 创建未来日志表
  if (!(await db.schema.hasTable('future_logs'))) {
    await db.schema.createTable('future_logs', (table) => {
      table.string('id').primary()
      table.text('content').nullable() // 存储编辑器的 HTML 内容
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('createdAt')
      table.index('updatedAt')
    })
    console.log('future_logs 表创建成功')
  }

  // 创建月度日志表
  if (!(await db.schema.hasTable('monthly_logs'))) {
    await db.schema.createTable('monthly_logs', (table) => {
      table.string('id').primary()
      table.integer('year').notNullable() // 年份
      table.integer('month').notNullable() // 月份（1-12）
      table.text('content').nullable() // 存储编辑器的 HTML 内容
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加联合唯一索引确保每个月份只有一条记录
      table.unique(['year', 'month'])

      // 索引
      table.index(['year', 'month'])
      table.index('createdAt')
      table.index('updatedAt')
    })
    console.log('monthly_logs 表创建成功')
  }

  // 创建 cloud_sync_config 表
  if (!(await db.schema.hasTable('cloud_sync_config'))) {
    await db.schema.createTable('cloud_sync_config', (table) => {
      table.string('id').primary()
      table.enum('syncType', ['none', 'webdav', 's3']).notNullable().defaultTo('none')
      table.boolean('enabled').notNullable().defaultTo(false)
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('syncType')
      table.index('enabled')
    })

    // 插入默认配置
    await db('cloud_sync_config').insert({
      id: uuidv4(),
      syncType: 'none',
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('cloud_sync_config 表创建成功')
  }

  // 创建 webdav_config 表
  if (!(await db.schema.hasTable('webdav_config'))) {
    await db.schema.createTable('webdav_config', (table) => {
      table.string('id').primary()
      table.boolean('enabled').notNullable().defaultTo(false)
      table.string('serverType').notNullable()
      table.string('url').notNullable()
      table.string('username').notNullable()
      table.string('password').notNullable()
      table.integer('syncInterval').notNullable().defaultTo(15)
      table.boolean('autoSync').notNullable().defaultTo(false)
      table.string('syncDirection').notNullable().defaultTo('bidirectional')
      table
        .json('syncFileTypes')
        .notNullable()
        .defaultTo(JSON.stringify(['all']))
      table.datetime('lastSyncTime').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })
    console.log('webdav_config 表创建成功')
  }

  // 创建 webdav_sync_history 表
  if (!(await db.schema.hasTable('webdav_sync_history'))) {
    await db.schema.createTable('webdav_sync_history', (table) => {
      table.string('id').primary()
      table.datetime('timestamp').notNullable()
      table.string('type').notNullable() // 'auto' | 'manual'
      table.string('status').notNullable() // 'success' | 'failed'
      table.text('details').notNullable() // JSON 字符串
      table.datetime('createdAt').notNullable().defaultTo(db.fn.now())
    })
    console.log('webdav_sync_history 表创建成功')
  }

  // 创建版本表
  if (!(await db.schema.hasTable('note_versions'))) {
    await db.schema.createTable('note_versions', (table) => {
      // 版本标识
      table.string('id').primary()
      table.string('noteId').notNullable().index() // 关联的笔记ID
      table.integer('versionNumber').notNullable() // 版本号

      // 笔记核心信息
      table.json('content').notNullable() // 版本内容
      table.string('address').notNullable() // 笔记地址
      table.string('cardType').notNullable() // 笔记类型
      table.datetime('createdAt').notNullable() // 笔记创建时间

      // 版本信息
      table.datetime('versionCreatedAt').notNullable() // 版本创建时间

      // 外键约束
      table.foreign('noteId').references('notes.id').onDelete('CASCADE')

      // 索引
      table.index(['noteId', 'versionNumber']) // 用于按版本号查询
      table.index('versionCreatedAt') // 用于按时间查询
    })

    console.log('note_versions 表创建成功')
  }

  // 创建记忆卡设置表
  if (!(await db.schema.hasTable('flashcard_settings'))) {
    await db.schema.createTable('flashcard_settings', (table) => {
      table.string('id').primary()
      // 学习计划
      table.integer('dailyGoal').notNullable().defaultTo(30) // 每日目标数量
      table.integer('newCardsPerDay').notNullable().defaultTo(20) // 新卡片数量
      table.integer('reviewsPerDay').notNullable().defaultTo(100) // 复习上限
      table.integer('dayStartsAt').notNullable().defaultTo(4) // 新的一天开始时间
      // 学习顺序
      table.enum('newCardPosition', ['mix', 'front', 'end']).notNullable().defaultTo('mix')
      // 算法参数
      table.float('requestRetention').notNullable().defaultTo(0.9)
      table.integer('maximumInterval').notNullable().defaultTo(180)
      // 界面设置
      table.boolean('simplifyButtons').notNullable().defaultTo(false)
      table.boolean('showNextReview').notNullable().defaultTo(true)
      // 统计设置
      table.integer('maxAnswerTime').notNullable().defaultTo(20) // 秒
      table.integer('forgetThreshold').notNullable().defaultTo(4) // 次数
      table.integer('reviewAgainAfter').notNullable().defaultTo(15) // 分钟
      // 时间戳
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认设置
    await db('flashcard_settings').insert({
      id: uuidv4(),
      dailyGoal: 30,
      newCardsPerDay: 20,
      reviewsPerDay: 100,
      dayStartsAt: 4,
      newCardPosition: 'mix',
      requestRetention: 0.9,
      maximumInterval: 180,
      simplifyButtons: false,
      showNextReview: true,
      maxAnswerTime: 20,
      forgetThreshold: 4,
      reviewAgainAfter: 15,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('flashcard_settings 表创建成功')
  }

  // 创建复习记录表
  if (!(await db.schema.hasTable('review_records'))) {
    await db.schema.createTable('review_records', (table) => {
      table.string('id').primary()
      table.string('noteId').notNullable().index()
      table.datetime('reviewedAt').notNullable()
      table.string('feedback').notNullable() // ReviewFeedback 类型
      table.integer('reviewTime').notNullable() // 毫秒

      // 外键约束
      table.foreign('noteId').references('notes.id').onDelete('CASCADE')

      // 索引
      table.index('reviewedAt')
      table.index(['noteId', 'reviewedAt'])
    })
    console.log('review_records 表创建成功')
  }

  // 创建每日统计表
  if (!(await db.schema.hasTable('daily_stats'))) {
    await db.schema.createTable('daily_stats', (table) => {
      table.string('date').primary() // YYYY-MM-DD 格式
      table.integer('uniqueCards').notNullable().defaultTo(0)
      table.integer('totalReviews').notNullable().defaultTo(0)
      table.integer('totalTime').notNullable().defaultTo(0) // 毫秒
      table
        .json('feedbackStats')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            skip: 0,
            forgot: 0,
            partially_recalled: 0,
            recalled_effort: 0,
            easily_recalled: 0
          })
        )
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('date')
    })
    console.log('daily_stats 表创建成功')
  }

  // 在 initDatabase 函数中添加以下代码
  if (!(await db.schema.hasTable('drafts'))) {
    await db.schema.createTable('drafts', (table) => {
      table.string('id').primary()
      table.json('content').notNullable().defaultTo('{}')
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加索引
      table.index('updatedAt')
    })
    console.log('drafts 表创建成功')
  }

  // 创建主题设置表
  if (!(await db.schema.hasTable('theme_settings'))) {
    await db.schema.createTable('theme_settings', (table) => {
      table.string('id').primary()
      // 通用渐变设置
      table.json('universalGradient').nullable()
      // 明暗模式特定的渐变设置
      table.json('lightGradient').nullable()
      table.json('darkGradient').nullable()
      // 渐变模式
      table.enum('gradientMode', ['universal', 'specific']).notNullable().defaultTo('universal')
      // 主题模式
      table.enum('themeMode', ['system', 'light', 'dark']).notNullable().defaultTo('system')
      // 是否启用渐变背景
      table.boolean('enableGradient').notNullable().defaultTo(true)
      // 新增：主题风格模式
      table.enum('styleMode', ['modern', 'classic']).notNullable().defaultTo('modern')
      // 时间戳
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认设置
    await db('theme_settings').insert({
      id: uuidv4(),
      universalGradient: JSON.stringify({
        startColor: '#89f7fe',
        endColor: '#66a6ff',
        angle: 45,
        noiseAmount: 15
      }),
      gradientMode: 'universal',
      themeMode: 'system',
      enableGradient: true,
      styleMode: 'modern',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('theme_settings 表创建成功')
  } else {
    // 检查是否需要添加 styleMode 列
    const hasStyleModeColumn = await db.schema.hasColumn('theme_settings', 'styleMode')
    if (!hasStyleModeColumn) {
      await db.schema.alterTable('theme_settings', (table) => {
        table.enum('styleMode', ['modern', 'classic']).notNullable().defaultTo('modern')
      })
      console.log('theme_settings 表添加 styleMode 列成功')
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

  // 创建信件表
  if (!(await db.schema.hasTable('letters'))) {
    await db.schema.createTable('letters', (table) => {
      table.string('id').primary()
      table.enum('type', ['daily', 'weekly']).notNullable() // 信件类型
      table.text('content').notNullable() // 信件内容
      table.datetime('createTime').notNullable() // 创建时间
      table.boolean('readStatus').notNullable().defaultTo(false) // 阅读状态
      table.datetime('startTime').notNullable() // 统计开始时间
      table.datetime('endTime').notNullable() // 统计结束时间

      // 添加索引以优化查询性能
      table.index('type')
      table.index('createTime')
      table.index('readStatus')
      table.index(['type', 'createTime'])
    })
    console.log('letters 表创建成功')
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

  // 创建 prompt_config 表
  if (!(await db.schema.hasTable('prompt_config'))) {
    await db.schema.createTable('prompt_config', (table) => {
      table.string('id').primary()
      table.text('systemPrompt').notNullable() // 改为 systemPrompt
      table.text('defaultSystemPrompt').notNullable() // 改为 defaultSystemPrompt
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认配置
    await db('prompt_config').insert({
      id: uuidv4(),
      systemPrompt: '你是一个智能助手，请帮助我完成工作。',
      defaultSystemPrompt: `# 角色定位：智慧顾问
## 核心定位
- 专业知识分享者
- 思维引导者
- 平等对话者

## 回应准则
1. 内容质量
   - 保持专业性与准确性
   - 适度引用可靠来源
   - 分层次展示观点

2. 表达风格
   - 使用清晰的逻辑结构
   - 运用恰当的类比和比喻
   - 保持语言的优雅与自然
   - 避免过度情感化表达

3. 知识边界
   - 明确表达确定性信息
   - 对不确定内容保持谨慎
   - 适时承认知识局限
   - 引导用户深入思考

4. 互动原则
   - 始终保持Markdown格式
   - 注重双向思维交流
   - 适时提出启发性问题
   - 营造专业而友好的氛围

## 错误处理
- 及时承认并纠正错误
- 提供修正的理由和依据
- 保持开放和谦逊的态度

---
*专业、理性、温和，以知识和智慧为核心的对话体验。*
`,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('prompt_config 表创建成功')
  }

  // 创建 mindboards 表
  if (!(await db.schema.hasTable('mindboards'))) {
    await db.schema.createTable('mindboards', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.json('flow_data').notNullable() // 存储 VueFlow 的完整状态
      table.text('preview_image').nullable() // 添加预览图字段,存储 base64 格式的图片数据
      table.boolean('is_favorite').notNullable().defaultTo(false) // 添加收藏标记字段
      table.datetime('created_at').notNullable()
      table.datetime('updated_at').notNullable()

      // 索引
      table.index('created_at')
      table.index('updated_at')
      table.index('is_favorite') // 添加收藏字段的索引
    })
    console.log('mindboards 表创建成功')
  } else {
    // 检查是否需要添加 preview_image 列
    const hasPreviewImageColumn = await db.schema.hasColumn('mindboards', 'preview_image')
    if (!hasPreviewImageColumn) {
      await db.schema.alterTable('mindboards', (table) => {
        table.text('preview_image').nullable()
      })
      console.log('mindboards 表添加 preview_image 列成功')
    }

    // 检查是否需要添加 is_favorite 列
    const hasFavoriteColumn = await db.schema.hasColumn('mindboards', 'is_favorite')
    if (!hasFavoriteColumn) {
      await db.schema.alterTable('mindboards', (table) => {
        table.boolean('is_favorite').notNullable().defaultTo(false)
      })
      console.log('mindboards 表添加 is_favorite 列成功')
    }
  }

  // 创建 s3_config 表
  if (!(await db.schema.hasTable('s3_config'))) {
    await db.schema.createTable('s3_config', (table) => {
      table.string('id').primary()
      table.boolean('enabled').notNullable().defaultTo(false)
      table.string('provider').notNullable() // aws | aliyun | tencent | custom
      table.string('region').notNullable()
      table.string('bucket').notNullable()
      table.string('accessKeyId').notNullable()
      table.string('secretAccessKey').notNullable()
      table.string('endpoint').nullable() // 自定义 S3 兼容服务的端点
      table.boolean('autoSync').notNullable().defaultTo(false)
      table.integer('syncInterval').notNullable().defaultTo(15) // 同步间隔（分钟）
      table.string('syncDirection').notNullable().defaultTo('bidirectional')
      table
        .json('syncFileTypes')
        .notNullable()
        .defaultTo(JSON.stringify(['all']))
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 索引
      table.index('enabled')
      table.index('provider')
      table.index('autoSync')
    })
    console.log('s3_config 表创建成功')
  }

  // 创建 s3_provider_configs 表，用于存储不同提供商的配置
  if (!(await db.schema.hasTable('s3_provider_configs'))) {
    await db.schema.createTable('s3_provider_configs', (table) => {
      table.string('id').primary()
      table.string('provider').notNullable().index() // aws | aliyun | tencent | custom
      table.string('region').notNullable()
      table.string('bucket').notNullable()
      table.string('accessKeyId').notNullable()
      table.string('secretAccessKey').notNullable()
      table.string('endpoint').nullable() // 自定义 S3 兼容服务的端点
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加唯一索引确保每个提供商只有一条配置
      table.unique(['provider'])
    })
    console.log('s3_provider_configs 表创建成功')
  }

  // 创建 s3_sync_history 表
  if (!(await db.schema.hasTable('s3_sync_history'))) {
    await db.schema.createTable('s3_sync_history', (table) => {
      table.string('id').primary()
      table.datetime('timestamp').notNullable()
      table.string('type').notNullable() // auto | manual
      table.string('status').notNullable() // success | failed
      table.json('details').notNullable() // 存储同步详情，包括错误信息、同步文件数等
      table.datetime('createdAt').notNullable()

      // 索引
      table.index('timestamp')
      table.index('type')
      table.index('status')
    })
    console.log('s3_sync_history 表创建成功')
  }

  // 创建 dinox_sync_records 表
  if (!(await db.schema.hasTable('dinox_sync_records'))) {
    await db.schema.createTable('dinox_sync_records', (table) => {
      table.string('id').primary()
      table.string('dinoxNoteId').notNullable().index() // Dinox 的笔记 ID
      table.string('antinoteId').notNullable().index() // 对应到我们系统中的笔记 ID
      table.datetime('lastSyncTime').notNullable() // 最后同步时间
      table.boolean('graduated').notNullable().defaultTo(false) // 是否已经"毕业"（转换为其他类型）
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 外键约束
      table.foreign('antinoteId').references('notes.id').onDelete('CASCADE')

      // 索引
      table.index(['graduated', 'lastSyncTime'])
    })
    console.log('dinox_sync_records 表创建成功')
  }

  // 创建 dinox_sync_config 表
  if (!(await db.schema.hasTable('dinox_sync_config'))) {
    await db.schema.createTable('dinox_sync_config', (table) => {
      table.string('id').primary()
      table.string('token').notNullable() // Dinox API token
      table.string('lastSyncTime').notNullable().defaultTo('1900-01-01 00:00:00') // 上次同步时间
      table.boolean('autoSync').notNullable().defaultTo(false) // 是否自动同步
      table.integer('autoSyncInterval').notNullable().defaultTo(30) // 自动同步间隔（分钟）
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
    })

    // 插入默认配置
    await db('dinox_sync_config').insert({
      id: uuidv4(),
      token: '',
      lastSyncTime: '1900-01-01 00:00:00',
      autoSync: false,
      autoSyncInterval: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('dinox_sync_config 表创建成功')
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
  await db.schema.dropTableIfExists('mindboards')
  await db.schema.dropTableIfExists('s3_sync_history')
  await db.schema.dropTableIfExists('s3_config')
  await db.schema.dropTableIfExists('s3_provider_configs')
  await db.schema.dropTableIfExists('cloud_sync_config')
  await db.schema.dropTableIfExists('letters')
  console.log('所有表已删除')
}
