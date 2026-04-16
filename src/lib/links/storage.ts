/**
 * 引用存储服务
 *
 * 处理双向链接的解析、存储和查询
 */

import { parseAllRefs } from './extensions'
import { saveDocRefs as tauriSaveDocRefs, getForwardLinks as tauriGetForwardLinks, getBacklinks as tauriGetBacklinks, getLinkStats as tauriGetLinkStats, searchRefs as tauriSearchRefs } from './tauri'
import { getFilePathOptions } from '@/lib/workspace'
import { exists } from '@tauri-apps/plugin-fs'

// ==================== 类型定义 ====================

export interface Ref {
  id: string
  defBlockId: string       // 被引用的块/文档 ID
  defBlockRootId: string   // 被引用块的根文档 ID
  blockId: string          // 引用块 ID
  rootId: string           // 源文档 ID
  content: string          // 引用文本
  alias?: string           // 别名
  type: 'doc' | 'block' | 'embed'
  createdAt: number
  updatedAt: number
}

export interface Backlink {
  blockId: string          // 引用块 ID
  rootId: string           // 源文档 ID
  rootTitle: string        // 源文档标题
  content: string          // 引用内容片段
  context: string          // 上下文 (前后各 N 个字符)
  type: 'doc' | 'block' | 'embed'
  position: number         // 在文档中的位置
}

export interface LinkStats {
  forwardCount: number     // 正向链接数
  backlinkCount: number    // 反向链接数
  totalCount: number       // 总链接数
}

// 使用 Tauri 后端或回退到内存存储
const USE_TAURI = true

// ==================== 存储服务 ====================

/**
 * 从文档内容中解析所有引用
 */
