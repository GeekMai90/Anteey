import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('notes', (table) => {
    table.integer('starred_order').nullable()
    table.integer('right_bar_order').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('notes', (table) => {
    table.dropColumn('starred_order')
    table.dropColumn('right_bar_order')
  })
}
