<template>
  <div class="image-manager-view">
    <div class="fixed-header">
      <AppToolbar :showBackButton="true" :showForwardButton="true"></AppToolbar>
      <div class="header-content">
        <div class="topToolBar">
          <div class="header-left">
            <div class="icon">
              <ImageFiles theme="outline" size="20" fill="var(--color-primary)" :strokeWidth="3" />
            </div>
            <div class="name">图片管理</div>
          </div>
          <div class="right-actions">
            <!-- 一键清理按钮 -->
            <button
              v-if="imageStore.orphanedCount > 0"
              class="cleanup-button"
              @click="handleCleanup"
            >
              <div class="icon">
                <Delete theme="outline" size="16" fill="currentColor" :strokeWidth="3" />
              </div>
              <span>一键清理 ({{ imageStore.orphanedCount }})</span>
            </button>

            <!-- 排序按钮 -->
            <div class="sort-button-container" @click.stop="toggleSortMenu">
              <div class="icon">
                <SortTwo
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">
                {{
                  sortOptions.find((opt) => opt.value === imageStore.queryParams.sortBy)?.label ||
                  '排序'
                }}
              </div>
              <div class="icon down-icon">
                <Down
                  theme="outline"
                  size="14"
                  fill="var(--color-text-secondary)"
                  :strokeWidth="3"
                />
              </div>
              <div v-if="showSortMenu" class="dropdown-menu" :class="{ show: showSortMenu }">
                <div
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ active: imageStore.queryParams.sortBy === option.value }"
                  @click.stop="selectSortOption(option)"
                >
                  <div class="dropdown-item-content">
                    <div class="icon">
                      <SortTwo
                        theme="outline"
                        size="18"
                        fill="var(--color-icon-menu-default)"
                        :strokeWidth="3"
                      />
                    </div>
                    <div class="name">{{ option.label }}</div>
                  </div>
                  <div v-if="imageStore.queryParams.sortBy === option.value" class="sort-direction">
                    {{ imageStore.queryParams.sortOrder === 'asc' ? '↑' : '↓' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 状态过滤按钮 -->
            <div class="filter-button-container" @click.stop="toggleFilterMenu">
              <div class="icon">
                <Filter
                  theme="outline"
                  size="18"
                  fill="var(--color-icon-menu-default)"
                  :strokeWidth="3"
                />
              </div>
              <div class="name">
                {{
                  filterOptions.find((opt) => opt.value === imageStore.queryParams.status)?.label ||
                  '筛选'
                }}
              </div>
              <div class="icon down-icon">
                <Down
                  theme="outline"
                  size="14"
                  fill="var(--color-text-secondary)"
                  :strokeWidth="3"
                />
              </div>
              <div v-if="showFilterMenu" class="dropdown-menu" :class="{ show: showFilterMenu }">
                <div
                  v-for="option in filterOptions"
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ active: option.value === imageStore.queryParams.status }"
                  @click.stop="selectFilterOption(option)"
                >
                  <div class="dropdown-item-content">
                    <div class="icon">
                      <Filter
                        theme="outline"
                        size="18"
                        fill="var(--color-icon-menu-default)"
                        :strokeWidth="3"
                      />
                    </div>
                    <div class="name">{{ option.label }}</div>
                  </div>
                  <div v-if="option.value === imageStore.queryParams.status" class="check-icon">
                    ✓
                  </div>
                </div>
              </div>
            </div>

            <!-- 删除按钮 -->
            <button v-if="imageStore.hasSelectedImages" class="delete-button" @click="handleDelete">
              删除选中项 ({{ imageStore.selectedImageIds.length }})
            </button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="label">总图片：</span>
            <span class="value">{{ imageStore.totalImages }}</span>
          </div>
          <div class="stat-item">
            <span class="label">总大小：</span>
            <span class="value">{{ imageStore.formattedTotalSize }}</span>
          </div>
          <div class="stat-item">
            <span class="label">未使用：</span>
            <span class="value">{{ imageStore.orphanedCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="image-manager-container">
      <!-- 加载状态 -->
      <div v-if="imageStore.isLoading" class="loading-state">
        <Loading theme="outline" size="32" fill="var(--color-primary)" :strokeWidth="3" />
        <p>加载中...</p>
      </div>

      <!-- 图片列表 -->
      <div v-else-if="imageStore.images.length > 0" class="image-grid">
        <div
          v-for="image in imageStore.images"
          :key="image.id"
          class="image-card"
          :class="{
            selected: imageStore.selectedImageIds.includes(image.id),
            'is-orphan': image.isOrphan
          }"
        >
          <!-- 选择框 -->
          <div class="select-checkbox" @click.stop="imageStore.toggleImageSelection(image.id)">
            <div
              class="checkbox-inner"
              :class="{ checked: imageStore.selectedImageIds.includes(image.id) }"
            >
              <div v-if="imageStore.selectedImageIds.includes(image.id)" class="check-mark">✓</div>
            </div>
          </div>

          <!-- 图片预览区域 -->
          <div class="image-preview" @click="openImagePreview(image)">
            <img
              :src="getImageUrl(image.filename)"
              :alt="image.filename"
              @error="handleImageError"
            />
            <div v-if="image.isOrphan" class="orphan-badge">未使用</div>
          </div>
          <div class="image-info">
            <div class="filename" :title="image.filename">{{ image.filename }}</div>
            <div class="details">
              <span>{{ formatSize(image.size) }}</span>
              <span>{{ formatDate(image.lastUsed) }}</span>
            </div>
            <div v-if="image.notes && image.notes.length > 0" class="usage-info">
              被引用 {{ image.notes.length }} 次
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-state-content">
          <FolderOpen
            theme="outline"
            size="64"
            fill="var(--color-icon-secondary)"
            :strokeWidth="2"
          />
          <p>没有找到图片</p>
          <span>当前筛选条件下没有图片</span>
        </div>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <ConfirmDialog
      v-model:visible="showConfirmDialog"
      title="删除图片"
      :message="`确定要删除选中的 ${imageStore.selectedImageIds.length} 张图片吗？此操作不能撤销。`"
      type="danger"
      cancel-text="取消"
      confirm-text="删除"
      @cancel="showConfirmDialog = false"
      @confirm="confirmDelete"
    />

    <!-- 图片预览弹窗 -->
    <div v-if="previewImage" class="image-preview-modal" @click="closePreview">
      <div class="preview-content" @click.stop>
        <div class="image-container">
          <img :src="getImageUrl(previewImage.filename)" :alt="previewImage.filename" />
        </div>
        <div class="preview-info">
          <h3>图片信息</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">文件名：</span>
              <span class="value" :title="previewImage.filename">{{ previewImage.filename }}</span>
            </div>
            <div class="info-item">
              <span class="label">大小：</span>
              <span class="value">{{ formatSize(previewImage.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">最后使用：</span>
              <span class="value">{{ formatDate(previewImage.lastUsed) }}</span>
            </div>
            <div class="info-item">
              <span class="label">引用次数：</span>
              <span class="value">{{ previewImage.notes ? previewImage.notes.length : 0 }} 次</span>
            </div>
          </div>
        </div>
        <button class="close-button" @click="closePreview">×</button>
      </div>
    </div>

    <!-- 添加清理确认对话框 -->
    <ConfirmDialog
      v-model:visible="showCleanupDialog"
      title="清理未使用图片"
      :message="`确定要清理 ${imageStore.orphanedCount} 张未使用的图片吗？此操作不能撤销。`"
      type="danger"
      cancel-text="取消"
      confirm-text="清理"
      @cancel="showCleanupDialog = false"
      @confirm="confirmCleanup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useImageStore } from '@renderer/stores/imageStore'
import { ImageWithStatus } from '@shared/types'
import AppToolbar from '@renderer/components/layout/AppToolbar.vue'
import ConfirmDialog from '@renderer/components/common/ConfirmDialog.vue'
import { ImageFiles, SortTwo, Filter, FolderOpen, Loading, Down, Delete } from '@icon-park/vue-next'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { message } from '@renderer/utils/message'

const imageStore = useImageStore()
const showSortMenu = ref(false)
const showFilterMenu = ref(false)
const showConfirmDialog = ref(false)
const showCleanupDialog = ref(false)
const previewImage = ref<ImageWithStatus | null>(null)

// 定义选项类型
interface SortOption {
  value: 'lastUsed' | 'size' | 'filename'
  label: string
}

interface FilterOption {
  value: 'all' | 'orphaned' | 'linked'
  label: string
}

// 修改选项定义
const sortOptions: SortOption[] = [
  { value: 'lastUsed', label: '按最后使用时间' },
  { value: 'size', label: '按文件大小' },
  { value: 'filename', label: '按文件名' }
]

const filterOptions: FilterOption[] = [
  { value: 'all', label: '全部图片' },
  { value: 'orphaned', label: '未使用图片' },
  { value: 'linked', label: '已使用图片' }
]

onMounted(async () => {
  await imageStore.fetchImages()
  document.addEventListener('click', closeMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenus)
})

const closeMenus = () => {
  showSortMenu.value = false
  showFilterMenu.value = false
}

const toggleSortMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showSortMenu.value = !showSortMenu.value
  showFilterMenu.value = false
}

const toggleFilterMenu = (event: MouseEvent) => {
  event.stopPropagation()
  showFilterMenu.value = !showFilterMenu.value
  showSortMenu.value = false
}

const selectSortOption = async (option: SortOption) => {
  const currentSortBy = imageStore.queryParams.sortBy
  const currentSortOrder = imageStore.queryParams.sortOrder

  await imageStore.updateQueryParams({
    sortBy: option.value,
    sortOrder:
      currentSortBy === option.value ? (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
  })
  showSortMenu.value = false
}

const selectFilterOption = async (option: FilterOption) => {
  await imageStore.updateQueryParams({ status: option.value })
  showFilterMenu.value = false
}

const handleDelete = () => {
  showConfirmDialog.value = true
}

const confirmDelete = async () => {
  try {
    const deletedCount = await imageStore.deleteSelectedImages()
    message.success(`成功删除 ${deletedCount} 张图片`)
    showConfirmDialog.value = false
  } catch (error) {
    console.error('删除图片失败:', error)
    message.error('删除图片失败')
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return '从未使用'
  return format(timestamp, 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

const getImageUrl = (filename: string) => {
  try {
    return `app-image:///images/${encodeURIComponent(filename)}`
  } catch (error) {
    console.error('生成图片 URL 失败:', error)
    return ''
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('图片加载失败:', img.src)
  // 可以设置一个默认的错误图片
  // img.src = 'path/to/error-image.png'
}

const openImagePreview = (image: ImageWithStatus) => {
  previewImage.value = image
}

const closePreview = () => {
  previewImage.value = null
}

const handleCleanup = () => {
  showCleanupDialog.value = true
}

const confirmCleanup = async () => {
  try {
    const cleanedCount = await imageStore.cleanOrphanedImages()
    message.success(`成功清理 ${cleanedCount} 张未使用的图片`)
    showCleanupDialog.value = false
  } catch (error) {
    console.error('清理未使用图片失败:', error)
    message.error('清理未使用图片失败')
  }
}
</script>

<style lang="scss" scoped>
.image-manager-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--body-bg);
  overflow: hidden;
  position: relative;

  :deep(.i-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :deep(svg) {
    width: 16px;
    height: 16px;
  }

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background-color: var(--body-bg);

    .header-content {
      padding: 0px 20px;

      .topToolBar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--color-border);

        .header-left {
          display: flex;
          align-items: center;

          .icon {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background-color: var(--color-menu-bg);
            border: 1px solid var(--color-primary);

            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 20px;
              height: 20px;
            }
          }

          .name {
            font-size: 20px;
            font-weight: 600;
            margin-left: 8px;
            color: var(--default-text-color);
          }
        }

        .right-actions {
          display: flex;
          gap: 10px;
          align-items: center;

          .cleanup-button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            background-color: var(--color-text-danger);
            color: white;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
            height: 35px;

            .icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
            }

            &:hover {
              filter: brightness(90%);
            }
          }

          .sort-button-container,
          .filter-button-container {
            display: flex;
            align-items: center;
            padding: 5px 8px;
            border: none;
            background: none;
            cursor: pointer;
            border-radius: 8px;
            border: 1px solid var(--color-border);
            user-select: none;
            position: relative;
            height: 35px;

            .icon {
              background: none;
              border: none;
              cursor: pointer;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              padding: 0;

              &.down-icon {
                width: 20px;
                height: 20px;
                opacity: 0.6;
              }
            }

            .name {
              flex-grow: 0;
              text-align: left;
              color: var(--default-text-color);
              font-size: 14px;
              font-weight: 400;
              margin: 0 4px;
              white-space: nowrap;
              writing-mode: horizontal-tb;
              line-height: 1;
            }

            &:hover {
              background-color: var(--color-hover-bg);
            }

            .dropdown-menu {
              position: absolute;
              top: calc(100% + 8px);
              right: 0;
              background-color: var(--color-bg-primary);
              border-radius: 8px;
              box-shadow: var(--shadow-primary);
              z-index: 1000;
              padding: 8px;
              opacity: 0;
              visibility: hidden;
              transition: all 0.2s ease;
              min-width: 180px;

              &.show {
                opacity: 1;
                visibility: visible;
              }

              .dropdown-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-radius: 6px;
                cursor: pointer;
                margin: 2px 0;
                padding: 8px;

                &:hover {
                  background-color: var(--color-hover-bg);
                }

                &.active {
                  background-color: var(--color-hover-bg);
                }

                .dropdown-item-content {
                  display: flex;
                  align-items: center;
                  flex-grow: 1;
                  gap: 6px;

                  .icon {
                    width: 20px;
                    height: 20px;
                    flex: none;
                  }

                  .name {
                    flex-grow: 1;
                    text-align: left;
                    color: var(--default-text-color);
                    font-size: 13px;
                    font-weight: 400;
                    white-space: nowrap;
                    writing-mode: horizontal-tb;
                    line-height: 1;
                  }
                }

                .sort-direction,
                .check-icon {
                  flex: none;
                  padding-left: 8px;
                  color: var(--color-primary);
                  font-size: 14px;
                }
              }
            }
          }

          .sort-button-container {
            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 18px;
              height: 18px;
            }
          }

          .filter-button-container {
            :deep(.i-icon) {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }

            :deep(svg) {
              width: 18px;
              height: 18px;
            }
          }

          .delete-button {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            background-color: var(--color-text-danger);
            color: white;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
            height: 35px;

            &:hover {
              filter: brightness(90%);
            }
          }
        }
      }

      .stats-bar {
        display: flex;
        gap: 20px;
        padding: 8px 0;
        font-size: 13px;
        color: var(--color-text-secondary);
        align-items: center;

        .stat-item {
          .label {
            color: var(--color-text-tertiary);
          }
          .value {
            font-weight: 500;
          }
        }
      }
    }
  }

  .image-manager-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;

    .image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;

      .image-card {
        background: var(--color-bg-secondary);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        &.selected {
          border-color: var(--color-primary);
        }

        .image-preview {
          position: relative;
          width: 100%;
          height: 150px;
          background: var(--color-bg-tertiary);

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .orphan-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--color-text-danger);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
          }
        }

        .image-info {
          padding: 8px;

          .filename {
            font-size: 13px;
            color: var(--color-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .details {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--color-text-tertiary);
            margin-top: 4px;
          }

          .usage-info {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin-top: 4px;
          }
        }
      }
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-tertiary);
      text-align: center;

      .empty-state-content {
        margin-top: -20vh;

        p {
          font-size: 20px;
          font-weight: 500;
          margin: 16px 0 8px;
        }

        span {
          font-size: 14px;
          opacity: 0.7;
        }

        :deep(.i-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        :deep(svg) {
          width: 64px;
          height: 64px;
        }
      }
    }
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-tertiary);

    p {
      margin-top: 16px;
      font-size: 14px;
    }

    :deep(.i-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :deep(svg) {
      width: 32px;
      height: 32px;
    }
  }

  .image-card {
    &.is-orphan {
      border: 2px dashed var(--color-text-danger);

      &:hover {
        border-style: solid;
      }

      &.selected {
        border-style: solid;
      }
    }
  }

  .image-card {
    position: relative;

    .select-checkbox {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 2;
      width: 20px;
      height: 20px;
      cursor: pointer;

      .checkbox-inner {
        width: 100%;
        height: 100%;
        border: 2px solid white;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;

        &.checked {
          background: var(--color-primary);
          border-color: var(--color-primary);
        }

        .check-mark {
          color: white;
          font-size: 12px;
        }
      }
    }

    .image-preview {
      cursor: zoom-in;
    }
  }

  .image-preview-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 40px;

    .preview-content {
      position: relative;
      width: 90vw;
      height: 90vh;
      background: var(--color-bg-primary);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

      .image-container {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-secondary);
        overflow: auto;

        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
      }

      .preview-info {
        flex: none;
        padding: 16px 20px;
        background: var(--color-bg-primary);
        border-top: 1px solid var(--color-border);

        h3 {
          margin: 0 0 12px;
          font-size: 16px;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: 8px;

          &::before {
            content: '';
            display: block;
            width: 4px;
            height: 16px;
            background: var(--color-primary);
            border-radius: 2px;
          }
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          padding: 12px;
          background: var(--color-bg-secondary);
          border-radius: 8px;
          border: 1px solid var(--color-border);

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;

            .label {
              flex: none;
              color: var(--color-text-tertiary);
              font-size: 13px;
            }

            .value {
              flex: 1;
              color: var(--color-text-primary);
              font-weight: 500;
              font-size: 13px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }

      .close-button {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(4px);

        &:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.05);
        }
      }
    }
  }
}
</style>
