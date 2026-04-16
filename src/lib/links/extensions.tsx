/**
 * WikiLink Tiptap 扩展
 *
 * 支持的语法:
 * - [[文档名]] - 文档引用
 * - [[文档名|别名]] - 带别名的文档引用
 * - ((块ID)) - 块引用
 * - ((块ID*别名)) - 带别名的块引用
 * - {{(块ID)}} - 嵌入块
 */

import { Node, mergeAttributes, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { InputRule, PasteRule } from '@tiptap/core'
import { Suggestion, SuggestionPluginKey } from '@tiptap/suggestion'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { exists } from '@tauri-apps/plugin-fs'
import { getFilePathOptions, getWorkspacePath } from '@/lib/workspace'

// 文档引用正则 [[name]] 或 [[name|alias]]
const DOC_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/

// 块引用正则 ((id)) 或 ((id*alias))
const BLOCK_REF_REGEX = /\(\(([^)]+)\)\)$/

// 嵌入块正则 {{(id)}}
const EMBED_BLOCK_REGEX = /\{\{\(([^)]+)\)\}\}$/

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>
  suggestion?: any
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (options: { id: string; text: string; type: 'doc' | 'block' | 'embed' }) => ReturnType
    }
  }
}

// 查找文档引用匹配
function findDocLinkMatch(props: { state: any; from: number; to: number }) {
  const { state, from } = props
  const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, ' ')
  const match = textBefore.match(/\[\[([^\]|]*)$/)
  if (!match) return null
  return {
    from: from - match[0].length,
    to: from,
  }
}

// 查找块引用匹配
function findBlockRefMatch(props: { state: any; from: number; to: number }) {
  const { state, from } = props
  const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, ' ')
  const match = textBefore.match(/\(\(([^)]*)$/)
  if (!match) return null
  return {
    from: from - match[0].length,
    to: from,
  }
}

