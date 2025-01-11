declare module '@pqina/flip' {
  export interface TickOptions {
    value?: string
    didInit?: () => void
    didDestroy?: () => void
    credits?: boolean
  }

  export interface TickInstance {
    value: string
    destroy: () => void
  }

  interface Tick {
    DOM: {
      create: (element: HTMLElement, options?: TickOptions) => TickInstance
    }
  }

  const Tick: Tick
  export default Tick
}
