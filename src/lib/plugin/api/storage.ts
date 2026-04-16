/**
 * 存储 API 实现
 */

import { Store } from '@tauri-apps/plugin-store'
import type { StorageAPI } from '../types'

/**
 * 创建存储 API
 */
export function createStorageAPI(pluginName: string): StorageAPI {
  const storeKey = `plugin.${pluginName}.`

  async function getStore(): Promise<Store> {
    return Store.load('plugin-store.json')
  }

  return {
    async get<T = any>(key: string): Promise<T | null> {
      try {
        const store = await getStore()
        const value = await store.get<T>(storeKey + key)
        return value ?? null
      } catch (error) {
        console.error(`[Plugin:${pluginName}] Storage get error:`, error)
        return null
      }
    },

    async set<T = any>(key: string, value: T): Promise<void> {
      try {
        const store = await getStore()
        await store.set(storeKey + key, value)
        await store.save()
      } catch (error) {
        console.error(`[Plugin:${pluginName}] Storage set error:`, error)
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const store = await getStore()
        await store.delete(storeKey + key)
        await store.save()
      } catch (error) {
        console.error(`[Plugin:${pluginName}] Storage delete error:`, error)
      }
    },

    async clear(): Promise<void> {
      try {
        const store = await getStore()
        const keys = await store.keys()
        const pluginKeys = keys.filter((k) => k.startsWith(storeKey))
        for (const key of pluginKeys) {
          await store.delete(key)
        }
        await store.save()
      } catch (error) {
        console.error(`[Plugin:${pluginName}] Storage clear error:`, error)
      }
    },

    async keys(): Promise<string[]> {
      try {
        const store = await getStore()
        const allKeys = await store.keys()
        return allKeys
          .filter((k) => k.startsWith(storeKey))
          .map((k) => k.slice(storeKey.length))
      } catch (error) {
        console.error(`[Plugin:${pluginName}] Storage keys error:`, error)
        return []
      }
    },
  }
}