import { Link } from '@tiptap/extension-link'

export const CustomLink = Link.extend({
  name: 'link',

  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      linkOnPaste: true,
      validate: (url: string) => /^(https?:\/\/|note:\/\/)/.test(url)
    }
  },

  parseHTML() {
    return [{ tag: 'a[href]:not([href *= "javascript:" i])' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', HTMLAttributes, 0]
  }
})
