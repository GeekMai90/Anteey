<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const customCssContent = ref('')
const styleElement = ref<HTMLStyleElement | null>(null)

// 加载自定义CSS
async function loadCustomCss() {
  try {
    // 获取自定义CSS内容
    customCssContent.value = await window.electronAPI.customCss.getCustomCssContent()

    // 如果内容为空，不需要继续处理
    if (!customCssContent.value.trim()) {
      console.log('自定义CSS为空')
      return
    }

    // 创建style标签并添加到head中
    const style = document.createElement('style')
    style.textContent = customCssContent.value
    style.setAttribute('id', 'custom-css')
    document.head.appendChild(style)

    // 保存引用以便在组件卸载时移除
    styleElement.value = style

    console.log('自定义CSS加载成功')
  } catch (error) {
    console.error('加载自定义CSS失败:', error)
  }
}

// 在组件挂载时加载自定义CSS
onMounted(() => {
  loadCustomCss()
})

// 在组件卸载时移除自定义CSS
onUnmounted(() => {
  if (styleElement.value) {
    document.head.removeChild(styleElement.value)
    styleElement.value = null
  }
})
</script>

<template>
  <div class="custom-css-loader" style="display: none"></div>
</template>
