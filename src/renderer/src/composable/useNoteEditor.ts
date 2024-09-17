// src/composables/useNoteEditor.ts

import { ref, Ref } from "vue";
import { useNoteStore } from "@/stores/noteStores";
import type { Note } from "@/types/Note";

export function useNoteEditor() {
  const noteStore = useNoteStore();
  const isEditorOpen = ref(false);
  const editedNote: Ref<Note> = ref({
    id: "",
    address: "",
    content: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    links: [],
  });

  const openNoteEditor = (noteId?: string) => {
    if (noteId) {
      const note = noteStore.getNoteById(noteId);
      if (note) {
        editedNote.value = { ...note };
      }
    } else {
      // Reset for new note
      editedNote.value = {
        id: "",
        address: "",
        content: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        links: [],
      };
    }
    isEditorOpen.value = true;
  };

  const closeNoteEditor = () => {
    isEditorOpen.value = false;
  };

  const saveNote = async () => {
    if (editedNote.value.id) {
      await noteStore.updateNote(editedNote.value);
    } else {
      await noteStore.addNote(editedNote.value);
    }
    closeNoteEditor();
  };

  return {
    isEditorOpen,
    editedNote,
    openNoteEditor,
    closeNoteEditor,
    saveNote,
  };
}
