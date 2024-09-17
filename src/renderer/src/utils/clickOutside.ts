// src/clickOutside.ts
// import { Directive } from 'vue'

// const clickOutside: Directive = {
//   mounted(el, binding) {
//     el.clickOutsideEvent = (event: Event) => {
//       if (!(el === event.target || el.contains(event.target as Node))) {
//         binding.value(event)
//       }
//     }
//     document.addEventListener('click', el.clickOutsideEvent)
//   },
//   unmounted(el) {
//     document.removeEventListener('click', el.clickOutsideEvent)
//   }
// }

// export default clickOutside
// import { Directive, DirectiveBinding } from 'vue'

// interface ClickOutsideElement extends HTMLElement {
//   clickOutsideEvent?: (event: MouseEvent) => void
// }

// const clickOutside: Directive = {
//   mounted(el: ClickOutsideElement, binding: DirectiveBinding) {
//     el.clickOutsideEvent = (event: MouseEvent) => {
//       // 检查事件是否来自主进程
//       if (event.isTrusted) {
//         if (!(el === event.target || el.contains(event.target as Node))) {
//           binding.value(event)
//         }
//       }
//     }
//     window.addEventListener('click', el.clickOutsideEvent)
//   },
//   unmounted(el: ClickOutsideElement) {
//     if (el.clickOutsideEvent) {
//       window.removeEventListener('click', el.clickOutsideEvent)
//     }
//   }
// }

// export default clickOutside
