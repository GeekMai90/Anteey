import { db } from '../config'

export async function up() {
  await db.schema.alterTable('notes', (table) => {
    table.integer('starred_order')
    table.integer('right_bar_order')
  })
}

export async function down() {
  await db.schema.alterTable('notes', (table) => {
    table.dropColumn('starred_order')
    table.dropColumn('right_bar_order')
  })
}
