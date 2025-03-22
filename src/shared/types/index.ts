// 导出所有共享类型
export * from './backup-settings'
export * from './custom-filter'
export * from './flash-card'
export * from './image'
export * from './knowledge-tree'
export * from './license'
export * from './local-tree'
export * from './note'
export * from './note-version'
export * from './settings'
export * from './time-block'
export * from './webdav-config'
export * from './tag'
export * from './drafts'
export * from './theme'
export * from './pomodoro'
export * from './quote'
export * from './lifeGuide'
export * from './review'
export * from './edWhiteboard'
export * from './task'
export * from './auth'
export * from './llm'
export * from './assistant'
export * from './embedding'
export * from './dictionary'
export * from './mindboard'
export * from './s3'
export * from './cloud-sync'
export * from './dinox'
export * from './letter'
export * from './writing-desk'

// 定义图标名称类型
export type IconName =
  // 文档类
  | 'Book'
  | 'Notes'
  | 'FolderOne'
  | 'FolderOpen'
  | 'Bookmark'
  | 'BookOne'
  | 'Notebook'
  | 'Bookshelf'
  | 'FileText'
  | 'FileFocus'

  // 标记类
  | 'Tag'
  | 'TagOne'
  | 'Flag'
  | 'Star'
  | 'Like'
  | 'Heart'

  // 列表和任务
  | 'ListTwo'
  | 'Checklist'

  // 容器类
  | 'Box'
  | 'Inbox'
  | 'Cube'
  | 'FileCabinet'

  // 场所和建筑
  | 'Home'
  | 'Bank'
  | 'School'

  // 工具和操作
  | 'Write'
  | 'Code'
  | 'Bug'
  | 'Link'
  | 'Edit'
  | 'Delete'
  | 'Copy'
  | 'Search'

  // 时间类
  | 'Time'
  | 'Calendar'
  | 'Alarm'
  | 'Schedule'

  // 思考和创意
  | 'Brain'
  | 'Lamp'
  | 'Light'

  // 游戏和娱乐
  | 'GameHandle'
  | 'Play'

  // 其他常用
  | 'Target'
  | 'Plus'
  | 'Minus'
  | 'Close'
  | 'More'
  | 'Setting'
  | 'Config'
  | 'Help'
  | 'Info'
  | 'Refresh'
  | 'Download'
  | 'Upload'
  | 'Share'
  | 'Lock'
  | 'Unlock'
