/**
 * KnowNote 插件系统入口
 */

import {
  scanAndLoadAll,
  createPluginAPI,
} from './manager'

// 核心类型和接口
export * from './types'

// API 模块
export * from './api'

// 插件管理器
export {
  scanPlugins,
  loadPlugin,
  enablePlugin,
  disablePlugin,
  unloadPlugin,
  installPlugin,
  uninstallPlugin,
  scanAndLoadAll,
  getPlugin,
  getEnabledPlugins,
  getAllPlugins,
  getPluginList,
  checkPermission,
  readPluginFile,
  writePluginFile,
  deletePluginFile,
  getPluginConfig,
  savePluginConfig,
} from './manager'

// 工具函数
export { createPluginAPI } from './manager'

/**
 * 初始化插件系统
 */
export async function initPluginSystem(pluginDir: string = 'plugins'): Promise<void> {
  console.log('[PluginSystem] Initializing...')

  try {
    await scanAndLoadAll(pluginDir)
    console.log('[PluginSystem] Initialized successfully')
  } catch (error) {
    console.error('[PluginSystem] Initialization error:', error)
  }
}

/**
 * 定义插件的辅助函数
 */
export function definePlugin(manifest: {
  name: string
  version?: string
  author?: string
  description?: string
  permissions?: string[]
  onLoad?: (api: any) => void | Promise<void>
  onEnable?: (api: any) => void | Promise<void>
  onDisable?: (api: any) => void | Promise<void>
  onUnload?: (api: any) => void | Promise<void>
  onSettingsChange?: (key: string, value: any) => void
  getSettings?: () => Record<string, any>
}) {
  return class Plugin {
    static manifest = manifest

    async onLoad(api: any) {
      if (manifest.onLoad) {
        return manifest.onLoad(api)
      }
    }

    async onEnable(api: any) {
      if (manifest.onEnable) {
        return manifest.onEnable(api)
      }
    }

    async onDisable(api: any) {
      if (manifest.onDisable) {
        return manifest.onDisable(api)
      }
    }

    async onUnload(api: any) {
      if (manifest.onUnload) {
        return manifest.onUnload(api)
      }
    }

    onSettingsChange(key: string, value: any) {
      if (manifest.onSettingsChange) {
        manifest.onSettingsChange(key, value)
      }
    }

    getSettings() {
      if (manifest.getSettings) {
        return manifest.getSettings()
      }
      return {}
    }
  }
}

/**
 * 创建插件 (工厂函数)
 */
export function createPlugin(
  manifest: {
    name: string
    version?: string
    author?: string
    description?: string
    permissions?: string[]
  },
  hooks: {
    onLoad?: (api: any) => void | Promise<void>
    onEnable?: (api: any) => void | Promise<void>
    onDisable?: (api: any) => void | Promise<void>
    onUnload?: (api: any) => void | Promise<void>
    onSettingsChange?: (key: string, value: any) => void
    getSettings?: () => Record<string, any>
  }
) {
  return {
    manifest,
    ...hooks,
  }
}