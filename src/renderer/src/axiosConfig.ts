// src/axiosConfig.ts

import { NotesAPI } from '../../preload'

// 声明全局 window 对象包含 notesAPI
declare global {
  interface Window {
    notesAPI: NotesAPI
  }
}

const api: NotesAPI = window.notesAPI

// 创建一个类似 axios 的接口
const electronAPI = {
  get: (url: string) => {
    switch (url) {
      case '/notes':
        return api.getNotes(false)
      case '/notes/starred':
        return api.getStarredNotes()
      case '/notes/deleted':
        return api.getDeletedNotes()
      default:
        throw new Error(`未知的 GET 请求: ${url}`)
    }
  },
  post: (url: string, data: any) => {
    switch (url) {
      case '/notes':
        return api.createNote(data)
      case '/notes/link':
        return api.addLink(data.sourceNoteId, data.targetNoteId)
      default:
        throw new Error(`未知的 POST 请求: ${url}`)
    }
  },
  put: (url: string, data: any) => {
    const id = url.split('/').pop()
    if (url.startsWith('/notes/') && id) {
      return api.updateNote(id, data)
    }
    throw new Error(`未知的 PUT 请求: ${url}`)
  },
  delete: (url: string) => {
    const id = url.split('/').pop()
    if (url.startsWith('/notes/') && id) {
      return api.removeNote(id)
    }
    throw new Error(`未知的 DELETE 请求: ${url}`)
  }
}

export default electronAPI
