export const IPC_CHANNELS = {
  // Browser & Capture
  BROWSER_SCAN: 'browser:scan',
  BROWSER_LIST_TABS: 'browser:list-tabs',
  BROWSER_SELECT_TAB: 'browser:select-tab',
  BROWSER_GET_SELECTED: 'browser:get-selected',
  BROWSER_GET_THUMBNAIL: 'browser:get-thumbnail',
  CAPTURE_EXECUTE: 'capture:execute',
  CAPTURE_EXECUTE_MANUAL: 'capture:execute-manual',

  // AI
  AI_ASK: 'ai:ask',
  AI_LIST_PROVIDERS: 'ai:list-providers',
  AI_ADD_PROVIDER: 'ai:add-provider',
  AI_UPDATE_PROVIDER: 'ai:update-provider',
  AI_DELETE_PROVIDER: 'ai:delete-provider',
  AI_TEST_CONNECTION: 'ai:test-connection',
  AI_SET_ACTIVE_PROVIDER: 'ai:set-active-provider',

  // Settings
  SETTINGS_GET_ALL: 'settings:get-all',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',

  // History
  HISTORY_LIST: 'history:list',
  HISTORY_SEARCH: 'history:search',
  HISTORY_GET_DETAIL: 'history:get-detail',
  HISTORY_DELETE: 'history:delete',
  HISTORY_DELETE_BATCH: 'history:delete-batch',
  HISTORY_CLEAR_ALL: 'history:clear-all',

  // Window Management
  WINDOW_LAUNCH_FLOAT: 'window:launch-float',
  WINDOW_CLOSE_FLOAT: 'window:close-float',
  WINDOW_SET_FLOAT_POSITION: 'window:set-float-position',
  WINDOW_SET_ALWAYS_ON_TOP: 'window:set-always-on-top',
  WINDOW_MINIMIZE_TO_TRAY: 'window:minimize-to-tray',
  WINDOW_GET_FLOAT_STATUS: 'window:get-float-status',

  // Events (main -> renderer)
  EVENT_FLOAT_STATUS_CHANGED: 'event:float-status-changed',
  EVENT_BROWSER_DISCONNECTED: 'event:browser-disconnected',
  EVENT_CAPTURE_PROGRESS: 'event:capture-progress',
} as const;
