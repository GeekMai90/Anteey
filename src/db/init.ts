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
      table.string('cardBoxId').nullable()
      table.string('parentId').nullable()
      table.boolean('isDeleted').notNullable().defaultTo(false)
      table.boolean('isStarred').notNullable().defaultTo(false)
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
      table.string('parentId').nullable()
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
      table.string('type').notNullable().defaultTo('whiteboard')
      table.string('name').notNullable()
      table.text('description').nullable()
      table.datetime('createdAt').notNullable()
      table.datetime('updatedAt').notNullable()
      table.json('items').notNullable()
      table.string('parentId').nullable()
    })
    console.log('whiteboards 表创建成功')
  }

  // 创建 connections 表
  if (!(await db.schema.hasTable('connections'))) {
    await db.schema.createTable('connections', (table) => {
      table.string('id').primary()
      table.string('type').notNullable().defaultTo('connection')
      table.string('whiteboardId').notNullable()
      table.string('sourceId').notNullable()
      table.string('targetId').notNullable()
      table.string('sourceType').notNullable()
      table.string('targetType').notNullable()
      table.string('label').nullable()
      table.string('lineType').notNullable()
      table.json('style').notNullable()
    })
    console.log('connections 表创建成功')
  }

  console.log('数据库初始化完成')
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTableIfExists('connections')
  await db.schema.dropTableIfExists('whiteboards')
  await db.schema.dropTableIfExists('tags')
  await db.schema.dropTableIfExists('cardboxes')
  await db.schema.dropTableIfExists('notes')
  console.log('所有表已删除')
}
