export interface Task {
  noteId: string
  address: string
  text: string
  isChecked: boolean
  path: string[]
  timeBlock?: {
    date: string
    hour: number
  }
}
