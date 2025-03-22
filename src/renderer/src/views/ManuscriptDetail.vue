<script setup lang="ts">
// ... 其他导入保持不变

// 添加导入
import { Edit, Magic, AddFour, PlusCircle } from '@icon-park/vue-next'

// 确保正确接收 props
const props = defineProps<{
  id: string // 改为 id，与路由参数匹配
}>()

const writingDeskStore = useWritingDeskStore()
const manuscript = computed(() => writingDeskStore.currentManuscript)
const localCards = ref(manuscript.value?.cards || [])

// 加载文稿数据
onMounted(async () => {
  if (!props.id) {
    console.error('ManuscriptDetail - 无效的文稿ID')
    return
  }

  console.log('ManuscriptDetail - 开始加载文稿，ID:', props.id)
  await writingDeskStore.loadManuscript(props.id)
  localCards.value = manuscript.value?.cards || []
})

// 标题编辑方法
const finishEditing = async () => {
  if (!editingTitle.value.trim() || !manuscript.value) {
    cancelEditing()
    return
  }

  try {
    const result = await writingDeskStore.updateManuscript({
      id: manuscript.value.id,
      title: editingTitle.value.trim()
    })
    if (result) {
      isEditing.value = false
    }
  } catch (error) {
    console.error('ManuscriptDetail - 更新标题失败:', error)
    cancelEditing()
  }
}

// AI 润色方法
const handlePolish = async () => {
  if (!manuscript.value || isPolishing.value) return

  try {
    isPolishing.value = true
    const result = await writingDeskStore.polishManuscript({
      id: manuscript.value.id
    })
    if (result) {
      currentMode.value = 'polish'
    }
  } catch (error) {
    console.error('ManuscriptDetail - 润色失败:', error)
  } finally {
    isPolishing.value = false
  }
}

// 卡片相关方法
const handleCardContentUpdate = async (cardId: string, content: any) => {
  if (!manuscript.value) return

  try {
    const result = await writingDeskStore.updateManuscriptCard({
      manuscriptId: manuscript.value.id,
      cardId,
      content
    })
    if (!result) {
      console.error('ManuscriptDetail - 更新卡片内容失败')
    }
  } catch (error) {
    console.error('ManuscriptDetail - 更新卡片内容失败:', error)
  }
}

const handleCardDelete = async (cardId: string) => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.deleteManuscriptCard({
      manuscriptId: manuscript.value.id,
      cardId
    })
    localCards.value = localCards.value.filter((card) => card.id !== cardId)
  } catch (error) {
    console.error('ManuscriptDetail - 删除卡片失败:', error)
  }
}

const handleDragEnd = async () => {
  if (!manuscript.value) return

  try {
    await writingDeskStore.updateManuscriptCardsOrder({
      manuscriptId: manuscript.value.id,
      cards: localCards.value
    })
  } catch (error) {
    console.error('ManuscriptDetail - 更新卡片顺序失败:', error)
  }
}

// 创建段落卡片
const createParagraphCard = async () => {
  if (!manuscript.value) return

  try {
    console.log('ManuscriptDetail - 开始创建段落卡片')
    // 计算新卡片的顺序
    const order = localCards.value.length

    // 创建新的段落卡片
    const result = await writingDeskStore.addCard(
      manuscript.value.id,
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      },
      order
    )

    if (!result) {
      console.error('ManuscriptDetail - 创建段落卡片失败')
      return
    }

    // 重新加载文稿数据
    await writingDeskStore.loadManuscript(manuscript.value.id)
    console.log('ManuscriptDetail - 创建段落卡片成功')
  } catch (error) {
    console.error('ManuscriptDetail - 创建段落卡片失败:', error)
  }
}

// 添加错误处理的计算属性
const manuscript = computed(() => {
  const current = writingDeskStore.currentManuscript
  if (!current) {
    console.warn('ManuscriptDetail - 当前文稿为空')
  }
  return current
})
</script>
