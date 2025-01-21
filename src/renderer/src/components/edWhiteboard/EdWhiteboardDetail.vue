<template>
  <div class="ed-whiteboard-detail">
    <AppToolbar
      :whiteboardName="currentWhiteboard?.name || '未命名白板'"
      :showBackButton="false"
      :showForwardButton="false"
      @update:whiteboardName="updateWhiteboardName"
    />
    <div class="excalidraw-container">
      <ExcalidrawComponent
        :excalidrawAPI="setExcalidrawAPI"
        :onChange="handleChange"
        :onPointerUp="handlePointerUp"
        :UIOptions="{
          canvasActions: {
            loadScene: false,
            saveAsImage: { saveFileToDisk: true },
            export: { saveFileToDisk: true },
            saveToActiveFile: false
          }
        }"
        :langCode="'zh-CN'"
        :initialData="{
          elements: [],
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
            scrollX: 0,
            scrollY: 0,
            zoom: 1
          },
          scrollToContent: true
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { applyPureReactInVue } from 'veaury'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'
import { useEdWhiteboardStore } from '@renderer/stores/EdWhiteboardStore'
import { debounce } from 'lodash-es'
import AppToolbar from '../layout/AppToolbar.vue'

const ExcalidrawComponent = applyPureReactInVue(Excalidraw)

const route = useRoute()
const edWhiteboardStore = useEdWhiteboardStore()
const excalidrawAPI = ref<ExcalidrawImperativeAPI | null>(null)

// 获取当前白板数据
const currentWhiteboard = computed(() => edWhiteboardStore.currentWhiteboard)

// 更新白板名称
const updateWhiteboardName = (newName: string) => {
  if (currentWhiteboard.value) {
    edWhiteboardStore.updateWhiteboard({
      id: currentWhiteboard.value.id,
      name: newName
    })
  }
}

// 设置 API 实例
const setExcalidrawAPI = (api: ExcalidrawImperativeAPI) => {
  excalidrawAPI.value = api
  loadWhiteboard()
}

// 加载白板数据
const loadWhiteboard = async () => {
  const id = route.params.id as string
  if (!id || !excalidrawAPI.value) return

  try {
    const whiteboard = await edWhiteboardStore.fetchWhiteboardById(id)
    if (whiteboard?.content) {
      const data = JSON.parse(whiteboard.content)

      // 先更新场景
      excalidrawAPI.value.updateScene({
        elements: data.elements || [],
        appState: {
          ...data.appState,
          viewBackgroundColor: data.appState?.viewBackgroundColor || '#ffffff',
          currentItemFontFamily: data.appState?.currentItemFontFamily || 1,
          scrollX: data.appState?.scrollX || 0,
          scrollY: data.appState?.scrollY || 0,
          zoom: data.appState?.zoom || 1
        }
      })

      // 处理文件数据
      if (data.files) {
        const fileMap = new Map()
        for (const [id, file] of Object.entries(data.files)) {
          const { dataURL, mimeType } = file as any
          if (dataURL && mimeType) {
            // 将 base64 转换为 Blob
            const response = await fetch(dataURL)
            const blob = await response.blob()
            // 创建 File 对象
            const newFile = new File([blob], id, { type: mimeType })
            fileMap.set(id, {
              id,
              dataURL,
              mimeType,
              file: newFile
            })
          }
        }
        // 添加文件到画布
        await excalidrawAPI.value.addFiles(Array.from(fileMap.values()))
      }
    }
  } catch (error) {
    console.error('加载白板失败:', error)
  }
}

// 保存白板数据
const saveWhiteboard = debounce(async () => {
  if (!currentWhiteboard.value || !excalidrawAPI.value) return

  try {
    const elements = excalidrawAPI.value.getSceneElements()
    const appState = excalidrawAPI.value.getAppState()
    const files = excalidrawAPI.value.getFiles()

    // 处理文件数据
    const processedFiles: Record<string, any> = {}
    for (const [id, file] of Object.entries(files)) {
      processedFiles[id] = {
        id: file.id,
        dataURL: file.dataURL,
        mimeType: file.mimeType
      }
    }

    const sceneData = {
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom
      },
      files: processedFiles
    }

    await edWhiteboardStore.updateWhiteboard({
      id: currentWhiteboard.value.id,
      content: JSON.stringify(sceneData)
    })
  } catch (error) {
    console.error('保存白板失败:', error)
  }
}, 1000)

// 简化事件处理函数
const handleChange = () => {
  saveWhiteboard()
}

const handlePointerUp = () => {
  saveWhiteboard()
}

onBeforeUnmount(() => {
  saveWhiteboard.flush()
})
</script>

<style lang="scss" scoped>
.ed-whiteboard-detail {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-primary);
}

.toolbar {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .whiteboard-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }
}

.excalidraw-container {
  flex: 1;
  overflow: hidden;

  :deep(.excalidraw) {
    height: 100%;
  }
}
</style>
