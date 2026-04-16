/**
 * 编辑器 API 实现
 */

import type { EditorAPI, EditorCommand, SlashCommand } from '../types'

// 编辑器事件回调存储
const editorCallbacks = {
  ready: [] as ((editor: any) => void)[],
  change: [] as ((content: string) => void)[],
  selectionChange: [] as ((selection: any) => void)[],
}

// 存储的命令
const registeredCommands = new Map<string, EditorCommand>()
const registeredSlashCommands = new Map<string, SlashCommand>()

/**
 * 创建编辑器 API
 */
export function createEditorAPI(): EditorAPI {
  return {
    getCurrentEditor() {
      // TODO: 从编辑器 store 获取当前编辑器实例
      return null
    },

    getContent() {
      const editor = this.getCurrentEditor()
      if (!editor) return ''
      return editor.getMarkdown?.() || ''
    },

    getHTML() {
      const editor = this.getCurrentEditor()
      if (!editor) return ''
      return editor.getHTML?.() || ''
    },

    getJSON() {
      const editor = this.getCurrentEditor()
      if (!editor) return {}
      return editor.getJSON?.() || {}
    },

    insertContent(content: string, position: 'cursor' | 'start' | 'end' = 'cursor') {
      const editor = this.getCurrentEditor()
      if (!editor) return

      if (position === 'start') {
        editor.commands.insertContentAt(0, content)
      } else if (position === 'end') {
        const end = editor.state.doc.content.size
        editor.commands.insertContentAt(end, content)
      } else {
        editor.commands.insertContent(content)
      }
    },

    replaceSelection(content: string) {
      const editor = this.getCurrentEditor()
      if (!editor) return
      editor.commands.replaceSelection?.(content)
    },

    deleteSelection() {
      const editor = this.getCurrentEditor()
      if (!editor) return
      editor.commands.deleteSelection?.()
    },

    getSelection() {
      const editor = this.getCurrentEditor()
      if (!editor) return { from: 0, to: 0, text: '' }

      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to)
      return { from, to, text }
    },

    setSelection(start: number, end: number) {
      const editor = this.getCurrentEditor()
      if (!editor) return
      editor.chain().focus().setTextSelection({ from: start, to: end }).run()
    },

    registerCommand(command: EditorCommand) {
      registeredCommands.set(command.id, command)
    },

    unregisterCommand(commandId: string) {
      registeredCommands.delete(commandId)
    },

    onReady(callback: (editor: any) => void) {
      editorCallbacks.ready.push(callback)
      return () => {
        const index = editorCallbacks.ready.indexOf(callback)
        if (index > -1) {
          editorCallbacks.ready.splice(index, 1)
        }
      }
    },

    onChange(callback: (content: string) => void) {
      editorCallbacks.change.push(callback)
      return () => {
        const index = editorCallbacks.change.indexOf(callback)
        if (index > -1) {
          editorCallbacks.change.splice(index, 1)
        }
      }
    },

    onSelectionChange(callback: (selection: any) => void) {
      editorCallbacks.selectionChange.push(callback)
      return () => {
        const index = editorCallbacks.selectionChange.indexOf(callback)
        if (index > -1) {
          editorCallbacks.selectionChange.splice(index, 1)
        }
      }
    },

    registerExtension(extension: any) {
      // TODO: 注册 Tiptap 扩展
      console.log('Register extension:', extension.name)
    },

    registerSlashCommand(command: SlashCommand) {
      registeredSlashCommands.set(command.id, command)
    },
  }
}

/**
 * 通知编辑器就绪
 */
export function notifyEditorReady(editor: any) {
  editorCallbacks.ready.forEach((callback) => callback(editor))
}

/**
 * 通知内容变化
 */
export function notifyEditorChange(content: string) {
  editorCallbacks.change.forEach((callback) => callback(content))
}

/**
 * 通知选区变化
 */
export function notifySelectionChange(selection: any) {
  editorCallbacks.selectionChange.forEach((callback) => callback(selection))
}

/**
 * 获取已注册的命令
 */
export function getRegisteredCommands(): EditorCommand[] {
  return Array.from(registeredCommands.values())
}

/**
 * 获取已注册的斜杠命令
 */
export function getRegisteredSlashCommands(): SlashCommand[] {
  return Array.from(registeredSlashCommands.values())
}