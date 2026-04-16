/**
 * 引用存储 Tauri 桥接
 *
 * 提供前端调用 Tauri 后端命令的接口
 */

import { invoke } from '@tauri-apps/api/core'

// 引用类型
export interface Ref {
  id: string
  def_block_id: string
  def_block_root_id: string
  block_id: string
  root_id: string
  content: string
  alias?: string
  link_type: 'doc' | 'block' | 'embed'
  created_at: number
  updated_at: number
}

// 反链
export interface Backlink {
  block_id: string
  root_id: string
  root_title: string
  content: string
  context: string
  link_type: 'doc' | 'block' | 'embed'
  position: number
}

// 链接统计
export interface LinkStats {
  forward_count: number
  backlink_count: number
  total_count: number
}

// 搜索结果
export interface SearchResult {
  id: string
  title: string
  type: 'doc' | 'block'
  preview: string
}

/**
 * 保存文档的引用
 */
export async function saveDocRefs(
  docId: string,
  docTitle: string,
  content: string
): Promise<void> {
  await invoke('save_doc_refs', {
    docId,
    docTitle,
    content,
  })
}

/**
 * 获取正向链接 (我引用的)
 */
export async function getForwardLinks(docId: string): Promise<Ref[]> {
  return await invoke('get_forward_links', { docId })
}

/**
 * 获取反向链接 (引用我的)
 */
export async function getBacklinks(docId: string): Promise<Backlink[]> {
  return await invoke('get_backlinks', { docId })
}

/**
 * 获取链接统计
 */
export async function getLinkStats(docId: string): Promise<LinkStats> {
  return await invoke('get_link_stats', { docId })
}

/**
 * 搜索引用
 */
export async function searchRefs(
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  return await invoke('search_refs', { query, limit })
}