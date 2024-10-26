import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'

export async function initDatabase(db: Knex): Promise<void> {
  // 创建 notes 表
  // if (!(await db.schema.hasTable('notes'))) {
  //   await db.schema.createTable('notes', (table) => {
  //     table.string('id').primary()
  //     table.string('type').notNullable().defaultTo('note')
  //     table.string('address').notNullable()
  //     table.string('cardType').notNullable().defaultTo('Maincard')
  //     table.json('content').notNullable()
  //     table.datetime('createdAt').notNullable()
  //     table.datetime('updatedAt').notNullable()
  //     table.json('tags').notNullable()
  //     table.json('linkedTo').notNullable()
  //     table.json('linkedFrom').notNullable()
  //     table.string('cardBoxId').nullable().index()
  //     table.string('parentId').nullable().index()
  //     table.boolean('isDeleted').notNullable().defaultTo(false)
  //     table.boolean('isStarred').notNullable().defaultTo(false)
  //     table.integer('starredOrder').nullable()
  //     table.integer('rightBarOrder').nullable()
  //   })
  //   console.log('notes 表创建成功')
  // }
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
      // 新增字段
      table.json('keywords').nullable() // 存储关键词数组
    })
    console.log('notes 表创建成功')
  } else {
    // 检查是否需要添加 keywords 列
    const hasKeywordsColumn = await db.schema.hasColumn('notes', 'keywords')
    if (!hasKeywordsColumn) {
      await db.schema.table('notes', (table) => {
        table.json('keywords').nullable()
      })
      console.log('notes 表添加 keywords 列成功')
    }
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
  console.log('所有表已删除')
}
