/**
 * KnowNote 插件系统核心类型定义
 */

// ==================== 插件清单 ====================

/**
 * 插件清单 (plugin.json)
 */
export interface PluginManifest {
  /** 插件唯一标识 */
  name: string
  /** 语义化版本 */
  version: string
  /** 作者 */
  author: string
  /** 描述 */
  description: string
  /** 图标路径 */
  icon?: string
  /** 主页链接 */
  homepage?: string
  /** 最低应用版本 */
  minAppVersion?: string
  /** 关键词，用于搜索 */
  keywords?: string[]
  /** 需要的权限 */
  permissions?: PluginPermission[]

  /** 支持的平台 */
  platforms?: ('desktop' | 'mobile' | 'browser')[]
  /** 支持的操作系统 */
  backends?: ('windows' | 'linux' | 'darwin' | 'ios' | 'android')[]

  /** 入口文件 */
  main: string
  /** 设置页面入口 */
  settings?: string
  /** 渲染器入口 (可选，用于复杂 UI) */
  renderer?: string

  /** 插件类型 */
  type?: 'plugin' | 'theme' | 'template'

  /** 国际化 */
  i18n?: Record<string, Record<string, string>>
}

/**
 * 插件权限
 */
export type PluginPermission =
  | 'editor:read'
  | 'editor:write'
  | 'editor:command'
  | 'storage:local'
  | 'storage:sync'
  | 'ui:toolbar'
  | 'ui:sidebar'
  | 'ui:command'
  | 'ui:dialog'
  | 'ai:chat'
  | 'ai:embed'
  | 'network:fetch'
  | 'fs:read'
  | 'fs:write'
  | '*'

// ==================== 插件实例 ====================

/**
 * 插件实例
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest
  /** 是否启用 */
  enabled: boolean
  /** 是否已加载 */
  loaded: boolean
  /** 插件根目录路径 */
  path: string

  /** 生命周期钩子 */
  onLoad?: (api: PluginAPI) => void | Promise<void>
  onEnable?: (api: PluginAPI) => void | Promise<void>
  onDisable?: (api: PluginAPI) => void | Promise<void>
  onUnload?: (api: PluginAPI) => void | Promise<void>

  /** 设置变更回调 */
  onSettingsChange?: (key: string, value: any) => void

  /** 获取设置 */
  getSettings?: () => Record<string, any>

  /** 自定义数据 */
  data?: Record<string, any>
}

/**
 * 插件状态
 */
export type PluginStatus = 'loaded' | 'enabled' | 'disabled' | 'error'

/**
 * 插件信息 (用于 UI 显示)
 */
export interface PluginInfo {
  name: string
  version: string
  author: string
  description: string
  icon?: string
  homepage?: string
  path: string
  installed: boolean
  status?: PluginStatus
  enabled?: boolean
  error?: string
  /** 最低应用版本 */
  min_app_version?: string
  /** 是否过时 */
  outdated?: boolean
  /** 最新版本 */
  latest_version?: string
  /** 更新链接 */
  update_url?: string
}

/** 插件安装信息 */
export interface PluginInstallInfo {
  version: string | null
  installed_at: string | null
}

/** 应用版本 */
export interface AppVersion {
  major: number
  minor: number
  patch: number
  string: string
}

/** 插件兼容性检查结果 */
export interface PluginCompatibility {
  compatible: boolean
  plugin_version: string
  min_app_version: string | null
  app_version: string
}

// ==================== 插件 API ====================

/**
 * 编辑器 API
 */
export interface EditorAPI {
  /** 获取当前编辑器实例 */
  getCurrentEditor(): any | null
  /** 获取编辑器内容 (Markdown) */
  getContent(): string
  /** 获取编辑器 HTML */
  getHTML(): string
  /** 获取编辑器 JSON */
  getJSON(): any
  /** 插入内容 */
  insertContent(content: string, position?: 'cursor' | 'start' | 'end'): void
  /** 替换选区 */
  replaceSelection(content: string): void
  /** 删除选区 */
  deleteSelection(): void
  /** 获取选区 */
  getSelection(): { from: number; to: number; text: string }
  /** 设置选区 */
  setSelection(start: number, end: number): void
  /** 注册命令 */
  registerCommand(command: EditorCommand): void
  /** 注销命令 */
  unregisterCommand(commandId: string): void
  /** 监听编辑器就绪 */
  onReady(callback: (editor: any) => void): () => void
  /** 监听内容变化 */
  onChange(callback: (content: string) => void): () => void
  /** 监听选区变化 */
  onSelectionChange(callback: (selection: any) => void): () => void
  /** 注册 Tiptap 扩展 */
  registerExtension(extension: any): void
  /** 注册斜杠命令 */
  registerSlashCommand(command: SlashCommand): void
}

