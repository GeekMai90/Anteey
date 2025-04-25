import { watch, onMounted } from 'vue'
import { useUIStore } from '@renderer/stores/UIStore'

/**
 * 编辑器字体大小管理组合式函数
 * @returns 编辑器字体大小相关方法和状态
 */
export function useEditorFontSize() {
  const uiStore = useUIStore()

  // 更新编辑器字体大小CSS变量
  const updateEditorFontSize = (fontSize: number) => {
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`)
  }

  // 监听字体大小变化
  watch(
    () => uiStore.editorSettings.fontSize,
    (newSize) => {
      if (newSize) {
        updateEditorFontSize(newSize)
      }
    },
    { immediate: true }
  )

  // 组件挂载时初始化字体大小
  onMounted(() => {
    const fontSize = uiStore.editorSettings.fontSize || 16
    updateEditorFontSize(fontSize)
  })

  return {
    updateEditorFontSize
  }
}
