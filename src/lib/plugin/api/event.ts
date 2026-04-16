/**
 * 事件 API 实现
 */

import type { EventAPI, EventCallback } from '../types'

// 事件订阅存储
type Subscription = {
  callback: EventCallback
  id: string
}

const eventListeners = new Map<string, Subscription[]>()
let subscriptionIdCounter = 0

/**
 * 创建事件 API
 */
export function createEventAPI(): EventAPI {
  return {
    on(event: string, callback: EventCallback): () => void {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, [])
      }

      const id = `sub_${++subscriptionIdCounter}`
      eventListeners.get(event)!.push({ callback, id })

      // 返回取消订阅的函数
      return () => {
        const subs = eventListeners.get(event)
        if (subs) {
          const index = subs.findIndex((s) => s.id === id)
          if (index > -1) {
            subs.splice(index, 1)
          }
        }
      }
    },

    once(event: string, callback: EventCallback): void {
      const wrappedCallback = (data?: any) => {
        callback(data)
        // 自动取消
        const subs = eventListeners.get(event)
        if (subs) {
          const index = subs.findIndex((s) => s.callback === wrappedCallback)
          if (index > -1) {
            subs.splice(index, 1)
          }
        }
      }

      if (!eventListeners.has(event)) {
        eventListeners.set(event, [])
      }
      eventListeners.get(event)!.push({ callback: wrappedCallback, id: 'once' })
    },

    off(event: string, callback?: EventCallback): void {
      if (!callback) {
        // 移除该事件的所有订阅
        eventListeners.delete(event)
        return
      }

      const subs = eventListeners.get(event)
      if (subs) {
        const index = subs.findIndex((s) => s.callback === callback)
        if (index > -1) {
          subs.splice(index, 1)
        }
      }
    },

    emit(event: string, data?: any): void {
      const subs = eventListeners.get(event)
      if (subs) {
        // 复制一份，避免在回调中修改导致的问题
        [...subs].forEach((sub) => {
          try {
            sub.callback(data)
          } catch (error) {
            console.error(`[Event] Error in handler for "${event}":`, error)
          }
        })
      }
    },
  }
}

/**
 * 触发事件 (供系统内部使用)
 */
export function emitSystemEvent(event: string, data?: any) {
  const subs = eventListeners.get(event)
  if (subs) {
    [...subs].forEach((sub) => {
      try {
        sub.callback(data)
      } catch (error) {
        console.error(`[SystemEvent] Error in handler for "${event}":`, error)
      }
    })
  }
}

/**
 * 清除所有事件订阅
 */
export function clearAllEvents() {
  eventListeners.clear()
}

/**
 * 获取事件订阅数量
 */
export function getEventListenerCount(event: string): number {
  return eventListeners.get(event)?.length || 0
}