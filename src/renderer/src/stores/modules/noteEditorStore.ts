// 笔记编辑相关
import { defineStore } from 'pinia'
import { useBaseStore } from './baseStore'
import { computed, ref } from 'vue'
import { debounce } from 'lodash-es'
import { CardType } from '@renderer/types/Note'

export type NoteEditorStore = ReturnType<typeof useNoteEditorStore>
export const useNoteEditorStore = defineStore('noteEditor', () => {
  const baseStore = useBaseStore()

  // 保存状态相关
  const savingOperations = ref(0)
  const currentNoteSaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('saved')

  // 添加 getter 用于获取当前保存状态
  // 明确定义 getter 的返回类型
  const getCurrentNoteSaveStatus = computed((): 'idle' | 'saving' | 'saved' | 'error' => {
    return currentNoteSaveStatus.value
  })

  // 更新保存状态
  const updateSaveStatus = (status: 'saving' | 'saved' | 'error') => {
    if (status === 'saving') {
      savingOperations.value++
      currentNoteSaveStatus.value = 'saving'
    } else {
      savingOperations.value = Math.max(0, savingOperations.value - 1)
      if (savingOperations.value === 0) {
        currentNoteSaveStatus.value = status
      }
    }
  }

  // 使用防抖只用于重置为 saved 状态
  const resetToSaved = debounce(() => {
    if (savingOperations.value === 0) {
      currentNoteSaveStatus.value = 'saved'
    }
  }, 2000)

  // 获取笔记
  const fetchNote = async (noteId: string) => {
    console.log('Store: fetchNote 开始:', { noteId, activeNotes: baseStore.activeNotes.value })

    try {
      // 1. 先检查缓存
      if (baseStore.noteCache.has(noteId)) {
        console.log('Store: 从缓存获取笔记')
        const note = baseStore.noteCache.get(noteId)!
        // 确保使用响应式更新
        baseStore.activeNotes.value = {
          ...baseStore.activeNotes.value,
          [noteId]: { ...note }
        }
        console.log('Store: 从缓存更新后的状态:', baseStore.activeNotes.value)
        return note
      }

      // 2. 缓存没有则从后端获取
      console.log('Store: 从后端获取笔记')
      const note = await window.electronAPI.getNote(noteId)
      console.log('Store: 后端返回的笔记:', note)

      if (note) {
        // 3. 更新缓存和活动笔记
        baseStore.noteCache.set(noteId, note)
        // 确保使用响应式更新
        baseStore.activeNotes.value = {
          ...baseStore.activeNotes.value,
          [noteId]: { ...note }
        }
        console.log('Store: 更新后的状态:', baseStore.activeNotes.value)
        return note
      } else {
        console.warn('Store: 未找到笔记:', noteId)
        return null
      }
    } catch (error) {
      console.error('Store: 获取笔记失败:', error)
      throw error
    }
  }

  // 激活笔记编辑
  const activateNote = (noteId: string) => {
    if (!baseStore.noteCache.has(noteId)) return null
    const note = baseStore.noteCache.get(noteId)!
    baseStore.activeNotes.value[noteId] = { ...note }
    return baseStore.activeNotes.value[noteId]
  }

  // 停用笔记编辑
  const deactivateNote = (noteId: string) => {
    delete baseStore.activeNotes.value[noteId]
  }

  // 更新笔记内容
  const updateNoteContent = async (noteId: string, content: any) => {
    console.log('Store: 开始更新笔记内容:', { noteId })

    // 1. 状态检查
    if (!baseStore.activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 2. 更新保存状态
    updateSaveStatus('saving')

    // 3. 记录更新标记，用于处理并发更新
    const updateTimestamp = Date.now()
    baseStore.pendingUpdates.set(`${noteId}-content`, {
      type: 'content',
      timestamp: updateTimestamp
    })

    // 4. 保存之前的状态（移到 try 外面）
    const previousState = {
      content: baseStore.activeNotes.value[noteId].content,
      cache: baseStore.noteCache.has(noteId) ? { ...baseStore.noteCache.get(noteId)! } : null,
      visible:
        noteId in baseStore.visibleNotes.value ? { ...baseStore.visibleNotes.value[noteId] } : null
    }

    try {
      // 5. 更新所有本地状态
      const updatedNote = {
        ...baseStore.activeNotes.value[noteId],
        content,
        updatedAt: new Date()
      }

      // 同步更新所有状态
      baseStore.activeNotes.value[noteId] = updatedNote
      if (baseStore.noteCache.has(noteId)) {
        baseStore.noteCache.set(noteId, updatedNote)
      }
      if (noteId in baseStore.visibleNotes.value) {
        baseStore.visibleNotes.value[noteId] = updatedNote
      }
      // 添加最小延迟确保用户能看到保存状态
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 6. 发送后端请求
      const serverUpdatedNote = await window.electronAPI.updateNoteContent(noteId, content)

      // 7. 检查是否有更新的pending更新
      const currentPending = baseStore.pendingUpdates.get(`${noteId}-content`)
      if (!currentPending || currentPending.timestamp <= updateTimestamp) {
        // 8. 使用服务器返回的数据更新状态
        baseStore.activeNotes.value[noteId] = serverUpdatedNote
        if (baseStore.noteCache.has(noteId)) {
          baseStore.noteCache.set(noteId, serverUpdatedNote)
        }
        if (noteId in baseStore.visibleNotes.value) {
          baseStore.visibleNotes.value[noteId] = serverUpdatedNote
        }
      }

      // 9. 更新成功
      updateSaveStatus('saved')
      resetToSaved()
      return serverUpdatedNote
    } catch (error) {
      // 10. 错误处理 - 回滚所有状态
      baseStore.activeNotes.value[noteId].content = previousState.content
      if (previousState.cache) {
        baseStore.noteCache.set(noteId, previousState.cache)
      }
      if (previousState.visible) {
        baseStore.visibleNotes.value[noteId] = previousState.visible
      }

      updateSaveStatus('error')
      console.error('更新内容失败:', error)
      throw error
    } finally {
      // 11. 清理pending状态
      baseStore.pendingUpdates.delete(`${noteId}-content`)
    }
  }

  // 更新笔记地址
  const updateNoteAddress = async (noteId: string, address: string) => {
    console.log('Store: 开始更新笔记地址:', { noteId, address })

    updateSaveStatus('saving')

    // 1. 检查笔记是否存在且处于编辑状态
    if (!baseStore.activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 2. 乐观更新
    baseStore.activeNotes.value[noteId] = {
      ...baseStore.activeNotes.value[noteId],
      address,
      updatedAt: new Date()
    }

    // 3. 同步更新 cache 和 visible (如果存在)
    if (baseStore.noteCache.has(noteId)) {
      baseStore.noteCache.set(noteId, { ...baseStore.activeNotes.value[noteId] })
    }
    if (noteId in baseStore.visibleNotes.value) {
      baseStore.visibleNotes.value[noteId] = { ...baseStore.activeNotes.value[noteId] }
    }

    // 4. 记录pending状态，防止并发更新
    baseStore.pendingUpdates.set(`${noteId}-address`, {
      type: 'address',
      timestamp: Date.now()
    })

    try {
      // 添加最小延迟确保用户能看到保存状态
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 5. 发送后端请求
      const updatedNote = await window.electronAPI.updateNoteAddress(noteId, address)

      // 6. 检查是否有更新的pending更新，避免覆盖新的更改
      const pendingUpdate = baseStore.pendingUpdates.get(`${noteId}-address`)
      if (!pendingUpdate || pendingUpdate.timestamp <= Date.now()) {
        // 7. 更新成功，同步所有状态
        baseStore.activeNotes.value[noteId] = updatedNote
        baseStore.noteCache.set(noteId, updatedNote)
        if (noteId in baseStore.visibleNotes.value) {
          baseStore.visibleNotes.value[noteId] = updatedNote
        }
      }
      updateSaveStatus('saved')
      resetToSaved()
      return updatedNote
    } catch (error) {
      // 8. 更新失败，回滚所有状态
      const originalNote = baseStore.noteCache.get(noteId)!
      baseStore.activeNotes.value[noteId] = { ...originalNote }
      if (noteId in baseStore.visibleNotes.value) {
        baseStore.visibleNotes.value[noteId] = { ...originalNote }
      }
      console.error('更新地址失败:', error)
      updateSaveStatus('error')
      throw error
    } finally {
      // 9. 清理pending状态
      baseStore.pendingUpdates.delete(`${noteId}-address`)
    }
  }

  // 更新笔记类型
  const updateNoteCardType = async (noteId: string, cardType: string) => {
    console.log('Store: 开始更新笔记类型:', { noteId, cardType })

    updateSaveStatus('saving')

    // 1. 检查笔记是否存在且处于编辑状态
    if (!baseStore.activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 2. 乐观更新
    baseStore.activeNotes.value[noteId] = {
      ...baseStore.activeNotes.value[noteId],
      cardType: cardType as CardType,
      updatedAt: new Date()
    }

    // 3. 同步更新 cache 和 visible
    if (baseStore.noteCache.has(noteId)) {
      baseStore.noteCache.set(noteId, { ...baseStore.activeNotes.value[noteId] })
    }
    if (noteId in baseStore.visibleNotes.value) {
      baseStore.visibleNotes.value[noteId] = { ...baseStore.activeNotes.value[noteId] }
    }

    // 4. 记录pending状态
    baseStore.pendingUpdates.set(`${noteId}-cardType`, {
      type: 'cardType',
      timestamp: Date.now()
    })

    try {
      // 添加最小延迟确保用户能看到保存状态
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 5. 发送后端请求
      const updatedNote = await window.electronAPI.updateNoteCardType(noteId, cardType)

      // 6. 检查是否有更新的pending更新
      const pendingUpdate = baseStore.pendingUpdates.get(`${noteId}-cardType`)
      if (!pendingUpdate || pendingUpdate.timestamp <= Date.now()) {
        // 7. 更新成功，同步所有状态
        baseStore.activeNotes.value[noteId] = updatedNote
        baseStore.noteCache.set(noteId, updatedNote)
        if (noteId in baseStore.visibleNotes.value) {
          baseStore.visibleNotes.value[noteId] = updatedNote
        }
      }

      updateSaveStatus('saved')
      resetToSaved()
      return updatedNote
    } catch (error) {
      // 8. 更新失败，回滚所有状态
      const originalNote = baseStore.noteCache.get(noteId)!
      baseStore.activeNotes.value[noteId] = { ...originalNote }
      if (noteId in baseStore.visibleNotes.value) {
        baseStore.visibleNotes.value[noteId] = { ...originalNote }
      }
      console.error('更新笔记类型失败:', error)
      updateSaveStatus('error')
      throw error
    } finally {
      // 9. 清理pending状态
      baseStore.pendingUpdates.delete(`${noteId}-cardType`)
    }
  }

  // 更新笔记的卡片盒
  const updateNoteCardBox = async (noteId: string, cardBoxId: string) => {
    console.log('Store: 开始更新笔记卡片盒:', { noteId, cardBoxId })

    // 1. 更新保存状态
    updateSaveStatus('saving')

    // 2. 检查笔记是否存在且处于编辑状态
    if (!baseStore.activeNotes.value[noteId]) {
      throw new Error('笔记不在编辑状态')
    }

    // 3. 乐观更新
    baseStore.activeNotes.value[noteId] = {
      ...baseStore.activeNotes.value[noteId],
      cardBoxId,
      updatedAt: new Date()
    }

    // 4. 同步更新 cache 和 visible
    if (baseStore.noteCache.has(noteId)) {
      baseStore.noteCache.set(noteId, { ...baseStore.activeNotes.value[noteId] })
    }
    if (noteId in baseStore.visibleNotes.value) {
      baseStore.visibleNotes.value[noteId] = { ...baseStore.activeNotes.value[noteId] }
    }

    // 5. 记录pending状态
    baseStore.pendingUpdates.set(`${noteId}-cardBox`, {
      type: 'cardBox',
      timestamp: Date.now()
    })

    try {
      // 添加最小延迟确保用户能看到保存状态
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 6. 发送后端请求
      const updatedNote = await window.electronAPI.updateNoteCardBox(noteId, cardBoxId)

      // 7. 检查是否有更新的pending更新
      const pendingUpdate = baseStore.pendingUpdates.get(`${noteId}-cardBox`)
      if (!pendingUpdate || pendingUpdate.timestamp <= Date.now()) {
        // 8. 更新成功，同步所有状态
        baseStore.activeNotes.value[noteId] = updatedNote
        baseStore.noteCache.set(noteId, updatedNote)
        if (noteId in baseStore.visibleNotes.value) {
          baseStore.visibleNotes.value[noteId] = updatedNote
        }
      }

      // 9. 更新成功
      updateSaveStatus('saved')
      resetToSaved()
      return updatedNote
    } catch (error) {
      // 10. 更新失败，回滚所有状态
      const originalNote = baseStore.noteCache.get(noteId)!
      baseStore.activeNotes.value[noteId] = { ...originalNote }
      if (noteId in baseStore.visibleNotes.value) {
        baseStore.visibleNotes.value[noteId] = { ...originalNote }
      }
      // 11. 更新失败
      updateSaveStatus('error')
      console.error('更新卡片盒失败:', error)
      throw error
    } finally {
      // 12. 清理pending状态
      baseStore.pendingUpdates.delete(`${noteId}-cardBox`)
    }
  }
  return {
    currentNoteSaveStatus,
    getCurrentNoteSaveStatus,
    fetchNote,
    activateNote,
    deactivateNote,
    updateNoteContent,
    updateNoteAddress,
    updateNoteCardType,
    updateNoteCardBox
  }
})
