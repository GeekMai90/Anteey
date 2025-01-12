<template>
  <div style="width: 100%; height: 100%">
    <ExcalidrawComponent :ref="onReady" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { applyPureReactInVue } from 'veaury'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

const ExcalidrawComponent = applyPureReactInVue(Excalidraw)
const excalidrawAPI = ref<ExcalidrawImperativeAPI | null>(null)

const onReady = (api: ExcalidrawImperativeAPI) => {
  excalidrawAPI.value = api
}
</script>
