/**
 * 网络 API 实现
 */

import type { NetworkAPI, RequestOptions, FetchResponse } from '../types'

/**
 * 创建网络 API
 */
export function createNetworkAPI(): NetworkAPI {
  return {
    async fetch(url: string, options: RequestOptions = {}): Promise<FetchResponse> {
      const { method = 'GET', headers = {}, body } = options

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        })

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          text: () => response.text(),
          json: () => response.json(),
          blob: () => response.blob(),
        }
      } catch (error) {
        console.error('[Plugin Network] Fetch error:', error)
        throw error
      }
    },
  }
}