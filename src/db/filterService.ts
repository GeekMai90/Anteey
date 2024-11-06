import { db } from './config'
import { v4 as uuidv4 } from 'uuid'
import {
  CustomFilter,
  CreateCustomFilterInput,
  UpdateCustomFilterInput
} from '../renderer/src/types/Filter'

// 工具函数：将数据库记录转换为 CustomFilter 对象
async function convertToCustomFilter(
  record: any,
  trx = db // 默认使用普通连接，但可以传入事务连接
): Promise<CustomFilter> {
  // 使用传入的连接查询规则
  const rules = await trx('filter_rules').where('filterId', record.id).orderBy('createdAt', 'asc')

  return {
    id: record.id,
    name: record.name,
    matchType: record.matchType,
    isPinned: Boolean(record.isPinned),
    pinnedOrder: record.pinnedOrder || undefined,
    rules: rules.map((rule) => ({
      id: rule.id,
      field: rule.field,
      operator: rule.operator,
      value: JSON.parse(rule.value),
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt)
    })),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

// 创建自定义筛选规则
export async function createCustomFilter(input: CreateCustomFilterInput): Promise<CustomFilter> {
  try {
    return await db.transaction(async (trx) => {
      const now = new Date()
      const filterId = uuidv4()

      // 1. 创建筛选规则主记录
      const [filter] = await trx('custom_filters')
        .insert({
          id: filterId,
          name: input.name,
          matchType: input.matchType,
          isPinned: false,
          createdAt: now,
          updatedAt: now
        })
        .returning('*')

      // 2. 创建具体的筛选规则
      const rules = await Promise.all(
        input.rules.map(async (rule) => {
          const [ruleRecord] = await trx('filter_rules')
            .insert({
              id: uuidv4(),
              filterId,
              field: rule.field,
              operator: rule.operator,
              value: JSON.stringify(rule.value),
              createdAt: now,
              updatedAt: now
            })
            .returning('*')
          return ruleRecord
        })
      )

      // 3. 直接构建返回数据，避免额外查询
      return {
        ...filter,
        isPinned: Boolean(filter.isPinned),
        pinnedOrder: filter.pinnedOrder || undefined,
        rules: rules.map((rule) => ({
          ...rule,
          value: JSON.parse(rule.value),
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt)
        })),
        createdAt: new Date(filter.createdAt),
        updatedAt: new Date(filter.updatedAt)
      }
    })
  } catch (error) {
    console.error('后端→ 创建自定义筛选规则失败:', error)
    throw error
  }
}

// 获取所有自定义筛选规则
export async function getAllCustomFilters(): Promise<CustomFilter[]> {
  try {
    const filters = await db('custom_filters').orderBy([
      { column: 'isPinned', order: 'desc' },
      { column: 'pinnedOrder', order: 'asc' },
      { column: 'createdAt', order: 'desc' }
    ])

    return Promise.all(filters.map((filter) => convertToCustomFilter(filter)))
  } catch (error) {
    console.error('后端→ 获取所有自定义筛选规则失败:', error)
    throw error
  }
}

// 根据ID获取筛选规则
export async function getCustomFilterById(id: string): Promise<CustomFilter | null> {
  try {
    const filter = await db('custom_filters').where({ id }).first()
    return filter ? await convertToCustomFilter(filter) : null
  } catch (error) {
    console.error('后端→ 获取筛选规则失败:', error)
    throw error
  }
}

// 更新筛选规则
export async function updateCustomFilter(
  id: string,
  input: UpdateCustomFilterInput
): Promise<CustomFilter> {
  try {
    return await db.transaction(async (trx) => {
      const now = new Date()

      // 1. 更新主记录
      const updateData: any = {
        updatedAt: now
      }

      if (input.name !== undefined) updateData.name = input.name
      if (input.matchType !== undefined) updateData.matchType = input.matchType
      if (input.isPinned !== undefined) updateData.isPinned = input.isPinned
      if (input.pinnedOrder !== undefined) updateData.pinnedOrder = input.pinnedOrder

      const [filter] = await trx('custom_filters').where({ id }).update(updateData).returning('*')

      // 2. 如果提供了新的规则，则更新规则
      if (input.rules) {
        // 删除旧规则
        await trx('filter_rules').where({ filterId: id }).delete()

        // 创建新规则
        const rules = await Promise.all(
          input.rules.map(async (rule) => {
            const [ruleRecord] = await trx('filter_rules')
              .insert({
                id: uuidv4(),
                filterId: id,
                field: rule.field,
                operator: rule.operator,
                value: JSON.stringify(rule.value),
                createdAt: now,
                updatedAt: now
              })
              .returning('*')
            return ruleRecord
          })
        )

        // 3. 直接构建返回数据
        return {
          ...filter,
          isPinned: Boolean(filter.isPinned),
          pinnedOrder: filter.pinnedOrder || undefined,
          rules: rules.map((rule) => ({
            ...rule,
            value: JSON.parse(rule.value),
            createdAt: new Date(rule.createdAt),
            updatedAt: new Date(rule.updatedAt)
          })),
          createdAt: new Date(filter.createdAt),
          updatedAt: new Date(filter.updatedAt)
        }
      }

      // 如果没有更新规则，则使用事务查询现有规则
      return await convertToCustomFilter(filter, trx)
    })
  } catch (error) {
    console.error('后端→ 更新筛选规则失败:', error)
    throw error
  }
}

// 删除筛选规则
export async function deleteCustomFilter(id: string): Promise<void> {
  try {
    await db.transaction(async (trx) => {
      // 由于设置了外键约束，删除主记录时会自动删除相关的规则
      const deleted = await trx('custom_filters').where({ id }).delete()

      if (!deleted) {
        throw new Error(`筛选规则不存在: ${id}`)
      }
    })
  } catch (error) {
    console.error('后端→ 删除筛选规则失败:', error)
    throw error
  }
}

// 更新筛选规则的置顶状态
export async function updateFilterPinned(
  id: string,
  isPinned: boolean,
  pinnedOrder?: number
): Promise<CustomFilter> {
  try {
    const [filter] = await db('custom_filters')
      .where({ id })
      .update({
        isPinned,
        pinnedOrder: isPinned ? (pinnedOrder ?? null) : null,
        updatedAt: new Date()
      })
      .returning('*')

    if (!filter) {
      throw new Error(`筛选规则不存在: ${id}`)
    }

    return await convertToCustomFilter(filter)
  } catch (error) {
    console.error('后端→ 更新筛选规则置顶状态失败:', error)
    throw error
  }
}
