/**
 * AI API 实现
 */

import type { AIAPI, AIMessage } from '../types'

/**
 * 创建 AI API
 */
export function createAIAPI(): AIAPI {
  return {
    async chat(messages: AIMessage[]): Promise<string> {
      try {
        // TODO: 实现 AI 对话
        // 这里需要调用已有的 chat 模块
        console.log('[Plugin AI] Chat:', messages.length, 'messages')
        return ''
      } catch (error) {
        console.error('[Plugin AI] Chat error:', error)
        throw error
      }
    },

    async embed(texts: string[]): Promise<number[][]> {
      try {
        // TODO: 实现文本嵌入
        // 这里需要调用已有的 embedding 模块
        console.log('[Plugin AI] Embed:', texts.length, 'texts')
        return texts.map(() => Array(1536).fill(0))
      } catch (error) {
        console.error('[Plugin AI] Embed error:', error)
        throw error
      }
    },

    async chatStream(
      messages: AIMessage[],
      onChunk: (chunk: string) => void
    ): Promise<string> {
      try {
        // TODO: 实现流式对话
        console.log('[Plugin AI] Chat stream:', messages.length, 'messages')
        return ''
      } catch (error) {
        console.error('[Plugin AI] Chat stream error:', error)
        throw error
      }
    },
  }
}