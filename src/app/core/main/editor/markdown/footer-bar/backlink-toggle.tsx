'use client'

import { Editor } from '@tiptap/react'
import { Link2, Link2Icon } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BacklinkToggleProps {
  editor: Editor
  backlinkOpen?: boolean
  onToggleBacklink?: () => void
}

export function BacklinkToggle({
  editor,
  backlinkOpen,
  onToggleBacklink,
}: BacklinkToggleProps) {
  const t = useTranslations('editor')

  if (!editor) return null

  return (
    <button
      onClick={onToggleBacklink}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[hsl(var(--muted))] transition-colors"
      title={backlinkOpen ? '关闭反链' : '打开反链'}
    >
      <Link2 size={14} />
      <span>反链</span>
    </button>
  )
}

export default BacklinkToggle