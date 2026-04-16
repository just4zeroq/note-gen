/**
 * 文件系统 API 实现
 */

import { invoke } from '@tauri-apps/api/core'
import type { FileSystemAPI, FileInfo } from '../types'

/**
 * 创建文件系统 API
 */
export function createFileSystemAPI(): FileSystemAPI {
  return {
    async readFile(path: string): Promise<string> {
      try {
        const content = await invoke<string>('read_file', { path })
        return content
      } catch (error) {
        console.error('[Plugin FS] Read file error:', error)
        throw error
      }
    },

    async writeFile(path: string, content: string): Promise<void> {
      try {
        await invoke('write_file', { path, content })
      } catch (error) {
        console.error('[Plugin FS] Write file error:', error)
        throw error
      }
    },

    async deleteFile(path: string): Promise<void> {
      try {
        await invoke('remove_file', { path })
      } catch (error) {
        console.error('[Plugin FS] Delete file error:', error)
        throw error
      }
    },

    async readDir(path: string): Promise<FileInfo[]> {
      try {
        const files = await invoke<string[]>('list_dir', { path })
        return files.map((name) => ({
          path: `${path}/${name}`,
          name,
        }))
      } catch (error) {
        console.error('[Plugin FS] Read dir error:', error)
        return []
      }
    },

    async exists(path: string): Promise<boolean> {
      try {
        const result = await invoke<boolean>('file_exists', { path })
        return result
      } catch (error) {
        return false
      }
    },
  }
}