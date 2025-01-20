import { defineStore } from 'pinia'

export const useReviewModeStore = defineStore('reviewMode', {
  state: () => ({
    isReviewMode: false
  }),
  actions: {
    toggleReviewMode() {
      this.isReviewMode = !this.isReviewMode
    },
    setReviewMode(value: boolean) {
      this.isReviewMode = value
    }
  }
})
