import { Knex } from 'knex'

export async function initDatabase(db: Knex): Promise<void> {
  // 创建 notes 表
  if (!(await db.schema.hasTable('notes'))) {
    await db.schema.createTable('notes', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('note')
      table.string('address').notNullable()
      table.string('cardType').notNullable().defaultTo('Maincard')
      table.json('content').notNullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('tags').notNullable()
      table.json('linkedTo').notNullable()
      table.json('linkedFrom').notNullable()
      table.string('cardBoxId').nullable().index()
      table.string('parentId').nullable().index()
      table.boolean('isDeleted').notNullable().defaultTo(false)
      table.boolean('isStarred').notNullable().defaultTo(false)
      table.integer('starredOrder').nullable()
      table.integer('rightBarOrder').nullable()
    })
    console.log('notes 表创建成功')
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

  // 创建 tags 表
  if (!(await db.schema.hasTable('tags'))) {
    await db.schema.createTable('tags', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('tag')
      table.string('name').notNullable().unique()
      table.string('color').notNullable()
    })
    console.log('tags 表创建成功')
  }

  // 创建 whiteboards 表
  if (!(await db.schema.hasTable('whiteboards'))) {
    await db.schema.createTable('whiteboards', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('items').notNullable()
      table.json('position').notNullable() // 改为 notNullable()
      table.json('size').nullable()
      table.string('parentId').nullable()
      table.boolean('isRoot').notNullable().defaultTo(false)
      table.boolean('isStarred').notNullable().defaultTo(false)
      table.integer('starredOrder').nullable()
      table.float('zoomLevel').nullable() // 新增：缩放级别
      table.json('scrollPosition').nullable() // 新增：滚动位置
      table.float('scale').nullable() // 缩放比例
      table.float('translateX').nullable() // 平移X
      table.float('translateY').nullable() // 平移Y
    })
    console.log('whiteboards 表创建成功')
  }

  // 创建 root_whiteboards 表
  if (!(await db.schema.hasTable('root_whiteboards'))) {
    await db.schema.createTable('root_whiteboards', (table) => {
      table.string('id').primary()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('items').notNullable() // 包含子白板
      table.float('zoomLevel').nullable() // 新增：缩放级别
      table.json('scrollPosition').nullable() // 新增：滚动位置
      table.float('scale').nullable() // 新增：缩放比例
      table.float('translateX').nullable() // 新增：平移X
      table.float('translateY').nullable() // 新增：平移Y
      table.unique(['id']) // 确保只有一个根白板
    })
    console.log('root_whiteboards 表创建成功')
  }

  // 创建 whiteboard_items 表
  if (!(await db.schema.hasTable('whiteboard_items'))) {
    await db.schema.createTable('whiteboard_items', (table) => {
      table.string('id').primary()
      table.string('type').notNullable() // 'note', 'subboard', 'group'
      table.string('whiteboardId').notNullable().index()
      table.string('noteId').nullable() // 仅对 'note' 类型有效
      table.string('name').nullable() // 仅对 'group' 类型有效
      table.json('itemIds').nullable() // 仅对 'group' 类型有效
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.integer('zIndex').notNullable()
      table.integer('rotation').nullable() // 仅对 'note' 类型有效
      table.json('style').nullable() // 仅对 'group' 类型有效
    })
    console.log('whiteboard_items 表创建成功')
  }

  // 创建 connections 表
  if (!(await db.schema.hasTable('connections'))) {
    await db.schema.createTable('connections', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('connection')
      table.string('startItemId').notNullable()
      table.string('endItemId').notNullable()
      table.string('startEdge').notNullable()
      table.string('endEdge').notNullable()
      table.string('color').nullable()
      table.integer('thickness').nullable()
      table.string('label').nullable()
      table.string('lineStyle').notNullable().defaultTo('solid')
      table.boolean('startArrow').notNullable().defaultTo(false)
      table.boolean('endArrow').notNullable().defaultTo(true)
      table.string('lineShape').notNullable().defaultTo('straight')
      table.json('labelPosition').nullable() // 新增：标签位置
      table.json('position').nullable() // 新增：连线的位置
      table.json('controlPoints').nullable() // 新增：控制点
      table.integer('zIndex').nullable() // 新增：连线的层级
    })
    console.log('connections 表创建成功')
  }

  console.log('数据库初始化完成')
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists('connections')
  await db.schema.dropTableIfExists('whiteboard_items')
  await db.schema.dropTableIfExists('root_whiteboards') // 新增：删除根白板表
  await db.schema.dropTableIfExists('whiteboards')
  await db.schema.dropTableIfExists('tags')
  await db.schema.dropTableIfExists('cardboxes')
  await db.schema.dropTableIfExists('notes')
  console.log('所有表已删除')
}
