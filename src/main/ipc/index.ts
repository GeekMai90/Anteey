import { setupNotesHandlers } from './notesIpcHandlers'
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
import { setupWindowHandlers } from './windowIpcHandlers'
import { setupPomodoroHandlers } from './pomodoroIpcHandlers'
import { setupDailyQuotesHandlers } from './dailyquotesIpcHandlers'
import { setupLifeGuideHandlers } from './lifeGuideIpcHandlers'
import { setupReviewHandlers } from './reviewIpcHandlers'
import { setupTaskHandlers } from './taskIpcHandlers'
import { setupAuthHandlers } from './authIpcHandlers'
import { setupLLMConfigHandlers } from './llmConfigIpcHandlers'
// import { setupRAGHandlers } from './ragIpcHandlers'
import { setupSimilarNotesHandlers } from './similarNotesIpcHandlers'
import { setupDictionaryHandlers } from './dictionaryIpcHandlers'
import { setupMindboardHandlers } from './mindboardIpcHandlers'
import { setupS3Handlers } from './s3IpcHandlers'
import { setupCloudSyncHandlers } from './cloudSyncIpcHandlers'
import { setupLetterHandlers } from './letterIpcHandlers'
import { setupExportHandlers } from './exportIpcHandlers'
import { setupWritingDeskHandlers } from './writingDeskIpcHandlers'
import { setupWritingPromptTemplateHandlers } from './writingPromptTemplateIpcHandlers'
import { setupAgentHandlers } from './agentIpcHandlers'
import { setupAIChatHandlers } from './aiChatIpcHandlers'
import { setupMindEchoHandlers } from './mindEchoIpcHandlers'
import { setupReadwiseSyncHandlers } from './readwiseIpcHandlers'
export function setupIpcHandlers(): void {
  setupNotesHandlers()
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
  setupWindowHandlers()
  setupPomodoroHandlers()
  setupDailyQuotesHandlers()
  setupLifeGuideHandlers()
  setupReviewHandlers()
  setupTaskHandlers()
  setupAuthHandlers()
  setupLLMConfigHandlers()
  // setupRAGHandlers()
  setupSimilarNotesHandlers()
  setupDictionaryHandlers()
  setupMindboardHandlers()
  setupS3Handlers()
  setupCloudSyncHandlers()
  setupLetterHandlers()
  setupExportHandlers()
  setupWritingDeskHandlers()
  setupWritingPromptTemplateHandlers()
  setupAgentHandlers()
  setupAIChatHandlers()
  setupMindEchoHandlers()
  setupReadwiseSyncHandlers()
}
