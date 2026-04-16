/**
 * UI API 实现
 */

import type {
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
} from '../types'

// 存储的 UI 元素
const sidebarItems = new Map<string, SidebarItem>()
const toolbarButtons = new Map<string, ToolbarButton>()
const commands = new Map<string, Command>()
const panels = new Map<string, PanelOptions>()

// 主题监听器
const themeListeners = new Set<(theme: string) => void>()
let currentTheme: 'light' | 'dark' | 'auto' = 'light'

/**
 * 创建 UI API
 */
export function createUIAPI(): UIAPI {
  return {
    // 侧边栏
    addSidebarItem(item: SidebarItem): string {
      sidebarItems.set(item.id, item)
      return item.id
    },

    removeSidebarItem(id: string): void {
      sidebarItems.delete(id)
    },

    updateSidebarItem(id: string, item: Partial<SidebarItem>): void {
      const existing = sidebarItems.get(id)
      if (existing) {
        sidebarItems.set(id, { ...existing, ...item })
      }
    },

    // 工具栏
    addToolbarButton(button: ToolbarButton): string {
      toolbarButtons.set(button.id, button)
      return button.id
    },

    removeToolbarButton(id: string): void {
      toolbarButtons.delete(id)
    },

    // 命令面板
    addCommand(command: Command): string {
      commands.set(command.id, command)
      return command.id
    },

    removeCommand(id: string): void {
      commands.delete(id)
    },

    // 对话框
    showDialog(options: DialogOptions): DialogHandle {
      // TODO: 实现对话框显示
      // 这里返回句柄，实际实现需要与 UI 框架集成
      console.log('Show dialog:', options.title)

      return {
        close: () => {
          console.log('Close dialog')
        },
        update: (newOptions: Partial<DialogOptions>) => {
          console.log('Update dialog:', newOptions)
        },
      }
    },

    async showConfirm(options: ConfirmOptions): Promise<boolean> {
      // TODO: 实现确认框
      console.log('Show confirm:', options.title)
      return true
    },

    async showPrompt(options: PromptOptions): Promise<string | null> {
      // TODO: 实现输入框
      console.log('Show prompt:', options.title)
      return options.defaultValue || null
    },

    // 通知
    showNotification(message: string, type: NotificationType = 'info'): void {
      // TODO: 实现通知显示
      console.log(`[${type}] ${message}`)
    },

    // 面板
    addPanel(panel: PanelOptions): string {
      panels.set(panel.id, panel)
      return panel.id
    },

    removePanel(id: string): void {
      panels.delete(id)
    },

    // 主题
    getTheme(): 'light' | 'dark' | 'auto' {
      return currentTheme
    },

    onThemeChange(callback: (theme: string) => void): () => void {
      themeListeners.add(callback)
      return () => {
        themeListeners.delete(callback)
      }
    },
  }
}

/**
 * 设置当前主题
 */
export function setCurrentTheme(theme: 'light' | 'dark' | 'auto') {
  currentTheme = theme
  themeListeners.forEach((callback) => callback(theme))
}

/**
 * 获取所有侧边栏项目
 */
export function getSidebarItems(): SidebarItem[] {
  return Array.from(sidebarItems.values()).sort((a, b) => (b.priority || 0) - (a.priority || 0))
}

/**
 * 获取所有工具栏按钮
 */
export function getToolbarButtons(): ToolbarButton[] {
  return Array.from(toolbarButtons.values())
}

/**
 * 获取所有命令
 */
export function getCommands(): Command[] {
  return Array.from(commands.values())
}

/**
 * 获取所有面板
 */
export function getPanels(): PanelOptions[] {
  return Array.from(panels.values())
}