import { ref } from 'vue'
import { useMindboardStore } from '@renderer/stores/mindboardStore'
import { useNoteStore } from '@renderer/stores/noteStore'
import { message } from '@renderer/utils/message'

// 思维板选择模态窗口状态
const showMindboardSelector = ref(false)
const selectedNoteIds = ref<string[]>([])

/**
 * 打开思维板选择模态窗口
 * @param noteIds 要添加到思维板的笔记ID或ID数组
 */
export function openMindboardSelector(noteIds: string | string[]) {
  // 转换为数组
  const noteIdArray = Array.isArray(noteIds) ? noteIds : [noteIds]

  // 检查是否有笔记需要添加
  if (noteIdArray.length === 0) {
    message.warning('请先选择要添加的卡片')
    return
  }

  // 设置选中的笔记ID并显示选择器
  selectedNoteIds.value = noteIdArray
  showMindboardSelector.value = true
}

/**
 * 关闭思维板选择模态窗口
 */
export function closeMindboardSelector() {
  showMindboardSelector.value = false
  selectedNoteIds.value = []
}

/**
 * 添加选中的笔记到指定思维板
 * @param mindboardId 思维板ID
 */
export async function addNotesToSelectedMindboard(mindboardId: string) {
  if (selectedNoteIds.value.length === 0) {
    message.warning('没有选择要添加的卡片')
    return
  }

  const mindboardStore = useMindboardStore()
  const noteStore = useNoteStore()

  try {
    await mindboardStore.addNotesToMindboard(mindboardId, selectedNoteIds.value)
    message.success(`已成功添加${selectedNoteIds.value.length}个卡片到思维板`)
    closeMindboardSelector()
    // 如果处于多选模式，退出多选
    if (noteStore.isMultiSelectMode) {
      noteStore.toggleMultiSelectMode()
    }
  } catch (error) {
    console.error('添加到思维板失败:', error)
    message.error('添加到思维板失败')
  }
}

/**
 * 创建新思维板并添加选中的笔记
 */
export async function createMindboardAndAddNotes() {
  if (selectedNoteIds.value.length === 0) {
    message.warning('没有选择要添加的卡片')
    return
  }

  const mindboardStore = useMindboardStore()

  try {
    // 创建新思维板
    const newMindboard = await mindboardStore.createMindboard({
      name: '未命名思维板',
      description: '',
      flow_data: {},
      is_favorite: false
    })

    // 添加笔记到新思维板
    await mindboardStore.addNotesToMindboard(newMindboard.id, selectedNoteIds.value)
    message.success(`已成功添加${selectedNoteIds.value.length}个卡片到新思维板`)
    closeMindboardSelector()
  } catch (error) {
    console.error('创建思维板并添加卡片失败:', error)
    message.error('创建思维板并添加卡片失败')
  }
}

export { showMindboardSelector, selectedNoteIds }
