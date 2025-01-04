import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: 'light'
  }),
  actions: {
    toggleTheme() {
      this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', this.currentTheme)
    },
    initTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.currentTheme = savedTheme
      }
    }
  }
})
