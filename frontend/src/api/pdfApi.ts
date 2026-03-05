import client from './client'
import type { RelatedResult, RelatedTextResponse, UploadResponse } from '../types'

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await client.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Stream related-text results via SSE.
 * - onResults fires immediately with FAISS results (no reasoning yet)
 * - onReasoning fires per-result as Gemini reasoning arrives
 * - onDone fires when all reasoning is complete
 */
export function findRelatedStream(
  query: string,
  pdf_id: string,
  callbacks: {
    onResults: (data: RelatedTextResponse) => void
    onReasoning: (index: number, reasoning: string) => void
    onDone: () => void
    onError: (err: string) => void
  }
): AbortController {
  const controller = new AbortController()

  fetch('/api/related-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ query, pdf_id }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Request failed' }))
        callbacks.onError(err.detail || `HTTP ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError('No response body')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            try {
              const parsed = JSON.parse(data)
              if (currentEvent === 'results') {
                callbacks.onResults(parsed)
              } else if (currentEvent === 'reasoning') {
                callbacks.onReasoning(parsed.index, parsed.reasoning)
              } else if (currentEvent === 'done') {
                callbacks.onDone()
              }
            } catch {
              // skip malformed JSON
            }
            currentEvent = ''
          }
        }
      }

      callbacks.onDone()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message || 'Network error')
      }
    })

  return controller
}

// Keep simple non-streaming version as fallback
export async function findRelated(query: string, pdf_id: string): Promise<RelatedTextResponse> {
  const { data } = await client.post<RelatedTextResponse>('/related-text', { query, pdf_id })
  return data
}

export function getPdfUrl(pdf_id: string): string {
  return `/api/pdf/${pdf_id}`
}
