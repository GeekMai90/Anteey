import React, { useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

interface ExcalidrawWrapperProps {
  initialData: {
    elements: readonly ExcalidrawElement[]
    appState: Partial<AppState>
  }
  onChange: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void
}

const ExcalidrawWrapper = forwardRef<any, ExcalidrawWrapperProps>(
  ({ initialData, onChange }, ref) => {
    // 使用 MutableRefObject 来存储 API 引用
    const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)

    useImperativeHandle(ref, () => ({
      getSceneElements: () => excalidrawAPIRef.current?.getSceneElements(),
      getAppState: () => excalidrawAPIRef.current?.getAppState(),
      current: excalidrawAPIRef.current
    }))

    const handleChange = useCallback(
      (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        onChange(elements, appState, files)
      },
      [onChange]
    )

    return (
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          excalidrawAPIRef.current = api // 这样赋值是安全的
        }}
        initialData={initialData}
        onChange={handleChange}
        theme="light"
      />
    )
  }
)

export const createExcalidrawWrapper = (
  container: HTMLElement,
  options: ExcalidrawWrapperProps
) => {
  const root = createRoot(container)
  let wrapperRef: any = null

  root.render(
    <ExcalidrawWrapper
      initialData={options.initialData}
      onChange={options.onChange}
      ref={(ref) => {
        wrapperRef = ref
      }}
    />
  )

  return {
    destroy: () => {
      root.unmount()
    },
    getScene: () => {
      if (!wrapperRef) return null
      return {
        elements: wrapperRef.getSceneElements(),
        appState: wrapperRef.getAppState()
      }
    },
    exportToBlob: async (opts: any) => {
      if (!wrapperRef) return null
      return await exportToBlob({
        ...opts,
        elements: wrapperRef.getSceneElements(),
        appState: wrapperRef.getAppState()
      })
    }
  }
}
