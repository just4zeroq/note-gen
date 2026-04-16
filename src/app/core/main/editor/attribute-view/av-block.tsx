/**
 * 属性视图块扩展
 *
 * 在编辑器中插入属性视图块
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react'

export interface AVBlockOptions {
  HTMLAttributes: Record<string, any>
  avId?: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    avBlock: {
      insertAVBlock: (options: { avId: string }) => ReturnType
    }
  }
}

export const AVBlock = Node.create<AVBlockOptions>({
  name: 'avBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      avId: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-av-block]',
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-av-block': '',
        'data-av-id': node.attrs.avId,
      }),
    ]
  },

  addCommands() {
    return {
      insertAVBlock:
        (options: { avId: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              avId: options.avId,
            },
          })
        },
    }
  },
})

/**
 * 属性视图块渲染组件
 */
export function AVBlockView({ node }: ReactNodeViewProps) {
  const avId = node.attrs.avId as string

  return (
    <NodeViewWrapper className="av-block">
      <div className="av-block-container border rounded-lg overflow-hidden">
        {/* 如果有 avId，渲染属性视图 */}
        {avId ? (
          <div className="av-block-content">
            {/* 属性视图内容会通过客户端组件加载 */}
            <div className="p-4 text-center text-muted-foreground">
              属性视图加载中...
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              点击创建属性视图
            </p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => {
                // 触发创建属性视图
              }}
            >
              创建属性视图
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

/**
 * 创建属性视图块扩展
 */
export function createAVBlockExtension() {
  return AVBlock.extend({
    addNodeView() {
      return ReactNodeViewRenderer(AVBlockView)
    },
  }).configure({
    HTMLAttributes: {
      class: 'av-block',
    },
  })
}

export default AVBlock