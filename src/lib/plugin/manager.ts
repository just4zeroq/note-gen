/**
 * 插件管理器 - 使用 Tauri 后端
 */

import { invoke } from '@tauri-apps/api/core'
import {
  type PluginManifest,
  type PluginInstance,
  type PluginInfo,
  type PluginStatus,
  type PluginPermission,
  type PluginAPI,
} from './types'
import {
  createEditorAPI,
  createUIAPI,
  createStorageAPI,
  createEventAPI,
  createAIAPI,
  createFileSystemAPI,
  createNetworkAPI,
} from './api'

// 插件实例存储
const pluginInstances = new Map<string, PluginInstance>()

// 插件配置
interface PluginConfig {
  enabled: string[]
}

const DEFAULT_CONFIG: PluginConfig = {
  enabled: [],
}

/**
 * 创建插件 API
 */
export function createPluginAPI(pluginName: string): PluginAPI {
  return {
    pluginName,
    editor: createEditorAPI(),
    ui: createUIAPI(),
    storage: createStorageAPI(pluginName),
    event: createEventAPI(),
    ai: createAIAPI(),
    fs: createFileSystemAPI(),
    network: createNetworkAPI(),
    app: {
      getVersion: () => '1.0.0', // TODO: 从配置获取
      getDataPath: () => 'data',
      getWorkspacePath: () => 'workspace',
    },
    log: {
      info: (message: string, ...args: any[]) => console.log(`[Plugin:${pluginName}]`, message, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[Plugin:${pluginName}]`, message, ...args),
      error: (message: string, ...args: any[]) => console.error(`[Plugin:${pluginName}]`, message, ...args),
      debug: (message: string, ...args: any[]) => console.debug(`[Plugin:${pluginName}]`, message, ...args),
    },
  }
}

/**
 * 扫描插件目录 (使用 Tauri 命令)
 */
export async function scanPlugins(_pluginDir: string): Promise<PluginManifest[]> {
  try {
    const plugins = await invoke<PluginInfo[]>('list_plugins')
    const manifests: PluginManifest[] = []

    for (const plugin of plugins) {
      try {
        const manifest = await invoke<PluginManifest>('get_plugin', { name: plugin.name })
        manifests.push({
          ...manifest,
          name: plugin.name, // 确保使用目录名
        })
      } catch (e) {
        console.warn('[PluginManager] Failed to get plugin manifest:', plugin.name, e)
      }
    }

    return manifests
  } catch (error) {
    console.error('[PluginManager] Scan plugins error:', error)
    return []
  }
}

/**
 * 加载单个插件
 */
export async function loadPlugin(manifest: PluginManifest, pluginPath: string): Promise<PluginInstance> {
  const instance: PluginInstance = {
    manifest,
    path: pluginPath,
    enabled: false,
    loaded: false,
  }

  try {
    // 动态加载插件入口文件
    // 注意: 由于是静态部署，我们需要从后端读取文件内容
    const entryContent = await invoke<string>('read_plugin_file', {
      name: manifest.name,
      filePath: manifest.main,
    })

    // 创建一个函数来执行插件代码
    // 注意: 这是一个简化的实现，实际可能需要更复杂的沙箱
    const moduleLoader = new Function('module', 'exports', 'define', entryContent)
    const module: any = {}
    const exports: any = {}

    // 简单的 define 实现
    const define = (def: any) => {
      if (typeof def === 'function') {
        const plugin = def()
        Object.assign(instance, {
          onLoad: plugin.onLoad?.bind(plugin),
          onEnable: plugin.onEnable?.bind(plugin),
          onDisable: plugin.onDisable?.bind(plugin),
          onUnload: plugin.onUnload?.bind(plugin),
          onSettingsChange: plugin.onSettingsChange?.bind(plugin),
          getSettings: plugin.getSettings?.bind(plugin),
          data: plugin.data,
        })
      } else if (typeof def === 'object') {
        Object.assign(instance, def)
      }
    }

    moduleLoader(module, exports, define)

    // 标记为已加载
    instance.loaded = true

    // 存储实例
    pluginInstances.set(manifest.name, instance)

    // 调用 onLoad
    if (instance.onLoad) {
      const api = createPluginAPI(manifest.name)
      await instance.onLoad(api)
    }

    console.log('[PluginManager] Plugin loaded:', manifest.name)
  } catch (error) {
    console.error('[PluginManager] Load plugin error:', manifest.name, error)
    instance.loaded = false
  }

  return instance
}

/**
 * 启用插件 (使用 Tauri 命令)
 */
export async function enablePlugin(name: string): Promise<void> {
  const instance = pluginInstances.get(name)
  if (!instance) {
    throw new Error(`Plugin not found: ${name}`)
  }

  if (instance.enabled) {
    return // 已经启用
  }

  // 调用 onEnable
  if (instance.onEnable) {
    const api = createPluginAPI(name)
    await instance.onEnable(api)
  }

  instance.enabled = true

  // 保存配置
  try {
    await invoke('enable_plugin_cmd', { name })
  } catch (error) {
    console.error('[PluginManager] Save enabled state error:', error)
  }

  console.log('[PluginManager] Plugin enabled:', name)
}

/**
 * 禁用插件 (使用 Tauri 命令)
 */
export async function disablePlugin(name: string): Promise<void> {
  const instance = pluginInstances.get(name)
  if (!instance) {
    throw new Error(`Plugin not found: ${name}`)
  }

  if (!instance.enabled) {
    return // 已经禁用
  }

  // 调用 onDisable
  if (instance.onDisable) {
    const api = createPluginAPI(name)
    await instance.onDisable(api)
  }

  instance.enabled = false

  // 保存配置
  try {
    await invoke('disable_plugin_cmd', { name })
  } catch (error) {
    console.error('[PluginManager] Save disabled state error:', error)
  }

  console.log('[PluginManager] Plugin disabled:', name)
}

/**
 * 卸载插件
 */
export async function unloadPlugin(name: string): Promise<void> {
  const instance = pluginInstances.get(name)
  if (!instance) {
    return
  }

  // 如果已启用，先禁用
  if (instance.enabled) {
    await disablePlugin(name)
  }

  // 调用 onUnload
  if (instance.onUnload) {
    const api = createPluginAPI(name)
    await instance.onUnload(api)
  }

  // 移除实例
  pluginInstances.delete(name)

  console.log('[PluginManager] Plugin unloaded:', name)
}

/**
 * 安装插件 (使用 Tauri 命令)
 */
export async function installPlugin(
  manifest: PluginManifest,
  files: Record<string, string>,
  _targetDir: string
): Promise<void> {
  try {
    const filesArray = Object.entries(files).map(([filename, content]) => [filename, content])

    await invoke('install_plugin', {
      name: manifest.name,
      manifest,
      files: filesArray,
    })

    console.log('[PluginManager] Plugin installed:', manifest.name)
  } catch (error) {
    console.error('[PluginManager] Install plugin error:', error)
    throw error
  }
}

/**
 * 卸载插件 (使用 Tauri 命令)
 */
export async function uninstallPlugin(name: string): Promise<void> {
  try {
    // 先卸载
    await unloadPlugin(name)

    // 删除目录
    await invoke('uninstall_plugin', { name })

    console.log('[PluginManager] Plugin uninstalled:', name)
  } catch (error) {
    console.error('[PluginManager] Uninstall plugin error:', error)
    throw error
  }
}

/**
 * 扫描并加载所有插件
 */
export async function scanAndLoadAll(_pluginDir: string): Promise<void> {
  // 扫描插件
  const manifests = await scanPlugins('plugins')

  // 加载每个插件
  for (const manifest of manifests) {
    try {
      // 检查是否启用
      const enabled = await invoke<boolean>('is_plugin_enabled', { name: manifest.name })

      const instance = await loadPlugin(manifest, `plugins/${manifest.name}`)

      // 如果已启用，则启用
      if (enabled) {
        await enablePlugin(manifest.name)
      }
    } catch (error) {
      console.error('[PluginManager] Failed to load plugin:', manifest.name, error)
    }
  }

  console.log('[PluginManager] All plugins scanned and loaded')
}

/**
 * 获取插件实例
 */
export function getPlugin(name: string): PluginInstance | null {
  return pluginInstances.get(name) || null
}

/**
 * 获取所有已启用插件
 */
export function getEnabledPlugins(): PluginInstance[] {
  return Array.from(pluginInstances.values()).filter((p) => p.enabled)
}

/**
 * 获取所有插件
 */
export function getAllPlugins(): PluginInstance[] {
  return Array.from(pluginInstances.values())
}

/**
 * 获取插件信息列表 (用于 UI 显示)
 */
export async function getPluginList(_pluginDir: string): Promise<PluginInfo[]> {
  try {
    const plugins = await invoke<any[]>('list_plugins')

    return plugins.map((plugin) => {
      const instance = pluginInstances.get(plugin.name)

      return {
        name: plugin.name,
        version: plugin.version,
        author: plugin.author,
        description: plugin.description,
        icon: plugin.icon,
        homepage: plugin.homepage,
        path: plugin.path,
        installed: plugin.installed,
        min_app_version: plugin.min_app_version,
        outdated: plugin.outdated,
        latest_version: plugin.latest_version,
        update_url: plugin.update_url,
        enabled: instance?.enabled || false,
      }
    })
  } catch (error) {
    console.error('[PluginManager] Get plugin list error:', error)
    return []
  }
}

/**
 * 检查权限
 */
export function checkPermission(plugin: string, permission: PluginPermission): boolean {
  const instance = pluginInstances.get(plugin)
  if (!instance) {
    return false
  }

  const permissions = instance.manifest.permissions || []
  return permissions.includes(permission) || permissions.includes('*')
}

/**
 * 读取插件文件内容
 */
export async function readPluginFile(name: string, filePath: string): Promise<string> {
  return invoke<string>('read_plugin_file', { name, filePath })
}

/**
 * 写入插件文件
 */
export async function writePluginFile(name: string, filePath: string, content: string): Promise<void> {
  return invoke('write_plugin_file', { name, filePath, content })
}

/**
 * 删除插件文件
 */
export async function deletePluginFile(name: string, filePath: string): Promise<void> {
  return invoke('delete_plugin_file', { name, filePath })
}

/**
 * 获取插件配置
 */
export async function getPluginConfig(): Promise<PluginConfig> {
  try {
    const config = await invoke<any>('get_plugin_config')
    return {
      enabled: config.enabled || [],
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 保存插件配置
 */
export async function savePluginConfig(config: PluginConfig): Promise<void> {
  return invoke('save_plugin_config', { config })
}