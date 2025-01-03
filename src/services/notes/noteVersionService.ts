import { db } from '../../db/config'
import { v4 as uuidv4 } from 'uuid'
import type {
  NoteVersion,
  CreateVersionParams,
  GetVersionsParams
} from '@/renderer/src/types/NoteVersion'

// 配置 SQLite 数据库连接
db.client.pool.max = 1 // 限制连接池大小
db.client.acquireConnectionTimeout = 10000 // 增加连接超时时间

// 创建新版本
export async function createNoteVersion(params: CreateVersionParams): Promise<NoteVersion> {
  try {
    const lastVersion = await db('note_versions')
      .where('noteId', params.noteId)
      .orderBy('versionNumber', 'desc')
      .first()

    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1

    // 确保 content 是对象
    const content = typeof params.content === 'string' ? JSON.parse(params.content) : params.content

    const version: NoteVersion = {
      id: uuidv4(),
      noteId: params.noteId,
      content,
      address: params.address,
      cardType: params.cardType,
      createdAt: params.createdAt,
      versionCreatedAt: new Date(),
      versionNumber
    }

    // 保存到数据库时序列化 content
    const [savedVersion] = await db('note_versions')
      .insert({
        ...version,
        content: JSON.stringify(content) // 确保序列化
      })
      .returning('*')

    // 返回时解析 content
    return {
      ...savedVersion,
      content:
        typeof savedVersion.content === 'string'
          ? JSON.parse(savedVersion.content)
          : savedVersion.content
    }
  } catch (error) {
    console.error('后端→ 创建笔记版本失败:', error)
    throw error
  }
}

// 获取笔记的版本列表
export async function getNoteVersions(params: GetVersionsParams): Promise<NoteVersion[]> {
  try {
    let query = db('note_versions').where('noteId', params.noteId).orderBy('versionNumber', 'desc')

    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.offset(params.offset)
    }

    const versions = await query

    return versions.map((version) => ({
      ...version,
      content: JSON.parse(version.content)
    }))
  } catch (error) {
    console.error('获取笔记版本列表失败:', error)
    throw error
  }
}

// 获取指定版本
export async function getNoteVersion(
  noteId: string,
  versionId: string
): Promise<NoteVersion | null> {
  try {
    const version = await db('note_versions')
      .where({
        noteId,
        id: versionId
      })
      .first()

    if (!version) return null

    return {
      ...version,
      content: JSON.parse(version.content)
    }
  } catch (error) {
    console.error('获取笔记版本失败:', error)
    throw error
  }
}

// 恢复到指定版本
export async function restoreNoteVersion(noteId: string, versionId: string): Promise<void> {
  let retries = 3 // 最大重试次数

  while (retries > 0) {
    try {
      await db.transaction(
        async (trx) => {
          // 使用 FOR UPDATE 锁定相关记录
          const version = await trx('note_versions')
            .where({
              noteId,
              id: versionId
            })
            .forUpdate()
            .first()
            .then((v) => (v ? { ...v, content: JSON.parse(v.content) } : null))

          if (!version) {
            throw new Error('版本不存在')
          }

          const currentNote = await trx('notes').where('id', noteId).forUpdate().first()

          if (!currentNote) {
            throw new Error('笔记不存在')
          }

          // 其他代码保持不变...
          const currentContent =
            typeof currentNote.content === 'string'
              ? JSON.parse(currentNote.content)
              : currentNote.content

          const newVersionId = uuidv4()
          await trx('note_versions').insert({
            id: newVersionId,
            noteId,
            content: JSON.stringify(currentContent),
            address: currentNote.address,
            cardType: currentNote.cardType,
            createdAt: currentNote.createdAt,
            versionCreatedAt: new Date(),
            versionNumber: await getNextVersionNumber(noteId, trx)
          })

          await trx('notes')
            .where('id', noteId)
            .update({
              content: JSON.stringify(version.content),
              address: version.address,
              cardType: version.cardType,
              updatedAt: new Date()
            })

          const restoredVersionId = uuidv4()
          await trx('note_versions').insert({
            id: restoredVersionId,
            noteId,
            content: JSON.stringify(version.content),
            address: version.address,
            cardType: version.cardType,
            createdAt: version.createdAt,
            versionCreatedAt: new Date(),
            versionNumber: await getNextVersionNumber(noteId, trx)
          })
        },
        {
          isolationLevel: 'serializable'
        }
      )

      // 如果成功执行，直接返回
      return
    } catch (error) {
      retries--

      if ((error as Error).message.includes('database is locked')) {
        // 如果是数据库锁定错误且还有重试次数，等待后重试
        if (retries > 0) {
          console.log(`数据库锁定，等待重试... 剩余重试次数: ${retries}`)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries))) // 递增等待时间
          continue
        }
      }

      // 其他错误或重试次数用完，抛出错误
      console.error('后端→ 恢复笔记版本失败:', error)
      throw error
    }
  }
}

// 添加一个辅助函数来获取下一个版本号
async function getNextVersionNumber(noteId: string, trx: any): Promise<number> {
  const lastVersion = await trx('note_versions')
    .where('noteId', noteId)
    .orderBy('versionNumber', 'desc')
    .first()

  return lastVersion ? lastVersion.versionNumber + 1 : 1
}

// 清理旧版本
export async function cleanupOldVersions(noteId: string, keepCount: number = 50): Promise<void> {
  try {
    const versions = await db('note_versions')
      .where('noteId', noteId)
      .orderBy('versionNumber', 'desc')
      .select('id')

    if (versions.length > keepCount) {
      const versionsToDelete = versions.slice(keepCount)
      await db('note_versions')
        .whereIn(
          'id',
          versionsToDelete.map((v) => v.id)
        )
        .delete()
    }
  } catch (error) {
    console.error('清理旧版本失败:', error)
    throw error
  }
}

// 获取笔记的版本总数
export async function getNoteVersionCount(noteId: string): Promise<number> {
  try {
    const [{ count }] = await db('note_versions').where('noteId', noteId).count('* as count')

    return Number(count || 0)
  } catch (error) {
    console.error('后端→ 获取笔记版本总数失败:', error)
    throw error
  }
}

// 获取笔记的最新版本
export async function getLatestVersion(noteId: string): Promise<NoteVersion | null> {
  try {
    const version = await db('note_versions')
      .where('noteId', noteId)
      .orderBy('versionNumber', 'desc')
      .first()

    if (!version) return null

    return {
      ...version,
      content: JSON.parse(version.content)
    }
  } catch (error) {
    console.error('后端→ 获取最新版本失败:', error)
    throw error
  }
}

// 删除笔记的所有版本历史
export async function deleteNoteVersions(noteId: string): Promise<void> {
  try {
    await db('note_versions').where('noteId', noteId).delete()
  } catch (error) {
    console.error('后端→ 删除笔记版本历史失败:', error)
    throw error
  }
}

// 获取笔记版本的时间范围
export async function getVersionTimeRange(noteId: string): Promise<{
  earliest: Date
  latest: Date
} | null> {
  try {
    const result = await db('note_versions')
      .where('noteId', noteId)
      .select(db.min('versionCreatedAt').as('earliest'), db.max('versionCreatedAt').as('latest'))
      .first()

    if (!result || !result.earliest || !result.latest) return null

    return {
      earliest: result.earliest,
      latest: result.latest
    }
  } catch (error) {
    console.error('后端→ 获取版本时间范围失败:', error)
    throw error
  }
}
