// src/utils/noteUtils.ts

import { v4 as uuidv4 } from "uuid";
import { Note, NewNote } from "@/types/Note";

export function createNewNote(noteData: NewNote): Note {
  const now = new Date();
  return {
    ...noteData,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
}