/**
 * 编辑器命令
 */
export interface EditorCommand {
  id: string
  label: string
  shortcut?: string
  handler: () => void
}

/**
 * 斜杠命令
 */
export interface SlashCommand {
  id: string
  label: string
  icon?: string
  action: (editor: any) => void
}

/**
 * UI API
 */
export interface UIAPI {
  /** 添加侧边栏项目 */
  addSidebarItem(item: SidebarItem): string
  /** 移除侧边栏项目 */
  removeSidebarItem(id: string): void
  /** 更新侧边栏项目 */
  updateSidebarItem(id: string, item: Partial<SidebarItem>): void

  /** 添加工具栏按钮 */
  addToolbarButton(button: ToolbarButton): string
  /** 移除工具栏按钮 */
  removeToolbarButton(id: string): void

  /** 添加命令面板命令 */
  addCommand(command: Command): string
  /** 移除命令面板命令 */
  removeCommand(id: string): void

  /** 显示对话框 */
  showDialog(options: DialogOptions): DialogHandle
  /** 显示确认框 */
  showConfirm(options: ConfirmOptions): Promise<boolean>
  /** 显示输入框 */
  showPrompt(options: PromptOptions): Promise<string | null>

  /** 显示通知 */
  showNotification(message: string, type?: NotificationType): void

  /** 添加面板 */
  addPanel(panel: PanelOptions): string
  /** 移除面板 */
  removePanel(id: string): void

  /** 获取当前主题 */
  getTheme(): 'light' | 'dark' | 'auto'
  /** 监听主题变化 */
  onThemeChange(callback: (theme: string) => void): () => void
}

/**
 * 侧边栏项目
 */
export interface SidebarItem {
  id: string
  title: string
  icon?: string
  render: () => React.ReactNode
  priority?: number
}

/**
 * 工具栏按钮
 */
export interface ToolbarButton {
  id: string
  icon?: string
  label: string
  shortcut?: string
  onClick: () => void
  tooltip?: string
}

/**
 * 命令
 */
export interface Command {
  id: string
  label: string
  shortcut?: string
  icon?: string
  handler: () => void
}

/**
 * 对话框选项
 */
export interface DialogOptions {
  title: string
  content: React.ReactNode
  footer?: React.ReactNode
  width?: number | string
  closable?: boolean
  maskClosable?: boolean
  onClose?: () => void
}

/**
 * 对话框句柄
 */
export interface DialogHandle {
  close: () => void
  update: (options: Partial<DialogOptions>) => void
}

/**
 * 确认框选项
 */
export interface ConfirmOptions {
  title: string
  content: string
  okText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error'
}

/**
 * 输入框选项
 */
export interface PromptOptions {
  title: string
  label?: string
  placeholder?: string
  defaultValue?: string
  okText?: string
  cancelText?: string
  validate?: (value: string) => string | null
}

/**
 * 面板选项
 */
export interface PanelOptions {
  id: string
  title: string
  icon?: string
  content: React.ReactNode
  position?: 'left' | 'right' | 'bottom'
  size?: number
}

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * 存储 API
 */
export interface StorageAPI {
  /** 获取值 */
  get<T = any>(key: string): Promise<T | null>
  /** 设置值 */
  set<T = any>(key: string, value: T): Promise<void>
  /** 删除值 */
  delete(key: string): Promise<void>
  /** 清空所有 */
  clear(): Promise<void>
  /** 获取所有键 */
  keys(): Promise<string[]>
}

/**
 * 事件 API
 */
export interface EventAPI {
  /** 订阅事件 */
  on(event: string, callback: EventCallback): () => void
  /** 订阅一次 */
  once(event: string, callback: EventCallback): void
  /** 取消订阅 */
  off(event: string, callback?: EventCallback): void
  /** 发布事件 */
  emit(event: string, data?: any): void
}

/**
 * 事件回调
 */
export type EventCallback = (data?: any) => void

/**
 * 系统事件类型
 */
