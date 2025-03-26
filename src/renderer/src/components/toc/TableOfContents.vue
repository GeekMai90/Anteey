<template>
  <div class="table-of-contents">
    <template v-if="items.length === 0">
      <TocEmptyState />
    </template>
    <template v-else>
      <TocItem
        v-for="(item, i) in items"
        :key="item.id"
        :item="item"
        :index="i + 1"
        @item-click="onItemClick"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { TextSelection } from '@tiptap/pm/state'
import { Editor } from '@tiptap/vue-3'
import TocEmptyState from './TocEmptyState.vue'
import TocItem from './TocItem.vue'

const props = defineProps<{
  items: any[]
  editor: Editor | null
}>()

const onItemClick = (_event: MouseEvent, id: string) => {
  if (props.editor) {
    const element = props.editor.view.dom.querySelector(`[data-toc-id="${id}"]`)
    if (!element) return

    const pos = props.editor.view.posAtDOM(element, 0)

    // 设置选中
    const tr = props.editor.view.state.tr
    tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
    props.editor.view.dispatch(tr)
    props.editor.view.focus()

    // 滚动到对应位置
    const container = props.editor.view.dom.closest('.editor-wrapper')
    if (container) {
      // 将 element 类型断言为 HTMLElement
      const targetElement = element as HTMLElement
      container.scrollTo({
        top: targetElement.offsetTop - 100, // 上方预留100px空间
        behavior: 'smooth'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.table-of-contents {
  padding: 16px 16px;
}
</style>
