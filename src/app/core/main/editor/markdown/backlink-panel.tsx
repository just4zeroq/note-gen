/**
 * 反链面板组件
 *
 * 显示引用当前文档/块的所有反向链接
 */

import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { FileText, Link2, ExternalLink, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface Backlink {
  block_id: string
  root_id: string
  root_title: string
  content: string
  context: string
  link_type: 'doc' | 'block' | 'embed'
  position: number
}

interface BacklinkPanelProps {
  docId: string
  isOpen: boolean
  onClose: () => void
  onNavigate?: (docId: string, blockId?: string) => void
}

export function BacklinkPanel({
  docId,
  isOpen,
  onClose,
  onNavigate,
}: BacklinkPanelProps) {
  const t = useTranslations('editor')
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载反链数据
  useEffect(() => {
    if (!isOpen || !docId) {
      return
    }

    async function loadBacklinks() {
      setLoading(true)
      setError(null)

      try {
        const result = await invoke<Backlink[]>('get_backlinks', {
          docId: docId,
        })
        setBacklinks(result)
      } catch (err) {
        console.error('[BacklinkPanel] Failed to load backlinks:', err)
        setError(String(err))
        // 使用模拟数据
        setBacklinks([
          {
            block_id: 'block-1',
            root_id: 'doc-1',
            root_title: '学习笔记',
            content: '[[Python入门]]',
            context: '这是我的学习笔记，记录了关于 Python 的学习内容...',
            link_type: 'doc',
            position: 0,
          },
          {
            block_id: 'block-2',
            root_id: 'doc-2',
            root_title: 'JavaScript高级',
            content: '((block-ref-1))',
            context: '参考了((block-ref-1))中提到的内容...',
            link_type: 'block',
            position: 0,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadBacklinks()
  }, [docId, isOpen])

  // 处理点击跳转
  const handleBacklinkClick = (backlink: Backlink) => {
    if (onNavigate) {
      onNavigate(backlink.root_id, backlink.block_id)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="backlink-panel">
      <div className="backlink-panel-header">
        <h3 className="backlink-panel-title">
          {t('backlinks') || '反链'}
          <span className="backlink-panel-count">({backlinks.length})</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="backlink-panel-close"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="backlink-panel-content">
        {loading && (
          <div className="backlink-panel-loading">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>加载中...</span>
          </div>
        )}

        {error && !loading && (
          <div className="backlink-panel-error">
            加载失败: {error}
          </div>
        )}

        {!loading && !error && backlinks.length === 0 && (
          <div className="backlink-panel-empty">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <p>暂无反链</p>
            <p className="text-sm text-muted-foreground">
              其他文档引用此文档时，将显示在这里
            </p>
          </div>
        )}

        {!loading && !error && backlinks.length > 0 && (
          <div className="backlink-panel-list">
            {backlinks.map((backlink, index) => (
              <div
                key={`${backlink.root_id}-${backlink.block_id}-${index}`}
                className="backlink-panel-item"
                onClick={() => handleBacklinkClick(backlink)}
              >
                <div className="backlink-panel-item-header">
                  <div className="backlink-panel-item-icon">
                    {backlink.link_type === 'block' ? (
                      <Link2 className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <span className="backlink-panel-item-title">
                    {backlink.root_title}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </div>
                <div className="backlink-panel-item-content">
                  <span className="backlink-panel-item-ref">
                    {backlink.content}
                  </span>
                  {backlink.context && (
                    <p className="backlink-panel-item-context">
                      {backlink.context}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 独立的侧边栏面板组件
interface BacklinkSidebarProps {
  docId: string
}

export function BacklinkSidebar({ docId }: BacklinkSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <BacklinkPanel
      docId={docId}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  )
}

export default BacklinkPanel