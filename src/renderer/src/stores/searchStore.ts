import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', {
  state: () => ({
    searchQuery: '',
    searchTriggered: false
  }),
  actions: {
    setSearchQuery(query: string) {
      this.searchQuery = query
      this.searchTriggered = true
    },
    resetSearchTrigger() {
      this.searchTriggered = false
    }
  }
})
