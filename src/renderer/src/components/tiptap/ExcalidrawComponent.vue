<template>
  <node-view-wrapper class="excalidraw-block" :class="{ 'is-fullscreen': node.attrs.isFullscreen }">
    <!-- 缩略图模式 -->
    <div v-if="!node.attrs.isFullscreen" class="thumbnail-mode" @click="enterFullscreen">
      <div v-if="node.attrs.thumbnail" class="thumbnail">
        <img :src="node.attrs.thumbnail" alt="Excalidraw diagram" />
      </div>
      <div v-else class="empty-thumbnail">
        <span>点击编辑绘图</span>
      </div>
      <div class="toolbar">
        <button @click.stop="enterFullscreen">
          <i class="i-mdi-fullscreen text-lg" />
        </button>
      </div>
    </div>

    <!-- 全屏编辑模式 -->
    <div v-else class="fullscreen-mode">
      <div class="fullscreen-toolbar">
        <button @click="exitFullscreen">返回笔记</button>
      </div>
      <div ref="excalidrawContainer" class="excalidraw-wrapper"></div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { createRoot } from 'react-dom/client'
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw'
import React from 'react'
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import type { ExcalidrawDocument } from '../../types/Note'

const props = defineProps<{
  node: {
    attrs: {
      id: string
      excalidrawId: string | null
      thumbnail: string | null
      isFullscreen: boolean
    }
  }
  updateAttributes: (attrs: any) => void
}>()

const excalidrawContainer = ref<HTMLDivElement | null>(null)
let excalidrawRoot: any = null
let excalidrawAPI: ExcalidrawImperativeAPI | null = null
const excalidrawData = ref<ExcalidrawDocument | null>(null)

// 加载 Excalidraw 数据
const loadExcalidrawData = async () => {
  if (!props.node.attrs.excalidrawId) return null

  try {
    const result = await window.electronAPI.getExcalidrawDocument(props.node.attrs.excalidrawId)
    if (result.success && result.document) {
      excalidrawData.value = result.document
    }
  } catch (error) {
    console.error('Failed to load excalidraw data:', error)
  }
}

const handleChange = async (elements: readonly ExcalidrawElement[], appState: AppState) => {
  if (!props.node.attrs.excalidrawId) return

  const cleanAppState: Partial<AppState> = {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize,
    theme: appState.theme
  }

  try {
    await window.electronAPI.updateExcalidrawDocument({
      id: props.node.attrs.excalidrawId,
      data: {
        elements: elements.map((el) => ({
          ...el,
          strokeSharpness: 'sharp' // 确保 strokeSharpness 属性存在
        })),
        appState: cleanAppState
      }
    })
  } catch (error) {
    console.error('Failed to update excalidraw document:', error)
  }
}

const saveDrawing = async () => {
  if (!excalidrawAPI || !props.node.attrs.excalidrawId) return

  const elements = excalidrawAPI.getSceneElements()
  const appState = excalidrawAPI.getAppState()

  const cleanAppState: Partial<AppState> = {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize,
    theme: appState.theme
  }

  try {
    const blob = await exportToBlob({
      elements,
      appState: cleanAppState,
      files: null,
      getDimensions: () => ({ width: 300, height: 200 })
    })

    await window.electronAPI.updateExcalidrawDocument({
      id: props.node.attrs.excalidrawId,
      data: {
        elements: elements.map((el) => ({
          ...el,
          strokeSharpness: 'sharp' // 确保 strokeSharpness 属性存在
        })),
        appState: cleanAppState
      }
    })

    props.updateAttributes({
      thumbnail: URL.createObjectURL(blob)
    })
  } catch (error) {
    console.error('Failed to save drawing:', error)
  }
}

const enterFullscreen = () => {
  props.updateAttributes({
    isFullscreen: true
  })
}

const exitFullscreen = async () => {
  await saveDrawing()
  props.updateAttributes({
    isFullscreen: false
  })
}

const initExcalidraw = async () => {
  if (!excalidrawContainer.value || !props.node.attrs.isFullscreen) return

  await loadExcalidrawData()
  if (!excalidrawData.value) return

  excalidrawRoot = createRoot(excalidrawContainer.value)
  excalidrawRoot.render(
    React.createElement(Excalidraw, {
      initialData: {
        elements: excalidrawData.value.elements,
        appState: excalidrawData.value.appState
      },
      onChange: handleChange,
      excalidrawAPI: (api: ExcalidrawImperativeAPI) => {
        excalidrawAPI = api
      },
      theme: 'light'
    })
  )
}

const destroyExcalidraw = () => {
  if (excalidrawRoot) {
    excalidrawRoot.unmount()
    excalidrawRoot = null
    excalidrawAPI = null
  }
}

watch(
  () => props.node.attrs.isFullscreen,
  async (newValue) => {
    if (newValue) {
      await initExcalidraw()
    } else {
      await saveDrawing()
      destroyExcalidraw()
    }
  }
)

onMounted(() => {
  if (props.node.attrs.isFullscreen) {
    props.updateAttributes({
      isFullscreen: false
    })
  }
})

onBeforeUnmount(async () => {
  if (excalidrawAPI) {
    await saveDrawing()
  }
  destroyExcalidraw()
})
</script>

<style lang="scss" scoped>
.excalidraw-block {
  margin: 1em 0;

  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: white;
  }

  .thumbnail-mode {
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;

    .thumbnail {
      width: 100%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }

    .empty-thumbnail {
      width: 100%;
      height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-hover);
      }
    }

    .toolbar {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;

      button {
        padding: 4px;
        border: none;
        background: var(--color-bg-primary);
        border-radius: 4px;
        cursor: pointer;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-bg-hover);
        }
      }
    }
  }

  .fullscreen-mode {
    height: 100%;
    display: flex;
    flex-direction: column;

    .fullscreen-toolbar {
      padding: 8px;
      border-bottom: 1px solid var(--color-border);

      button {
        padding: 4px 8px;
        border: none;
        background: var(--color-bg-primary);
        border-radius: 4px;
        cursor: pointer;
        color: var(--color-text-secondary);

        &:hover {
          background: var(--color-bg-hover);
        }
      }
    }

    .excalidraw-wrapper {
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
