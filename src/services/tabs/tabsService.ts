import { v4 as uuidv4 } from 'uuid'
import {
  TabItem,
  GetTabsRequest,
  AddTabRequest,
  UpdateTabRequest,
  ReorderTabsRequest,
  TabsResponse,
  TabItemType
} from '@shared/types/tabs'
import { db } from '../../db/config'

/**
 * 数据库记录与TabItem之间的转换接口
 * 包含数据库表中的字段
 */
interface TabRecord {
  id: string
  contentId: string
  type: TabItemType
  title: string
  address: string | null
  isPinned: number // SQLite中的布尔值使用0/1
  lastAccessTime: number
  order: number
  icon: string | null
  metadata: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

/**
 * 将数据库记录转换为TabItem对象
 * @param record 数据库记录
 * @returns TabItem对象
 */
function convertToTabItem(record: TabRecord): TabItem {
  return {
    id: record.id,
    contentId: record.contentId,
    type: record.type as TabItemType,
    title: record.title,
    address: record.address || undefined,
    isPinned: record.isPinned === 1, // SQLite中的布尔值转换
    lastAccessTime: record.lastAccessTime,
    order: record.order,
    icon: record.icon || undefined,
    metadata: record.metadata || undefined
  }
}

/**
 * 获取所有标签页
 * @param params 查询参数
 * @returns 标签页列表和总数
 */
export async function getTabs(params?: GetTabsRequest): Promise<TabsResponse> {
  try {
    // 查询两组分别的标签：固定标签和非固定标签
    const pinnedTabsQuery = db('tabs').where('isPinned', 1).orderBy('order', 'asc')

    const unpinnedTabsQuery = db('tabs').where('isPinned', 0).orderBy('order', 'asc')

    // 添加限制
    if (params?.limit) {
      pinnedTabsQuery.limit(params.limit)
      unpinnedTabsQuery.limit(params.limit)
    }

    // 执行查询
    const pinnedTabs = await pinnedTabsQuery
    const unpinnedTabs = await unpinnedTabsQuery

    // 合并结果，保持固定标签在前，非固定标签在后
    const tabs = [...pinnedTabs, ...unpinnedTabs]

    const totalCount = await db('tabs').count('* as count').first()

    return {
      tabs: tabs.map((tab) => convertToTabItem(tab as TabRecord)),
      totalCount: totalCount ? (totalCount.count as number) : 0
    }
  } catch (error) {
    console.error('后端→ 获取标签页失败:', error)
    throw error
  }
}

/**
 * 根据ID获取标签页
 * @param id 标签页ID
 * @returns 标签页对象，如果不存在则返回null
 */
export async function getTabById(id: string): Promise<TabItem | null> {
  try {
    const tab = await db('tabs').where('id', id).first()
    if (!tab) return null
    return convertToTabItem(tab as TabRecord)
  } catch (error) {
    console.error(`后端→ 获取标签页失败 ${id}:`, error)
    throw error
  }
}

/**
 * 添加新标签页
 * @param params 标签页参数
 * @returns 新建的标签页
 */
export async function addTab(params: AddTabRequest): Promise<TabItem> {
  try {
    // 获取最大的order值
    const maxOrderResult = await db('tabs').max('order as maxOrder').first()
    const maxOrder = maxOrderResult ? (maxOrderResult.maxOrder as number) || 0 : 0

    // 检查是否已存在相同内容的标签页
    const existingTab = await db('tabs')
      .where('contentId', params.contentId)
      .where('type', params.type)
      .first()

    if (existingTab) {
      // 如果存在，更新访问时间和可能的address
      const updateData: any = {
        lastAccessTime: Date.now(),
        updatedAt: new Date()
      }

      // 如果提供了address且现有标签没有address，则更新它
      if (params.address && !existingTab.address) {
        updateData.address = params.address
      }

      await db('tabs').where('id', existingTab.id).update(updateData)

      // 获取更新后的标签页
      const updatedTab = await db('tabs').where('id', existingTab.id).first()
      return convertToTabItem(updatedTab as TabRecord)
    }

    // 创建新标签页
    const now = new Date()
    const tabData = {
      id: uuidv4(),
      contentId: params.contentId,
      type: params.type,
      title: params.title,
      address: params.address || null,
      isPinned: params.isPinned ? 1 : 0, // 转换为SQLite的布尔值
      lastAccessTime: Date.now(),
      order: maxOrder + 1,
      icon: params.icon || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      createdAt: now,
      updatedAt: now
    }

    await db('tabs').insert(tabData)
    return convertToTabItem(tabData as TabRecord)
  } catch (error) {
    console.error('后端→ 添加标签页失败:', error)
    throw error
  }
}

/**
 * 更新标签页
 * @param params 更新参数
 * @returns 更新后的标签页
 */
export async function updateTab(params: UpdateTabRequest): Promise<TabItem> {
  try {
    const { id, ...updateData } = params

    // 准备更新的数据
    const updateFields: any = {
      updatedAt: new Date()
    }

    // 只更新提供的字段
    if (updateData.title !== undefined) updateFields.title = updateData.title
    if (updateData.address !== undefined) updateFields.address = updateData.address
    if (updateData.isPinned !== undefined) updateFields.isPinned = updateData.isPinned ? 1 : 0
    if (updateData.order !== undefined) updateFields.order = updateData.order
    if (updateData.metadata !== undefined) {
      updateFields.metadata = updateData.metadata ? JSON.stringify(updateData.metadata) : null
    }

    // 更新标签页
    await db('tabs').where('id', id).update(updateFields)

    // 获取更新后的标签页
    const updatedTab = await db('tabs').where('id', id).first()
    if (!updatedTab) {
      throw new Error(`标签页 ${id} 不存在`)
    }

    return convertToTabItem(updatedTab as TabRecord)
  } catch (error) {
    console.error(`后端→ 更新标签页失败 ${params.id}:`, error)
    throw error
  }
}

/**
 * 删除标签页
 * @param id 标签页ID
 */
export async function deleteTab(id: string): Promise<void> {
  try {
    await db('tabs').where('id', id).delete()
  } catch (error) {
    console.error(`后端→ 删除标签页失败 ${id}:`, error)
    throw error
  }
}

/**
 * 更新多个标签页的顺序
 * @param params 排序参数
 * @returns 更新后的标签页列表
 */
export async function reorderTabs(params: ReorderTabsRequest): Promise<TabItem[]> {
  try {
    // 使用事务确保数据一致性
    const updatedTabs = await db.transaction(async (trx) => {
      const tabs: TabItem[] = []

      // 逐个更新标签页的order
      for (const item of params.tabs) {
        await trx('tabs').where('id', item.id).update({
          order: item.order,
          updatedAt: new Date()
        })

        const tab = await trx('tabs').where('id', item.id).first()
        if (tab) {
          tabs.push(convertToTabItem(tab as TabRecord))
        }
      }

      return tabs
    })

    return updatedTabs
  } catch (error) {
    console.error('后端→ 更新标签页顺序失败:', error)
    throw error
  }
}

/**
 * 更新标签页访问时间
 * @param id 标签页ID
 * @returns 更新后的标签页
 */
export async function updateTabAccessTime(id: string): Promise<TabItem> {
  try {
    // 获取原有标签信息，保留原顺序
    const originalTab = await db('tabs').where('id', id).first()
    if (!originalTab) {
      throw new Error(`标签页 ${id} 不存在`)
    }

    // 只更新访问时间
    await db('tabs').where('id', id).update({
      lastAccessTime: Date.now(),
      updatedAt: new Date()
    })

    // 获取更新后的标签页
    const updatedTab = await db('tabs').where('id', id).first()
    if (!updatedTab) {
      throw new Error(`标签页 ${id} 不存在`)
    }

    return convertToTabItem(updatedTab as TabRecord)
  } catch (error) {
    console.error(`后端→ 更新标签页访问时间失败 ${id}:`, error)
    throw error
  }
}

/**
 * 设置标签页的固定状态
 * @param id 标签页ID
 * @param isPinned 是否固定
 * @returns 更新后的标签页
 */
export async function pinTab(id: string, isPinned: boolean): Promise<TabItem> {
  try {
    await db('tabs')
      .where('id', id)
      .update({
        isPinned: isPinned ? 1 : 0,
        updatedAt: new Date()
      })

    const updatedTab = await db('tabs').where('id', id).first()
    if (!updatedTab) {
      throw new Error(`标签页 ${id} 不存在`)
    }

    return convertToTabItem(updatedTab as TabRecord)
  } catch (error) {
    console.error(`后端→ 设置标签页固定状态失败 ${id}:`, error)
    throw error
  }
}

/**
 * 获取特定内容的标签页
 * @param contentId 内容ID
 * @param type 内容类型
 * @returns 标签页对象，如果不存在则返回null
 */
export async function getTabByContent(
  contentId: string,
  type: TabItemType
): Promise<TabItem | null> {
  try {
    const tab = await db('tabs').where('contentId', contentId).where('type', type).first()

    if (!tab) return null
    return convertToTabItem(tab as TabRecord)
  } catch (error) {
    console.error(`后端→ 获取内容标签页失败 ${contentId}:`, error)
    throw error
  }
}