// 查找嵌入块匹配
function findEmbedBlockMatch(props: { state: any; from: number; to: number }) {
  const { state, from } = props
  const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, ' ')
  const match = textBefore.match(/\{\{\(([^)]*)$/)
  if (!match) return null
  return {
    from: from - match[0].length,
    to: from,
  }
}

/**
 * 文档链接节点
 */
export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikiLink',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id,
        }),
      },
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-text'),
        renderHTML: (attributes) => ({
          'data-text': attributes.text,
        }),
      },
      type: {
        default: 'doc',
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
      alias: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alias'),
        renderHTML: (attributes) => ({
          'data-alias': attributes.alias,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
      },
    ]
  },

  renderHTML({ node }) {
    const type = node.attrs.type || 'doc'
    const text = node.attrs.alias || node.attrs.text || node.attrs.id || ''
    const className = type === 'embed' ? 'wikilink wikilink-embed' : 'wikilink'

    if (type === 'embed') {
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, {
          'data-wikilink': '',
          'data-type': 'embed',
          'data-id': node.attrs.id,
          class: className,
        }),
        node.attrs.text || '🔗',
      ]
    }

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-wikilink': '',
        'data-type': type,
        'data-id': node.attrs.id,
        class: className,
      }),
      text,
    ]
  },

  addCommands() {
    return {
      insertWikiLink:
        (options: { id: string; text: string; type: 'doc' | 'block' | 'embed' }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: options.id,
              text: options.text,
              type: options.type,
            },
          })
        },
    }
  },

  addInputRules() {
    const nodeType = this.type
    return [
      // 文档引用 [[name]] 或 [[name|alias]]
      new InputRule({
        find: DOC_LINK_REGEX,
        handler: ({ state, range, match }: { state: any; range: any; match: any[] }) => {
          const fullMatch = match[0]
          const name = match[1].trim()
          const alias = match[2]?.trim() || name

          // 创建节点
          const node = nodeType.create({
            id: name,
            text: name,
            alias: alias,
            type: 'doc',
          })

          // 替换文本
          state.tr.replaceWith(range.from - fullMatch.length, range.to, node)
        },
      }),

      // 块引用 ((id)) 或 ((id*alias))
      new InputRule({
        find: BLOCK_REF_REGEX,
        handler: ({ state, range, match }: { state: any; range: any; match: any[] }) => {
          const fullMatch = match[0]
          const content = match[1]
          const [id, ...aliasParts] = content.split('*')
          const alias = aliasParts.join('*') || id

          const node = nodeType.create({
            id: id.trim(),
            text: id.trim(),
            alias: alias.trim(),
            type: 'block',
          })

          state.tr.replaceWith(range.from - fullMatch.length, range.to, node)
        },
      }),

      // 嵌入块 {{(id)}}
      new InputRule({
        find: EMBED_BLOCK_REGEX,
        handler: ({ state, range, match }: { state: any; range: any; match: any[] }) => {
          const fullMatch = match[0]
          const blockId = match[1].trim()

          const node = nodeType.create({
            id: blockId,
            text: '',
            type: 'embed',
          })

          state.tr.replaceWith(range.from - fullMatch.length, range.to, node)
        },
      }),
    ]
  },

  addPasteRules() {
    const nodeType = this.type
    return [
      // 粘贴时识别工作区内的 Markdown 链接并转换为 WikiLink
      new PasteRule({
        find: /\[([^\]]+)\]\(([^)]+)\)/g,
        handler: ({ state, range, match }: { state: any; range: any; match: any[] }) => {
          const linkText = match[1]
          const linkPath = match[2]

          // 跳过外部链接
          if (linkPath.startsWith('http://') || linkPath.startsWith('https://') ||
              linkPath.startsWith('file://') || linkPath.startsWith('mailto:') || linkPath.startsWith('tel:')) {
            return
          }

          // 标准化路径
          let relativePath = linkPath
            .replace(/^\.\//, '')
            .replace(/^\//, '')

          // 如果没有 .md 后缀，添加后缀
          if (!relativePath.endsWith('.md')) {
            relativePath = relativePath + '.md'
          }

          // 提取文档名
          const docName = relativePath.replace(/\.md$/, '')

          // 创建 WikiLink 节点
          const node = nodeType.create({
            id: docName,
            text: linkText || docName,
            alias: linkText || undefined,
            type: 'doc',
          })

          // 替换为 WikiLink
          state.tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLink'),

        props: {
          handleClickOn: (view: any, pos: number, node: any, nodePos: number, event: MouseEvent, direct: boolean) => {
            const dom = view.domAtPos(pos)
            if (dom.node instanceof Element) {
              const target = dom.node.closest('[data-wikilink]')
              if (target) {
                const id = target.getAttribute('data-id')
                const type = target.getAttribute('data-type')

                // 如果是嵌入块，不跳转
                if (type === 'embed') {
                  return true
                }

                // 跳转到对应页面/块 - 发送自定义事件
                window.dispatchEvent(new CustomEvent('wikilink-navigate', {
                  detail: { id, type }
                }))

                return true
              }
            }
            return false
          },

          handleDoubleClickOn: (view: any, pos: number, node: any, nodePos: number, event: MouseEvent, direct: boolean) => {
            const dom = view.domAtPos(pos)
            if (dom.node instanceof Element) {
              const target = dom.node.closest('[data-wikilink]')
              if (target) {
                const id = target.getAttribute('data-id')
                const type = target.getAttribute('data-type')

                // 双击编辑引用 - 发送自定义事件
                window.dispatchEvent(new CustomEvent('wikilink-edit', {
                  detail: { id, type, pos }
                }))

                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

// WikiLink 扩展 - 包含 Suggestion 支持
export const WikiLinkExtension = Extension.create({
  name: 'wikiLinkExtension',

  addOptions() {
    return {
      suggestion: {
        char: '[',
        pluginKey: new PluginKey('wikiLinkSuggestion'),
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          // 执行插入命令
          const { id, type } = props
          let content = ''
          if (type === 'block') {
            content = `((${id}))`
          } else if (type === 'embed') {
            content = `{{(${id})}}`
          } else {
            content = `[[${id}]]`
          }
          editor.chain().focus().deleteRange(range).insertContent(content).run()
        },
      },
    }
  },

  addProseMirrorPlugins() {
    const suggestion = this.options.suggestion as any

    return [
      Suggestion({
        editor: this.editor,
        char: suggestion.char,
        pluginKey: suggestion.pluginKey,
        findSuggestionMatch: (props: any) => {
          // 尝试三种匹配
          return findDocLinkMatch(props) || findBlockRefMatch(props) || findEmbedBlockMatch(props)
        },
        ...suggestion,
      }),
    ]
  },
})

/**
 * 创建完整的 WikiLink 扩展配置
 */
export function createWikiLinkExtension() {
  return [
    WikiLink,
    WikiLinkExtension.configure({
      suggestion: {},
    }),
  ]
}

/**
 * 解析文本中的所有引用
 */
export function parseAllRefs(text: string): Array<{
  type: 'doc' | 'block' | 'embed'
  id: string
  alias?: string
  fullMatch: string
  start: number
  end: number
}> {
  const refs: Array<{
    type: 'doc' | 'block' | 'embed'
    id: string
    alias?: string
    fullMatch: string
    start: number
    end: number
  }> = []

  // 文档引用
  let match
  const docRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  while ((match = docRegex.exec(text)) !== null) {
    refs.push({
      type: 'doc',
      id: match[1].trim(),
      alias: match[2]?.trim(),
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // 块引用
  const blockRegex = /\(\(([^)]+)\)\)/g
  while ((match = blockRegex.exec(text)) !== null) {
    const content = match[1]
    const [id, ...aliasParts] = content.split('*')
    refs.push({
      type: 'block',
      id: id.trim(),
      alias: aliasParts.join('*').trim() || undefined,
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // 嵌入块
  const embedRegex = /\{\{\(([^)]+)\)\}\}/g
  while ((match = embedRegex.exec(text)) !== null) {
    refs.push({
      type: 'embed',
      id: match[1].trim(),
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  // 按位置排序
  return refs.sort((a, b) => a.start - b.start)
}

export default WikiLink