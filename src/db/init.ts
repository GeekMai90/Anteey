import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

export async function initDatabase(db: Knex): Promise<void> {
  // 创建 notes 表
  if (!(await db.schema.hasTable('notes'))) {
    await db.schema.createTable('notes', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('note')
      table.string('address').notNullable().index() // 卡片地址索引
      table.string('cardType').notNullable().defaultTo('Maincard').index()
      table.json('content').notNullable()
      table.datetime('createdAt').notNullable().index()
      table.datetime('updatedAt').notNullable().index()

      // 标签系统 - 只存储标签名数组
      table.json('tags').notNullable().defaultTo('[]')

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

      // 关系树缓存
      table.json('relationshipTree').nullable()

      // 图谱数据
      table.json('graphData').nullable()

      table.string('cardBoxId').nullable().index()
      table.string('parentId').nullable().index()
      table.boolean('isDeleted').notNullable().defaultTo(false).index()
      table.boolean('isStarred').notNullable().defaultTo(false).index()
      table.integer('starredOrder').nullable()
      table.integer('rightBarOrder').nullable()

      // 语义相关
      table.json('keywords').nullable()
      table.json('semanticVector').nullable()

      // 元数据
      table.json('metadata').nullable()

      // 常用查询场景的复合索引
      // 1. 卡片盒筛选 + 排序
      table.index(['cardBoxId', 'updatedAt']) // 某个卡片盒内按更新时间排序
      table.index(['cardBoxId', 'createdAt']) // 某个卡片盒内按创建时间排序
      table.index(['cardType', 'createdAt']) // 某个卡片类型内按创建时间排序

      // 2. 收件箱（未分类笔记）+ 排序
      table.index(['cardBoxId', 'isDeleted', 'updatedAt']) // 查找未分类的未删除笔记，按时间排序
      table.index(['cardBoxId', 'isDeleted', 'createdAt']) // 查找未分类的未删除笔记，按创建时间排序

      // 3. 收藏夹排序
      table.index(['isStarred', 'starredOrder', 'updatedAt'])
    })
    console.log('notes 表创建成功')
  }

  // 创建 tags 表
  if (!(await db.schema.hasTable('tags'))) {
    await db.schema.createTable('tags', (table) => {
      table.string('id').primary()
      table.string('name').notNullable().unique() // 完整的标签名，如 'work/project/dev'
      table.json('path').notNullable() // 标签路径，如 ['work', 'project', 'dev']
      table.string('color').nullable() // 标签颜色（可选）
      table.string('icon').nullable() // 标签图标（可选）

      // 标签元数据
      table
        .json('metadata')
        .notNullable()
        .defaultTo(
          JSON.stringify({
            count: 0, // 使用该标签的笔记数量
            lastUsed: new Date() // 最后使用时间
          })
        )

      table.datetime('createdAt').notNullable().index() // 按创建时间排序
      table.datetime('updatedAt').notNullable().index() // 按更新时间排序

      // 添加单独的列来支持排序和索引
      table.integer('useCount').notNullable().defaultTo(0).index() // 使用次数
      table.datetime('lastUsedAt').notNullable().index() // 最后使用时间
    })
    console.log('tags 表创建成功')
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
  if (!(await db.schema.hasTable('whiteboard_notes'))) {
    await db.schema.createTable('whiteboard_notes', (table) => {
      table.string('id').primary()
      table.string('whiteboardId').notNullable().index()
      table.string('noteId').notNullable().index()
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.integer('zIndex').notNullable()
      table.float('rotation').notNullable().defaultTo(0)
      table.boolean('isAutoHeight').notNullable().defaultTo(false)
      table.string('type').notNullable().defaultTo('card')
      table.string('content').nullable()
      table.string('imageUrl').nullable()
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
      createdAt: new Date(),
      updatedAt: new Date()
    })
    console.log('user_settings 默认数据创建成功')
  }

  // 创建 excalidraw_documents 表
  // 创建 excalidraw_documents 表
  if (!(await db.schema.hasTable('excalidraw_documents'))) {
    await db.schema.createTable('excalidraw_documents', (table) => {
      table.string('id').primary()
      table.string('noteId').notNullable().index() // 关联的笔记 ID
      table.json('elements').notNullable() // 存储 Excalidraw 元素数组
      table.json('appState').notNullable() // 存储应用状态
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()

      // 添加外键约束
      table.foreign('noteId').references('id').inTable('notes').onDelete('CASCADE')

      // 添加索引
      table.index(['noteId', 'updatedAt'])
    })
    console.log('excalidraw_documents 表创建成功')
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
  await db.schema.dropTableIfExists('excalidraw_documents')
  console.log('所有表已删除')
}
