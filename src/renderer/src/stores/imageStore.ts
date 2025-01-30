import { defineStore } from 'pinia'
import { ref } from 'vue'
import { message } from '../utils/message'

export const useImageStore = defineStore('image', () => {
  // ==================== 状态 ====================
  const isLoading = ref(false)

  // ==================== 操作方法 ====================
  // 删除图片
  const deleteImage = async (imagePath: string) => {
    try {
      isLoading.value = true
      await window.electronAPI.image.deleteImage(imagePath)
      message.success('删除图片成功')
    } catch (error) {
      console.error('删除图片失败:', error)
      message.error('删除图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 复制图片到剪贴板
  const copyImage = async (imagePath: string) => {
    try {
      isLoading.value = true
      const result = await window.electronAPI.image.copyImage(imagePath)
      if (result.success) {
        message.success(result.message)
      }
    } catch (error) {
      console.error('复制图片失败:', error)
      message.error('复制图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 下载图片
  const downloadImage = async (url: string, filename: string) => {
    try {
      isLoading.value = true
      const result = await window.electronAPI.image.downloadImage(url, filename)
      message.success('下载图片成功')
      return result.path
    } catch (error) {
      console.error('下载图片失败:', error)
      message.error('下载图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 上传图片
  const uploadImage = async (filePath: string): Promise<string> => {
    try {
      isLoading.value = true
      return await window.electronAPI.image.uploadImage(filePath)
    } catch (error) {
      console.error('上传图片失败:', error)
      message.error('上传图片失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // 上传图片数据（如剪贴板图片）
  const uploadImageData = async (imageData: ArrayBuffer): Promise<string> => {
    try {
      isLoading.value = true
      return await window.electronAPI.image.uploadImageData(imageData)
    } catch (error) {
      console.error('上传图片数据失败:', error)
      message.error('上传图片数据失败')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    // 状态
    isLoading,

    // 方法
    deleteImage,
    copyImage,
    downloadImage,
    uploadImage,
    uploadImageData
  }
})
