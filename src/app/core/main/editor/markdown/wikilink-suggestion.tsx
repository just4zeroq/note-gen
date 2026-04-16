/**
 * WikiLink 建议组件
 *
 * 当用户输入 [[ 或 (( 时显示建议列表
 */

import { useState, useEffect, useCallback } from 'react'
import { SuggestionProps } from '@tiptap/suggestion'
import { Editor, type Range } from '@tiptap/core'
import { searchRefs } from '@/lib/links/storage'
import { FileText, Link2, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WikiLinkItem {
  id: string
  title: string
  type: 'doc' | 'block'
  preview?: string
}

interface WikiLinkSuggestionProps {
  items: WikiLinkItem[]
  command: (props: { editor: Editor; range: Range; props: { id: string; text: string; type: 'doc' | 'block' } }) => void
  query: string
  range: Range
  editor: Editor
}

// 解析查询类型
function getSuggestionType(query: string): 'doc' | 'block' | 'embed' | 'all' {
  if (query.startsWith('(')) return 'block'
  if (query.startsWith('{')) return 'embed'
  if (query.includes('[[')) return 'doc'
  return 'all'
}

export function WikiLinkSuggestionList({
  items,
  command,
  query,
  range,
  editor,
}: WikiLinkSuggestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // 重置选择状态当项目变化时
  useEffect(() => {
    setSelectedIndex(0)
  }, [items.length])

  // 键盘导航
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => {
          const len = items.length
          return len > 0 ? (prev + len - 1) % len : 0
        })
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => {
          const len = items.length
          return len > 0 ? (prev + 1) % len : 0
        })
        return true
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex]
        if (item) {
          executeCommand(item, editor, range)
          return true
        }
      }
      return false
    },
    [items, selectedIndex, editor, range]
  )

  // 监听键盘事件
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // 执行命令
  const executeCommand = (
    item: WikiLinkItem,
    editor: Editor,
    range: Range
  ) => {
    const { id, title, type } = item

    // 根据类型选择正确的语法
    let syntax: string
    if (type === 'block') {
      syntax = `((${id}))`
    } else if (type === 'doc') {
      syntax = `[[${title}]]`
    } else {
      syntax = `[[${title}]]`
    }

    // 替换输入范围的内容
    editor.chain().focus().deleteRange(range).insertContent(syntax).run()
  }

  if (items.length === 0) {
    return (
      <div className="wikilink-suggestion wikilink-suggestion-empty">
        <div className="p-3 text-sm text-muted-foreground">
          暂无匹配结果
        </div>
      </div>
    )
  }

  return (
    <div className="wikilink-suggestion">
      <div className="wikilink-suggestion-header">
        <span className="text-xs text-muted-foreground">选择引用目标</span>
      </div>
      <div className="wikilink-suggestion-list">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              'wikilink-suggestion-item',
              index === selectedIndex && 'selected'
            )}
            onClick={() => executeCommand(item, editor, range)}
          >
            <div className="wikilink-suggestion-icon">
              {item.type === 'doc' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
            </div>
            <div className="wikilink-suggestion-content">
              <div className="wikilink-suggestion-title">{item.title}</div>
              {item.preview && (
                <div className="wikilink-suggestion-preview">{item.preview}</div>
              )}
            </div>
            <div className="wikilink-suggestion-action">
              <CornerDownLeft className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
      <div className="wikilink-suggestion-footer">
        <span className="text-xs text-muted-foreground">
          ↑↓ 选择 • Enter 确认 • Esc 关闭
        </span>
      </div>
    </div>
  )
}

// WikiLink Suggestion 配置
export const wikiLinkSuggestion = {
  // 搜索项目
  items: async ({ query }: { query: string }) => {
    // 解析查询，提取实际搜索词
    let searchQuery = query

    // 处理各种输入格式
    if (query.startsWith('[[')) {
      searchQuery = query.slice(2)
    } else if (query.startsWith('((')) {
      searchQuery = query.slice(2)
    } else if (query.startsWith('{{(')) {
      searchQuery = query.slice(3)
    }

    // 移除末尾可能的部分闭合
    searchQuery = searchQuery.replace(/[*|>].*$/, '')

    if (!searchQuery.trim()) {
      // 如果没有搜索词，返回最近文档
      return [
        { id: 'doc-1', title: '学习笔记', type: 'doc' as const, preview: '我的学习笔记...' },
        { id: 'doc-2', title: 'Python入门', type: 'doc' as const, preview: 'Python 是一种...' },
        { id: 'doc-3', title: 'JavaScript高级', type: 'doc' as const, preview: 'JavaScript 是...' },
      ]
    }

    // 搜索文档和块
    const results = await searchRefs(searchQuery, 10)
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      preview: r.preview,
    }))
  },

  // 渲染建议列表
  render: () => {
    let component: any
    let popup: any

    return {
      onStart: (props: SuggestionProps) => {
        const rect = props.clientRect
        const clientRect = typeof rect === 'function' ? rect() : rect
        if (!clientRect) {
          return
        }

        const items = props.items as WikiLinkItem[]
        const query = props.query || ''

        // 创建建议列表容器
        const wrapper = document.createElement('div')
        wrapper.className = 'wikilink-suggestion-wrapper'
        wrapper.style.position = 'absolute'
        wrapper.style.left = `${clientRect.left}px`
        wrapper.style.top = `${clientRect.bottom + 4}px`
        wrapper.style.zIndex = '1000'

        // 渲染 React 组件
        import('react').then((React) => {
          import('react-dom/client').then((ReactDOM) => {
            const root = ReactDOM.createRoot(wrapper)
            root.render(
              React.createElement(WikiLinkSuggestionList, {
                items,
                command: props.command,
                query,
                range: props.range,
                editor: props.editor,
              })
            )
            ;(wrapper as any).__root = root
          })
        })

        document.body.appendChild(wrapper)
        component = wrapper

        // 使用 tippy 显示
        import('tippy.js').then((tippyModule) => {
          const tippy = tippyModule.default || tippyModule
          popup = tippy('body', {
            getReferenceClientRect: () => clientRect,
            appendTo: () => document.body,
            content: wrapper,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        })
      },

      onUpdate: (props: SuggestionProps) => {
        const rect = props.clientRect
        const clientRect = typeof rect === 'function' ? rect() : rect
        if (!clientRect || !component) {
          return
        }

        // 更新位置
        component.style.left = `${clientRect.left}px`
        component.style.top = `${clientRect.bottom + 4}px`

        // 更新内容
        const items = props.items as WikiLinkItem[]
        const query = props.query || ''

        if ((component as any).__root) {
          import('react').then((React) => {
            import('react-dom/client').then((ReactDOM) => {
              const root = (component as any).__root
              root.render(
                React.createElement(WikiLinkSuggestionList, {
                  items,
                  command: props.command,
                  query,
                  range: props.range,
                  editor: props.editor,
                })
              )
            })
          })
        }

        if (popup) {
          popup[0].setProps({
            getReferenceClientRect: () => clientRect,
          })
        }
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          if (popup) {
            popup[0].hide()
          }
          return true
        }
        return false
      },

      onExit: () => {
        if (popup) {
          popup[0].destroy()
        }
        if (component) {
          if ((component as any).__root) {
            ;(component as any).__root.unmount()
          }
          component.remove()
        }
      },
    }
  },
}

export default wikiLinkSuggestion