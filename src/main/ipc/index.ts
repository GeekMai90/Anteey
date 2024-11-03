import { setupNotesHandlers } from './notesIpcHandlers'
import { setupWhiteboardHandlers } from './whiteboardIpcHandlers'
import { setupCardboxHandlers } from './cardboxIpcHandlers'
import { setupUserSettingsHandlers } from './userSettingsIpcHandlers'
import { setupConnectionsHandlers } from './connectionsIpcHandlers'
import { setupCacheHandlers } from './cacheIpcHandlers'
import { setupImageHandlers } from './imageIpcHandlers'
import { setupTagHandlers } from './tagIpcHandlers'

export function setupIpcHandlers() {
  setupNotesHandlers()
  setupWhiteboardHandlers()
  setupCardboxHandlers()
  setupUserSettingsHandlers()
  setupConnectionsHandlers()
  setupCacheHandlers()
  setupImageHandlers()
  setupTagHandlers()
}
