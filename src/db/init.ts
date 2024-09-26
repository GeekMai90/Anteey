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
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.string('parentId').nullable()
      table.boolean('isRoot').notNullable().defaultTo(false)
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

  // 创建 root_whiteboards 表
  if (!(await db.schema.hasTable('root_whiteboards'))) {
    await db.schema.createTable('root_whiteboards', (table) => {
      table.string('id').primary()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('items').notNullable()
      table.float('zoomLevel').notNullable()
      table.json('scrollPosition').notNullable()
      table.float('scale').notNullable()
      table.float('translateX').notNullable()
      table.float('translateY').notNullable()
      table.unique(['id'])
    })
    console.log('root_whiteboards 表创建成功')
  }

  // 创建 whiteboard_items 表
  if (!(await db.schema.hasTable('whiteboard_items'))) {
    await db.schema.createTable('whiteboard_items', (table) => {
      table.string('id').primary()
      table.string('type').notNullable()
      table.string('whiteboardId').notNullable().index()
      table.string('noteId').nullable()
      table.string('name').nullable()
      table.json('itemIds').nullable()
      table.json('position').notNullable()
      table.json('size').notNullable()
      table.integer('zIndex').notNullable()
      table.float('rotation').notNullable().defaultTo(0)
      table.json('style').nullable()
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
      table.json('labelPosition').nullable()
      table.string('lineStyle').notNullable().defaultTo('solid')
      table.boolean('startArrow').notNullable().defaultTo(false)
      table.boolean('endArrow').notNullable().defaultTo(true)
      table.string('lineShape').notNullable().defaultTo('straight')
      table.json('position').notNullable()
      table.json('controlPoints').nullable()
      table.integer('zIndex').notNullable()
      table.json('size').notNullable()
      table.float('rotation').notNullable().defaultTo(0)
    })
    console.log('connections 表创建成功')
  }

  console.log('数据库初始化完成')
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists('connections')
  await db.schema.dropTableIfExists('whiteboard_items')
  await db.schema.dropTableIfExists('root_whiteboards')
  await db.schema.dropTableIfExists('whiteboards')
  await db.schema.dropTableIfExists('tags')
  await db.schema.dropTableIfExists('cardboxes')
  await db.schema.dropTableIfExists('notes')
  console.log('所有表已删除')
}