export interface SystemEvents {
  'app:ready': () => void
  'app:close': () => void
  'editor:ready': (editor: any) => void
  'editor:change': (content: string) => void
  'file:open': (file: FileInfo) => void
  'file:save': (file: FileInfo) => void
  'file:new': (filePath: string) => void
  'file:delete': (filePath: string) => void
  'sync:start': () => void
  'sync:complete': (success: boolean) => void
  'shortcut:triggered': (shortcut: string) => void
  'theme:change': (theme: string) => void
}

/**
 * 文件信息
 */
export interface FileInfo {
  path: string
  name: string
  content?: string
}

/**
 * AI API
 */
export interface AIAPI {
  /** AI 对话 */
  chat(messages: AIMessage[]): Promise<string>
  /** 文本嵌入 */
  embed(texts: string[]): Promise<number[][]>
  /** 流式对话 */
  chatStream(messages: AIMessage[], onChunk: (chunk: string) => void): Promise<string>
}

/**
 * AI 消息
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * 文件系统 API
 */
export interface FileSystemAPI {
  /** 读取文件 */
  readFile(path: string): Promise<string>
  /** 写入文件 */
  writeFile(path: string, content: string): Promise<void>
  /** 删除文件 */
  deleteFile(path: string): Promise<void>
  /** 读取目录 */
  readDir(path: string): Promise<FileInfo[]>
  /** 检查文件是否存在 */
  exists(path: string): Promise<boolean>
}

/**
 * 网络 API
 */
export interface NetworkAPI {
  /** 发起请求 */
  fetch(url: string, options?: RequestOptions): Promise<FetchResponse>
}

/**
 * 请求选项
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string | FormData
}

/**
 * Fetch 响应
 */
export interface FetchResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  text: () => Promise<string>
  json: () => Promise<any>
  blob: () => Promise<Blob>
}

/**
 * 完整的插件 API
 */
export interface PluginAPI {
  /** 插件名称 */
  pluginName: string

  /** 编辑器相关 */
  editor: EditorAPI

  /** UI 相关 */
  ui: UIAPI

  /** 存储 */
  storage: StorageAPI

  /** 事件 */
  event: EventAPI

  /** AI */
  ai: AIAPI

  /** 文件系统 */
  fs: FileSystemAPI

  /** 网络 */
  network: NetworkAPI

  /** 应用信息 */
  app: {
    /** 获取应用版本 */
    getVersion(): string
    /** 获取数据目录 */
    getDataPath(): string
    /** 获取工作区路径 */
    getWorkspacePath(): string
  }

  /** 日志 */
  log: {
    info(message: string, ...args: any[]): void
    warn(message: string, ...args: any[]): void
    error(message: string, ...args: any[]): void
    debug(message: string, ...args: any[]): void
  }

  /** 依赖的插件 */
  dependencies?: string[]
}

// ==================== 插件管理器 ====================

/**
 * 插件管理器接口
 */
export interface PluginManagerInterface {
  /** 扫描并加载所有插件 */
  scanAndLoad(): Promise<void>

  /** 加载指定插件 */
  loadPlugin(name: string): Promise<PluginInstance>

  /** 卸载指定插件 */
  unloadPlugin(name: string): Promise<void>

  /** 启用插件 */
  enablePlugin(name: string): Promise<void>

  /** 禁用插件 */
  disablePlugin(name: string): Promise<void>

  /** 安装插件 */
  installPlugin(manifest: PluginManifest, files: Record<string, string>): Promise<void>

  /** 卸载插件 */
  uninstallPlugin(name: string): Promise<void>

  /** 获取插件实例 */
  getPlugin(name: string): PluginInstance | null

  /** 获取所有已启用插件 */
  getEnabledPlugins(): PluginInstance[]

  /** 获取所有插件 */
  getAllPlugins(): PluginInstance[]

  /** 检查权限 */
  checkPermission(plugin: string, permission: PluginPermission): boolean
}

// ==================== 插件加载器 ====================

/**
 * 插件加载器选项
 */
export interface PluginLoaderOptions {
  /** 插件目录 */
  pluginDir: string
  /** 内置插件目录 */
  builtInDir?: string
  /** 是否启用沙箱 */
  sandbox?: boolean
  /** 自定义 API 创建函数 */
  createAPI?: (plugin: PluginInstance) => PluginAPI
}

/**
 * 加载结果
 */
export interface LoadResult {
  success: boolean
  error?: string
  instance?: PluginInstance
}