import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ImageQueryParams, ImageWithStatus } from '../types/Image'
import { message } from '../utils/message'

export const useImageStore = defineStore('image', () => {
  // ==================== 状态 ====================
  const images = ref<ImageWithStatus[]>([])
  const totalImages = ref(0)
  const totalSize = ref(0)
  const orphanedCount = ref(0)
  const selectedImageIds = ref<string[]>([])
  const isLoading = ref(false)

  // 查询参数
  const queryParams = ref<ImageQueryParams>({
    status: 'all',
    sortBy: 'lastUsed',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  })

  // ==================== 计算属性 ====================
  const hasSelectedImages = computed(() => selectedImageIds.value.length > 0)
  const formattedTotalSize = computed(() => {
    if (totalSize.value < 1024) return `${totalSize.value} B`
    if (totalSize.value < 1024 * 1024) return `${(totalSize.value / 1024).toFixed(1)} KB`
    return `${(totalSize.value / (1024 * 1024)).toFixed(1)} MB`
  })

  // ==================== 操作方法 ====================
  // 获取图片列表
  const fetchImages = async () => {
    try {
      isLoading.value = true
      // 将响应式对象转换为普通对象
      const params = {
        status: queryParams.value.status,
        sortBy: queryParams.value.sortBy,
        sortOrder: queryParams.value.sortOrder,
        page: queryParams.value.page,
        pageSize: queryParams.value.pageSize
      }
      console.log('imageStore → 开始获取图片列表，参数:', params)
      const result = await window.electronAPI.getImages(params)
      console.log('imageStore → 获取到原始数据:', result)

      images.value = result.images.map((img) => {
        console.log('imageStore → 处理单个图片数据:', img)
        const processed = {
          ...img,
          createdAt: Number(img.createdAt),
          lastUsed: Number(img.lastUsed)
        }
        console.log('imageStore → 处理后的图片数据:', processed)
        return processed
      })

      console.log('imageStore → 处理后的完整图片列表:', images.value)
      totalImages.value = result.total
      totalSize.value = result.totalSize
      orphanedCount.value = result.orphanedCount
    } catch (error) {
      console.error('imageStore → 获取图片列表失败:', error)
      message.error('获取图片列表失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 更新查询参数并重新获取数据
  const updateQueryParams = async (params: Partial<ImageQueryParams>) => {
    queryParams.value = { ...queryParams.value, ...params }
    await fetchImages()
  }

  // 删除选中的图片
  const deleteSelectedImages = async () => {
    if (selectedImageIds.value.length === 0) return

    try {
      isLoading.value = true
      // 将响应式数组转换为普通数组
      const imageIdsToDelete = [...selectedImageIds.value]
      console.log('imageStore → 准备删除的图片ID:', imageIdsToDelete)
      const result = await window.electronAPI.deleteImages(imageIdsToDelete)
      console.log('imageStore → 删除结果:', result)
      selectedImageIds.value = [] // 清空选择
      await fetchImages() // 重新加载列表

      // 确保返回的是有效数字
      const deletedCount =
        typeof result.deletedCount === 'number'
          ? result.deletedCount
          : typeof result.deletedCount === 'string'
            ? parseInt(result.deletedCount)
            : 0
      console.log('imageStore → 处理后的删除数量:', deletedCount)

      return deletedCount
    } catch (error) {
      console.error('删除图片失败:', error)
      message.error('删除图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 选择图片
  const toggleImageSelection = (imageId: string) => {
    const index = selectedImageIds.value.indexOf(imageId)
    if (index === -1) {
      selectedImageIds.value.push(imageId)
    } else {
      selectedImageIds.value.splice(index, 1)
    }
  }

  // 清空选择
  const clearSelection = () => {
    selectedImageIds.value = []
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedImageIds.value.length === images.value.length) {
      selectedImageIds.value = []
    } else {
      selectedImageIds.value = images.value.map((img) => img.id)
    }
  }

  // 清理未使用的图片
  const cleanOrphanedImages = async () => {
    try {
      isLoading.value = true
      const result = await window.electronAPI.cleanupUnusedImages()
      console.log('imageStore → 清理结果:', result)
      await fetchImages() // 重新加载列表

      // 确保返回的是有效数字
      const cleanedCount =
        typeof result.count === 'number'
          ? result.count
          : typeof result.count === 'string'
            ? parseInt(result.count)
            : 0
      console.log('imageStore → 处理后的清理数量:', cleanedCount)

      return cleanedCount
    } catch (error) {
      console.error('清理未使用图片失败:', error)
      message.error('清理未使用图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 状态
    images,
    totalImages,
    totalSize,
    orphanedCount,
    selectedImageIds,
    isLoading,
    queryParams,

    // 计算属性
    hasSelectedImages,
    formattedTotalSize,

    // 方法
    fetchImages,
    updateQueryParams,
    deleteSelectedImages,
    toggleImageSelection,
    clearSelection,
    toggleSelectAll,
    cleanOrphanedImages
  }
})