export function extractRefs(docId: string, content: string): Omit<Ref, 'id' | 'createdAt' | 'updatedAt'>[] {
  const parsed = parseAllRefs(content)
  const refs: Omit<Ref, 'id' | 'createdAt' | 'updatedAt'>[] = []
  const now = Date.now()

  // 获取当前文档的根 ID (简化处理，使用 docId)
  const rootId = docId

  for (const p of parsed) {
    // 生成唯一引用 ID
    const refId = `${docId}-${p.type}-${p.id}-${p.start}`

    refs.push({
      defBlockId: p.id,
      defBlockRootId: '', // 需要通过查询填充
      blockId: refId,
      rootId: docId,
      content: p.id,
      alias: p.alias,
      type: p.type,
    })
  }

  return refs
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== 模拟存储 ====================

// 内存存储 (实际项目中应使用 SQLite)
const refsStore = new Map<string, Ref>()
const docsStore = new Map<string, { id: string; title: string; content: string }>()

/**
 * 保存文档的引用
 *
 * @param docId 文档 ID
 * @param title 文档标题
 * @param content 文档内容
 */
export async function saveDocRefs(docId: string, title: string, content: string): Promise<void> {
  if (USE_TAURI) {
    try {
      await tauriSaveDocRefs(docId, title, content)
    } catch (e) {
      console.warn('[Links] Tauri backend unavailable, using memory storage:', e)
      // 回退到内存存储
      await saveDocRefsMemory(docId, title, content)
    }
  } else {
    await saveDocRefsMemory(docId, title, content)
  }
}

// 内存存储实现
async function saveDocRefsMemory(docId: string, title: string, content: string): Promise<void> {
  // 存储文档基本信息
  docsStore.set(docId, { id: docId, title, content })

  // 删除旧的引用
  const oldRefs = Array.from(refsStore.values()).filter(r => r.rootId === docId)
  for (const ref of oldRefs) {
    refsStore.delete(ref.id)
  }

  // 解析并保存新引用
  const parsed = parseAllRefs(content)
  const now = Date.now()

  for (const p of parsed) {
    // 验证引用目标是否存在
    let refExists = false

    if (p.type === 'doc') {
      // 文档引用：检查 .md 文件是否存在
      const docPath = p.id.endsWith('.md') ? p.id : `${p.id}.md`
      try {
        const pathOptions = await getFilePathOptions(docPath)
        refExists = await exists(pathOptions.path, pathOptions.baseDir ? { baseDir: pathOptions.baseDir } : {})
      } catch {
        refExists = false
      }
    } else {
      // 块引用和嵌入块：暂不验证
      refExists = true
    }

    // 只保存存在的引用
    if (refExists) {
      const ref: Ref = {
        id: `${docId}-${p.type}-${p.id}-${p.start}`,
        defBlockId: p.id,
        defBlockRootId: docId,
        blockId: docId,
        rootId: docId,
        content: p.id,
        alias: p.alias,
        type: p.type,
        createdAt: now,
        updatedAt: now,
      }
      refsStore.set(ref.id, ref)
    }
  }
}

/**
 * 获取正向链接 (我引用的)
 */
export async function getForwardLinks(docId: string): Promise<Ref[]> {
  if (USE_TAURI) {
    try {
      const result = await tauriGetForwardLinks(docId)
      return result.map(r => ({
        id: r.id,
        defBlockId: r.def_block_id,
        defBlockRootId: r.def_block_root_id,
        blockId: r.block_id,
        rootId: r.root_id,
        content: r.content,
        alias: r.alias,
        type: r.link_type as 'doc' | 'block' | 'embed',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    } catch {
      return Array.from(refsStore.values()).filter(r => r.rootId === docId)
    }
  }
  return Array.from(refsStore.values()).filter(r => r.rootId === docId)
}

/**
 * 获取反向链接 (引用我的)
 */
export async function getBacklinks(docId: string): Promise<Backlink[]> {
  if (USE_TAURI) {
    try {
      const result = await tauriGetBacklinks(docId)
      return result.map(r => ({
        blockId: r.block_id,
        rootId: r.root_id,
        rootTitle: r.root_title,
        content: r.content,
        context: r.context,
        type: r.link_type as 'doc' | 'block' | 'embed',
        position: r.position,
      }))
    } catch {
      return getBacklinksMemory(docId)
    }
  }
  return getBacklinksMemory(docId)
}

function getBacklinksMemory(docId: string): Backlink[] {
  const backlinks: Backlink[] = []

  const docRefs = Array.from(refsStore.values()).filter(
    r => r.type === 'doc' && r.content === docId
  )

  for (const ref of docRefs) {
    const sourceDoc = docsStore.get(ref.rootId)
    backlinks.push({
      blockId: ref.blockId,
      rootId: ref.rootId,
      rootTitle: sourceDoc?.title || '未知文档',
      content: `[[${ref.content}]]`,
      context: getContext(sourceDoc?.content || '', ref.blockId),
      type: ref.type,
      position: 0,
    })
  }

  const blockRefs = Array.from(refsStore.values()).filter(
    r => r.type === 'block' && r.defBlockId === docId
  )

  for (const ref of blockRefs) {
    const sourceDoc = docsStore.get(ref.rootId)
    backlinks.push({
      blockId: ref.blockId,
      rootId: ref.rootId,
      rootTitle: sourceDoc?.title || '未知文档',
      content: `(${ref.content})`,
      context: getContext(sourceDoc?.content || '', ref.blockId),
      type: ref.type,
      position: 0,
    })
  }

  return backlinks
}

/**
 * 获取链接统计
 */
export async function getLinkStats(docId: string): Promise<LinkStats> {
  if (USE_TAURI) {
    try {
      const result = await tauriGetLinkStats(docId)
      return {
        forwardCount: result.forward_count,
        backlinkCount: result.backlink_count,
        totalCount: result.total_count,
      }
    } catch {
      // 回退到内存
      const forward = Array.from(refsStore.values()).filter(r => r.rootId === docId)
      const backlink = getBacklinksMemory(docId)
      return {
        forwardCount: forward.length,
        backlinkCount: backlink.length,
        totalCount: forward.length + backlink.length,
      }
    }
  }
  const forward = Array.from(refsStore.values()).filter(r => r.rootId === docId)
  const backlink = getBacklinksMemory(docId)
  return {
    forwardCount: forward.length,
    backlinkCount: backlink.length,
    totalCount: forward.length + backlink.length,
  }
}

/**
 * 获取上下文 (前后各 N 个字符)
 */
function getContext(content: string, blockId: string, contextLen: number = 50): string {
  // 简化实现: 找到引用位置并提取上下文
  const refPattern = `(${blockId}|${blockId}*\\w+)`
  const regex = new RegExp(refPattern)
  const match = content.match(regex)

  if (!match) {
    // 返回内容前 100 个字符
    return content.slice(0, 100)
  }

  const index = match.index || 0
  const start = Math.max(0, index - contextLen)
  const end = Math.min(content.length, index + contextLen + match[0].length)

  let context = content.slice(start, end)
  if (start > 0) context = '...' + context
  if (end < content.length) context = context + '...'

  return context
}

/**
 * 搜索文档/块 (用于引用建议)
 */
export async function searchRefs(query: string, limit: number = 10): Promise<Array<{
  id: string
  title: string
  type: 'doc' | 'block'
  preview: string
}>> {
  if (USE_TAURI) {
    try {
      const result = await tauriSearchRefs(query, limit)
      return result.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        preview: r.preview,
      }))
    } catch {
      return searchRefsMemory(query, limit)
    }
  }
  return searchRefsMemory(query, limit)
}

function searchRefsMemory(query: string, limit: number): Array<{
  id: string
  title: string
  type: 'doc' | 'block'
  preview: string
}> {
  const results: Array<{
    id: string
    title: string
    type: 'doc' | 'block'
    preview: string
  }> = []

  const docRegex = new RegExp(query, 'i')
  for (const [id, doc] of docsStore) {
    if (docRegex.test(doc.title)) {
      results.push({
        id: doc.id,
        title: doc.title,
        type: 'doc',
        preview: doc.content.slice(0, 50),
      })
    }
    if (results.length >= limit) break
  }

  for (const [id, ref] of refsStore) {
    if (ref.type === 'block' && docRegex.test(ref.content)) {
      const sourceDoc = docsStore.get(ref.rootId)
      results.push({
        id: ref.defBlockId,
        title: `${sourceDoc?.title || '未知'} - ${ref.content.slice(0, 20)}`,
        type: 'block',
        preview: ref.alias || ref.content,
      })
    }
    if (results.length >= limit) break
  }

  return results.slice(0, limit)
}

/**
 * 通过名称获取文档 ID
 */
export function getDocIdByName(name: string): string | null {
  for (const [id, doc] of docsStore) {
    if (doc.title === name || id === name) {
      return id
    }
  }
  return null
}

/**
 * 通过 ID 获取文档
 */
export function getDocById(id: string): { id: string; title: string; content: string } | null {
  return docsStore.get(id) || null
}

// ==================== 初始化测试数据 ====================

export function initTestData() {
  // 添加测试文档
  docsStore.set('doc-1', {
    id: 'doc-1',
    title: '学习笔记',
    content: '这是我的学习笔记，记录了关于 #Python 的学习内容。参考了 [[Python入门]] 和 [[JavaScript高级]]。'
  })

  docsStore.set('doc-2', {
    id: 'doc-2',
    title: 'Python入门',
    content: 'Python 是一种简单易学的编程语言。适合初学者入门。((block-ref-1))'
  })

  docsStore.set('doc-3', {
    id: 'doc-3',
    title: 'JavaScript高级',
    content: 'JavaScript 是 Web 开发的核心语言。'
  })

  // 添加引用
  const now = Date.now()

  // doc-1 引用了 doc-2 和 doc-3
  refsStore.set('ref-1', {
    id: 'ref-1',
    defBlockId: 'doc-2',
    defBlockRootId: 'doc-2',
    blockId: 'doc-1',
    rootId: 'doc-1',
    content: 'doc-2',
    type: 'doc',
    createdAt: now,
    updatedAt: now,
  })

  refsStore.set('ref-2', {
    id: 'ref-2',
    defBlockId: 'doc-3',
    defBlockRootId: 'doc-3',
    blockId: 'doc-1',
    rootId: 'doc-1',
    content: 'doc-3',
    type: 'doc',
    createdAt: now,
    updatedAt: now,
  })

  console.log('[Links] Test data initialized')
}

// 初始化测试数据
initTestData()