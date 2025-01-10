import { setupNotesHandlers } from './notesIpcHandlers'
import { setupWhiteboardHandlers } from './whiteboardIpcHandlers'
import { setupCardboxHandlers } from './cardboxIpcHandlers'
import { setupUserSettingsHandlers } from './userSettingsIpcHandlers'
import { setupImageHandlers } from './imageIpcHandlers'
import { setupTagHandlers } from './tagIpcHandlers'
import { setupFilterHandlers } from './filterIpcHandlers'
import { setupLocalTreeHandlers } from './localTreeIpcHandlers'
import { setupKnowledgeTreeHandlers } from './knowledgeTreeIpcHandlers'
import { setupLicenseHandlers } from './licenseIpcHandlers'
import { setupBackupIpcHandlers } from './backupIpcHandlers'
import { setupTimeBlockHandlers } from './timeBlockIpcHandlers'
import { setupWebDAVHandlers } from './webdavIpcHandlers'
import { setupFlashcardHandlers } from './flashcardIpcHandlers'
import { setupNoteVersionHandlers } from './noteVersionIpcHandlers'
import { setupAnalyticsHandlers } from './analyticsIpcHandlers'
import { setupDraftHandlers } from './draftsIpcHandlers'
import { setupThemeHandlers } from './themeIpcHandlers'
export function setupIpcHandlers(): void {
  setupNotesHandlers()
  setupWhiteboardHandlers()
  setupCardboxHandlers()
  setupImageHandlers()
  setupTagHandlers()
  setupFilterHandlers()
  setupLocalTreeHandlers()
  setupKnowledgeTreeHandlers()
  setupLicenseHandlers()
  setupBackupIpcHandlers()
  setupTimeBlockHandlers()
  setupWebDAVHandlers()
  setupFlashcardHandlers()
  setupNoteVersionHandlers()
  setupAnalyticsHandlers()
  setupUserSettingsHandlers()
  setupDraftHandlers()
  setupThemeHandlers()
}
