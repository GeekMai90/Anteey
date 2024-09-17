import { Extension, Mark } from "@tiptap/core";

const SearchHighlight = Mark.create({
  name: "searchHighlight",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "mark[data-search-highlight]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      { ...this.options.HTMLAttributes, "data-search-highlight": "" },
      0,
    ];
  },

  addCommands() {
    return {
      setSearchHighlight:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      unsetSearchHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default SearchHighlight;
