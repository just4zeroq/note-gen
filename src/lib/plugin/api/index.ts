/**
 * 插件 API 导出
 */

export { createEditorAPI, notifyEditorReady, notifyEditorChange, notifySelectionChange, getRegisteredCommands, getRegisteredSlashCommands } from './editor'
export { createUIAPI, setCurrentTheme, getSidebarItems, getToolbarButtons, getCommands, getPanels } from './ui'
export { createStorageAPI } from './storage'
export { createEventAPI, emitSystemEvent, clearAllEvents, getEventListenerCount } from './event'
export { createAIAPI } from './ai'
export { createFileSystemAPI } from './fs'
export { createNetworkAPI } from './network'

export type {
  EditorAPI,
  EditorCommand,
  SlashCommand,
  UIAPI,
  SidebarItem,
  ToolbarButton,
  Command,
  DialogOptions,
  DialogHandle,
  ConfirmOptions,
  PromptOptions,
  PanelOptions,
  NotificationType,
  StorageAPI,
  EventAPI,
  EventCallback,
  AIAPI,
  AIMessage,
  FileSystemAPI,
  FileInfo,
  NetworkAPI,
  RequestOptions,
} from '../types'