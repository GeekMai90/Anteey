import { setupNotesHandlers } from './notesIpcHandlers'
import { setupWhiteboardHandlers } from './whiteboardIpcHandlers'
import { setupCardboxHandlers } from './cardboxIpcHandlers'
import { setupUserSettingsHandlers } from './userSettingsIpcHandlers'
import { setupConnectionsHandlers } from './connectionsIpcHandlers'
import { setupImageHandlers } from './imageIpcHandlers'
import { setupTagHandlers } from './tagIpcHandlers'
import { setupFilterHandlers } from './filterIpcHandlers'
import { setupEmbeddingHandlers } from './embeddingIpcHandlers'
import { setupDictionaryHandlers } from './dictionaryIpcHandlers'
import { setupRAGHandlers } from './ragIpcHandlers'
import { setupLLMConfigHandlers } from './llmConfigIpcHandlers'
import { setupLocalTreeHandlers } from './localTreeIpcHandlers'
import { setupAppearanceHandlers } from './appearanceIpcHandlers'
import { setupKnowledgeTreeHandlers } from './knowledgeTreeIpcHandlers'
import { setupLicenseHandlers } from './licenseIpcHandlers'
export function setupIpcHandlers() {
  setupNotesHandlers()
  setupWhiteboardHandlers()
  setupCardboxHandlers()
  setupUserSettingsHandlers()
  setupConnectionsHandlers()
  setupImageHandlers()
  setupTagHandlers()
  setupFilterHandlers()
  setupEmbeddingHandlers()
  setupDictionaryHandlers()
  setupRAGHandlers()
  setupLLMConfigHandlers()
  setupLocalTreeHandlers()
  setupAppearanceHandlers()
  setupKnowledgeTreeHandlers()
  setupLicenseHandlers()
}
