<template>
  <div class="share-card" :style="{ background: background }">
    <div class="share-content">
      <div class="note-header">
        <div class="note-date">{{ currentDate }}</div>
      </div>
      <div class="note-content">
        <ShareTipTapRender :content="note.content" :editable="false" />
      </div>
      <div class="note-footer">
        <div class="footer-left">
          <div class="footer-author">{{ authorName }}</div>
          <div class="footer-motto">{{ authorMotto }}</div>
        </div>
        <div v-if="customQrcodeUrl" class="footer-qrcode">
          <img :src="qrCodeUrl" alt="专栏二维码" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import ShareTipTapRender from '@renderer/components/share/ShareTipTapRender.vue'
import { Note } from '@shared/types'
import { computed, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { useUserSettingsStore } from '@renderer/stores/userSettingsStore'

defineProps<{
  note: Note
  background?: string // 添加背景样式属性
}>()

const userSettingsStore = useUserSettingsStore()
// 获取当前日期
const currentDate = format(new Date(), 'yyyy年MM月dd日')
const qrCodeUrl = ref('')

// 从 store 中获取用户设置
const authorName = computed(() => userSettingsStore.settings?.authorName || 'Antinet')
const authorMotto = computed(() => userSettingsStore.settings?.authorMotto || '一起践行终身成长')
const customQrcodeUrl = computed(() => userSettingsStore.settings?.qrcodeUrl || '')
// 单独封装二维码更新逻辑
const updateQRCode = async () => {
  try {
    const customUrl = userSettingsStore.settings?.qrcodeUrl

    if (customUrl && customUrl.trim() !== '') {
      // 如果是 URL，则生成二维码
      if (customUrl.match(/^https?:\/\//)) {
        qrCodeUrl.value = await QRCode.toDataURL(customUrl, {
          width: 64,
          margin: 1,
          color: {
            dark: '#333333',
            light: '#FFFFFF'
          }
        })
      } else if (customUrl.startsWith('data:image')) {
        // 如果已经是 base64 图片，直接使用
        qrCodeUrl.value = customUrl
      } else {
        console.error('无效的二维码 URL 格式')
        qrCodeUrl.value = ''
      }
    } else {
      qrCodeUrl.value = ''
    }
  } catch (err) {
    console.error('二维码处理错误:', err)
    qrCodeUrl.value = ''
  }
}

onMounted(async () => {
  if (!userSettingsStore.settings) {
    await userSettingsStore.fetchSettings()
  }
  await updateQRCode()
})
</script>

<style lang="scss" scoped>
.share-card {
  width: 375px;
  // height: 600px;
  padding: 16px;
  position: relative;
}

.share-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.note-header {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 24px;
}

.note-date {
  font-size: 12px;
  color: #949494;
}

.note-content {
  flex: 1;
  overflow-y: auto;
  margin: 0 0 24px 0;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e7e5e4;
    border-radius: 2px;
  }

  :deep(.tiptap) {
    margin: 0;
    padding: 0;
    font-size: 14px;
    line-height: 1.6;

    h1 {
      font-size: 18px;
    }
    h2 {
      font-size: 16px;
    }
    h3 {
      font-size: 14px;
    }

    p {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 8px;
    }
  }
}

.note-footer {
  padding-top: 16px;
  border-top: 1px solid #e7e5e4;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-author {
  font-size: 16px;
  color: #252525;
  font-weight: 500;
}

.footer-motto {
  font-size: 14px;
  color: #949494;
}

.footer-qrcode {
  width: 46px;
  height: 46px;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 4px;
  }
}
</style>
