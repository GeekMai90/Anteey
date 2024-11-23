import React, { useLayoutEffect, useState } from 'react'
import { Tldraw, createTLStore, defaultShapeUtils, getSnapshot } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

interface TldrawWrapperProps {
  boardId?: string
}

export function TldrawWrapper({ boardId }: TldrawWrapperProps) {
  // 创建 store
  const [store] = useState(() => {
    const store = createTLStore({
      shapeUtils: defaultShapeUtils
    })
    return store
  })

  // 从 localStorage 加载数据
  useLayoutEffect(() => {
    if (!boardId) return

    const key = `tldraw-${boardId}`
    const savedData = localStorage.getItem(key)

    if (savedData) {
      try {
        const snapshot = JSON.parse(savedData)
        store.loadSnapshot(snapshot)
      } catch (error) {
        console.error('加载白板数据失败:', error)
      }
    }

    // 监听变化并保存
    const cleanupFn = store.listen(() => {
      const snapshot = getSnapshot(store)
      localStorage.setItem(key, JSON.stringify(snapshot))
    })

    return () => {
      cleanupFn()
    }
  }, [store, boardId])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Tldraw store={store} />
    </div>
  )
}
