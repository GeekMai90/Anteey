import { setupNotesHandlers } from './notesIpcHandlers'
import { setupWhiteboardHandlers } from './whiteboardIpcHandlers'
import { setupCardboxHandlers } from './cardboxIpcHandlers'
import { setupUserSettingsHandlers } from './userSettingsIpcHandlers'
import { setupImageHandlers } from './imageIpcHandlers'
import { setupTagHandlers } from './tagIpcHandlers'
import { setupFilterHandlers } from './filterIpcHandlers'
import { setupLocalTreeHandlers } from './localTreeIpcHandlers'
import { setupAppearanceHandlers } from './appearanceIpcHandlers'
import { setupKnowledgeTreeHandlers } from './knowledgeTreeIpcHandlers'
import { setupLicenseHandlers } from './licenseIpcHandlers'
import { setupBackupIpcHandlers } from './backupIpcHandlers'
import { setupTimeBlockHandlers } from './timeBlockIpcHandlers'
import { setupWebDAVHandlers } from './webdavIpcHandlers'
import { setupFlashcardHandlers } from './flashcardIpcHandlers'
export function setupIpcHandlers(): void {
  setupNotesHandlers()
  setupWhiteboardHandlers()
  setupCardboxHandlers()
  setupUserSettingsHandlers()
  setupImageHandlers()
  setupTagHandlers()
  setupFilterHandlers()
  setupLocalTreeHandlers()
  setupAppearanceHandlers()
  setupKnowledgeTreeHandlers()
  setupLicenseHandlers()
  setupBackupIpcHandlers()
  setupTimeBlockHandlers()
  setupWebDAVHandlers()
  setupFlashcardHandlers()
}
