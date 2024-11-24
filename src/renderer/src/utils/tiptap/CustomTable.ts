import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

// 配置基本表格
export const CustomTable = Table.configure({
  resizable: true,
  handleWidth: 8,
  cellMinWidth: 100,
  lastColumnResizable: true,
  HTMLAttributes: {
    class: 'custom-table'
  }
})

// 配置表格行
export const CustomTableRow = TableRow.configure({
  HTMLAttributes: {
    class: 'table-row'
  }
})

// 配置表格头
export const CustomTableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: 'table-header'
  }
})

// 配置表格单元格
export const CustomTableCell = TableCell.configure({
  HTMLAttributes: {
    class: 'table-cell'
  }
})

export {
  CustomTableRow as TableRow,
  CustomTableHeader as TableHeader,
  CustomTableCell as TableCell
}
