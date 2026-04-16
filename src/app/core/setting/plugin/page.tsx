'use client'

import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface PluginInfo {
  name: string
  version: string
  author: string
  description: string
  icon?: string
  homepage?: string
  path: string
  installed: boolean
  min_app_version?: string
  outdated?: boolean
  latest_version?: string
  update_url?: string
}

interface AppVersion {
  major: number
  minor: number
  patch: number
  string: string
}

export default function PluginPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlugins()
    loadAppVersion()
  }, [])

  async function loadPlugins() {
    try {
      const list = await invoke<PluginInfo[]>('list_plugins')
      setPlugins(list)
    } catch (error) {
      console.error('Load plugins error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAppVersion() {
    try {
      const version = await invoke<AppVersion>('get_app_version')
      setAppVersion(version)
    } catch (error) {
      console.error('Load app version error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">插件</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理 KnowNote 插件 {appVersion && <span className="ml-2">v{appVersion.string}</span>}
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
          从文件安装
        </button>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📦</div>
          <p>暂无插件</p>
          <p className="text-sm mt-2">点击上方按钮安装插件</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              appVersion={appVersion}
              onToggle={() => loadPlugins()}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PluginCard({
  plugin,
  appVersion,
  onToggle,
}: {
  plugin: PluginInfo
  appVersion: AppVersion | null
  onToggle: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [compatible, setCompatible] = useState<boolean | null>(null)

  useEffect(() => {
    checkEnabled()
    checkCompatibility()
  }, [plugin.name])

  async function checkEnabled() {
    try {
      const result = await invoke<boolean>('is_plugin_enabled', { name: plugin.name })
      setEnabled(result)
    } catch (error) {
      console.error('Check enabled error:', error)
    }
  }

  async function checkCompatibility() {
    try {
      const result = await invoke<{ compatible: boolean }>('check_plugin_compatibility', { name: plugin.name })
      setCompatible(result.compatible)
    } catch (error) {
      console.error('Check compatibility error:', error)
      setCompatible(true)
    }
  }

  async function handleToggle() {
    setToggling(true)
    try {
      if (enabled) {
        await invoke('disable_plugin_cmd', { name: plugin.name })
      } else {
        await invoke('enable_plugin_cmd', { name: plugin.name })
      }
      setEnabled(!enabled)
      onToggle()
    } catch (error) {
      console.error('Toggle error:', error)
    } finally {
      setToggling(false)
    }
  }

  async function handleUninstall() {
    if (!confirm(`确定要卸载插件 "${plugin.name}" 吗？`)) {
      return
    }

    try {
      await invoke('uninstall_plugin', { name: plugin.name })
      onToggle()
    } catch (error) {
      console.error('Uninstall error:', error)
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {plugin.icon ? (
            <img src={plugin.icon} alt="" className="w-10 h-10 rounded" />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xl">🔌</span>
            </div>
          )}
          <div>
            <h3 className="font-medium">{plugin.name}</h3>
            <p className="text-sm text-gray-500">
              v{plugin.version} · by {plugin.author}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 兼容性状态 */}
          {compatible === false && (
            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700" title={`需要版本 ${plugin.min_app_version}`}>
              不兼容
            </span>
          )}
          {/* 版本状态 */}
          {plugin.outdated && (
            <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
              有更新
            </span>
          )}
          {/* 启用状态 */}
          <span
            className={`px-2 py-1 text-xs rounded ${
              enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {enabled ? '已启用' : '未启用'}
          </span>
          <button
            onClick={handleToggle}
            disabled={toggling || compatible === false}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enabled ? '禁用' : '启用'}
          </button>
          <button
            onClick={handleUninstall}
            className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
          >
            卸载
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-3">{plugin.description}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        {plugin.min_app_version && (
          <span>最低版本: v{plugin.min_app_version}</span>
        )}
        {plugin.homepage && (
          <a
            href={plugin.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            主页
          </a>
        )}
      </div>
    </div>
  )
}