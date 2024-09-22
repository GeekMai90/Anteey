// src/types/Note.ts

// 定义卡片类型
export type CardType = 'Maincard' | 'Bibcard' | 'Indexcard' | 'Hoplinkcard'

// 定义可以放在白板上的项目类型
export type WhiteboardItemType = 'note' | 'whiteboard' | 'group'

// 卡片笔记
export interface Note {
  id: string
  type: 'note'
  address: string // Zettelkasten 编码地址
  cardType: CardType // 卡片类型
  content: object // 包含标题和正文
  createdAt: Date
  updatedAt: Date
  tags: string[] // 标签列表
  linkedTo: string[]
  linkedFrom: string[]
  cardBoxId?: string
  parentId?: string // 父笔记的ID，支持笔记的层级结构
  isDeleted?: boolean
  isStarred?: boolean
  starredOrder?: number
  rightBarOrder?: number
}

// 卡片盒（文件夹）
export interface CardBox {
  id: string
  type: 'cardbox'
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  noteIds: string[] //包含的笔记 id 列表
  parentId?: string // 父卡片盒的ID，支持嵌套结构
}

// 标签
export interface Tag {
  id: string
  type: 'tag'
  name: string
  color: string
}

// 白板项目（包括笔记、白板和组）
export interface WhiteboardItem {
  id: string
  type: WhiteboardItemType
  position: { x: number; y: number }
  size: { width: number; height: number }
  zIndex: number
  rotation: number
  isMinimized: boolean
  groupId?: string // 如果这个项目属于某个组，这里存储组的 ID
  // 组特定的属性
  name?: string
  items?: string[] // 仅对 type === 'group' 有效
  isCollapsed?: boolean // 仅对 type === 'group' 有效
  style?: {
    backgroundColor?: string
    borderColor?: string
    // 可以添加更多样式属性
  }
}

// 白板
export interface Whiteboard {
  id: string
  type: 'whiteboard'
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  items: WhiteboardItem[] // 包括所有类型的项目，包括组
  parentId?: string // 父白板的ID，如果是顶级白板则为undefined
}

// 连线
export interface Connection {
  id: string
  type: 'connection'
  whiteboardId: string
  sourceId: string // 可以是笔记、白板或组的ID
  targetId: string // 可以是笔记、白板或组的ID
  sourceType: WhiteboardItemType // 源项目的类型
  targetType: WhiteboardItemType // 目标项目的类型
  label?: string
  lineType: 'arrow' | 'line' | 'curve'
  style: {
    color: string
    thickness: number
    dashed: boolean
  }
}

// // 辅助函数

// function generateUniqueId(): string {
//   return Date.now().toString(36) + Math.random().toString(36).substr(2)
// }

// export function createNewNote(partialNote: Partial<Note>): Note {
//   return {
//     id: generateUniqueId(),
//     type: 'note',
//     address: partialNote.address || generateUniqueId(),
//     cardType: partialNote.cardType || 'Maincard',
//     content: partialNote.content || {},
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     tags: partialNote.tags || [],
//     linkedTo: partialNote.linkedTo || [],
//     linkedFrom: partialNote.linkedFrom || [],
//     isDeleted: false,
//     isStarred: partialNote.isStarred || false,
//     ...partialNote
//   }
// }

// export function createNewWhiteboard(
//   name: string,
//   description?: string,
//   parentId?: string
// ): Whiteboard {
//   return {
//     id: generateUniqueId(),
//     type: 'whiteboard',
//     name,
//     description,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     items: [],
//     parentId
//   }
// }

// export function createWhiteboardItem(
//   type: WhiteboardItemType,
//   position: { x: number; y: number },
//   size?: { width: number; height: number },
//   additionalProps?: Partial<WhiteboardItem>
// ): WhiteboardItem {
//   return {
//     id: generateUniqueId(),
//     type,
//     position,
//     size: size || { width: 200, height: 150 },
//     zIndex: 0,
//     rotation: 0,
//     isMinimized: false,
//     ...additionalProps
//   }
// }

// export function createGroup(
//   name: string,
//   position: { x: number; y: number },
//   size?: { width: number; height: number }
// ): WhiteboardItem {
//   return createWhiteboardItem('group', position, size, {
//     name,
//     items: [],
//     isCollapsed: false
//   })
// }

// export function addItemToWhiteboard(whiteboard: Whiteboard, item: WhiteboardItem): Whiteboard {
//   return {
//     ...whiteboard,
//     items: [...whiteboard.items, item],
//     updatedAt: new Date()
//   }
// }

// export function addItemToGroup(
//   whiteboard: Whiteboard,
//   itemId: string,
//   groupId: string
// ): Whiteboard {
//   const updatedItems = whiteboard.items.map((item) => {
//     if (item.id === itemId) {
//       return { ...item, groupId }
//     }
//     if (item.id === groupId && item.type === 'group') {
//       return { ...item, items: [...(item.items || []), itemId] }
//     }
//     return item
//   })

//   return {
//     ...whiteboard,
//     items: updatedItems,
//     updatedAt: new Date()
//   }
// }

// // export function removeItemFromGroup(whiteboard: Whiteboard, itemId: string): Whiteboard {
// //   const updatedItems = whiteboard.items.map((item) => {
// //     if (item.id === itemId) {
// //       const { groupId: _, ...rest } = item
// //       return rest
// //     }
// //     if (item.type === 'group' && item.items?.includes(itemId)) {
// //       return { ...item, items: item.items.filter((id) => id !== itemId) }
// //     }
// //     return item
// //   })

// //   return {
// //     ...whiteboard,
// //     items: updatedItems,
// //     updatedAt: new Date()
// //   }
// // }

// export function createConnection(
//   whiteboardId: string,
//   sourceId: string,
//   targetId: string,
//   sourceType: WhiteboardItemType,
//   targetType: WhiteboardItemType,
//   lineType: 'arrow' | 'line' | 'curve' = 'line'
// ): Connection {
//   return {
//     id: generateUniqueId(),
//     type: 'connection',
//     whiteboardId,
//     sourceId,
//     targetId,
//     sourceType,
//     targetType,
//     lineType,
//     style: {
//       color: '#000000',
//       thickness: 1,
//       dashed: false
//     }
//   }
// }

// export function updateWhiteboardItem(
//   whiteboard: Whiteboard,
//   updatedItem: WhiteboardItem
// ): Whiteboard {
//   const updatedItems = whiteboard.items.map((item) =>
//     item.id === updatedItem.id ? updatedItem : item
//   )

//   return {
//     ...whiteboard,
//     items: updatedItems,
//     updatedAt: new Date()
//   }
// }

// export function deleteWhiteboardItem(whiteboard: Whiteboard, itemId: string): Whiteboard {
//   const updatedItems = whiteboard.items.filter((item) => item.id !== itemId)

//   // 如果删除的是组，还需要更新所有属于该组的项目
//   const deletedGroup = whiteboard.items.find((item) => item.id === itemId && item.type === 'group')
//   if (deletedGroup && deletedGroup.items) {
//     updatedItems.forEach((item) => {
//       if (deletedGroup.items?.includes(item.id)) {
//         delete item.groupId
//       }
//     })
//   }

//   return {
//     ...whiteboard,
//     items: updatedItems,
//     updatedAt: new Date()
//   }
// }
