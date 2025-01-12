<template>
  <div style="width: 100%; height: 100%">
    <TldrawComponent :ref="onReady" :locale="customTranslation" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { applyPureReactInVue } from 'veaury'

import { Tldraw } from '@tldraw/tldraw'

import type { Editor } from '@tldraw/tldraw'
import 'tldraw/tldraw.css'

const TldrawComponent = applyPureReactInVue(Tldraw)

const editorRef = ref<Editor | null>(null)

const onReady = (editor: Editor) => {
  editorRef.value = editor
}

// 预加载字体
onMounted(() => {
  const fonts = [
    'https://cdn.tldraw.com/3.7.0/fonts/Shantell_Sans-Tldrawish.woff2',
    'https://cdn.tldraw.com/3.7.0/fonts/IBMPlexSerif-Medium.woff2',
    'https://cdn.tldraw.com/3.7.0/fonts/IBMPlexSans-Medium.woff2',
    'https://cdn.tldraw.com/3.7.0/fonts/IBMPlexMono-Medium.woff2'
  ]

  fonts.forEach((font) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.href = font
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
})

// 添加缺失的中文翻译
const customTranslation = {
  'zh-cn': {
    // 添加缺失的翻译键值对
    'some.missing.key': '对应的中文翻译'
  }
}
</script>
