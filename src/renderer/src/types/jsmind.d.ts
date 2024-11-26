declare module 'jsmind' {
  export class jsMind {
    constructor(options: JsMindOptions)
    show(data: JsMindData): void
    view: {
      zoom_in(): void
      zoom_out(): void
      reset(): void
    }
    add_event_listener(callback: (type: string, data: any) => void): void
  }

  const defaultExport: typeof jsMind
  export default defaultExport

  export interface JsMindOptions {
    container: HTMLElement
    theme?: string
    editable?: boolean
    mode?: 'full' | 'side'
    view?: {
      engine?: 'canvas' | 'svg'
      hmargin?: number
      vmargin?: number
      line_width?: number
      line_color?: string
    }
    layout?: {
      hspace?: number
      vspace?: number
      pspace?: number
    }
    shortcut?: {
      enable?: boolean
      handles?: Record<string, string>
    }
  }

  export interface JsMindData {
    meta: {
      name: string
      version: string
    }
    format: string
    data: JsMindNode
  }

  export interface JsMindNode {
    id: string
    topic: string
    children?: JsMindNode[]
    expanded?: boolean
    direction?: string
    data?: Record<string, any>
  }
}
