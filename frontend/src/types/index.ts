export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface RelatedResult {
  id: string
  page: number
  snippet: string
  score: number
  char_start: number
  char_end: number
  bbox: BBox
  reasoning?: string
}

export interface Highlight {
  id: string
  text: string
  page: number
  rects: { x: number; y: number; width: number; height: number }[]
  createdAt: number
}

export interface RelatedTextRequest {
  query: string
  pdf_id: string
}

export interface RelatedTextResponse {
  results: RelatedResult[]
  query: string
  pdf_id: string
}

export interface UploadResponse {
  pdf_id: string
  filename: string
  pages: number
}

export type SidePanelTab = 'highlights' | 'results'
