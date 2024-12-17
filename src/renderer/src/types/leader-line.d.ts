declare module 'leader-line-new' {
  export type PlugType = 'disc' | 'square' | 'arrow1' | 'arrow2' | 'arrow3' | 'dot' | 'behind'
  export type SocketType = 'top' | 'right' | 'bottom' | 'left' | 'auto'
  export type PathType = 'straight' | 'arc' | 'fluid' | 'magnet' | 'grid'

  export interface DashOptions {
    len: number
    gap: number
  }

  export interface LeaderLineOptions {
    color?: string
    size?: number
    path?: PathType
    startPlug?: PlugType
    endPlug?: PlugType
    startSocket?: SocketType
    endSocket?: SocketType
    dash?: boolean | DashOptions
    startPlugSize?: number
    endPlugSize?: number
    startPlugColor?: string
    endPlugColor?: string
    outline?: boolean
    outlineColor?: string
    outlineSize?: number
  }

  export default class LeaderLine {
    constructor(start: Element, end: Element, options?: LeaderLineOptions)
    remove(): void
    position(): void
    setMiddleLabel(element: HTMLElement): void
  }
}
