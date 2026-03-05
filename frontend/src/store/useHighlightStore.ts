import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Highlight, RelatedResult, SidePanelTab } from '../types'

interface HighlightStore {
  pdfId: string | null
  pdfFilename: string | null
  numPages: number
  currentPage: number
  highlights: Highlight[]
  results: RelatedResult[]
  activeHighlightId: string | null
  loadingResults: boolean
  resultsError: string | null
  activeTab: SidePanelTab
  jumpTarget: { result: RelatedResult; key: number } | null

  setPdf: (pdfId: string, filename: string) => void
  setNumPages: (n: number) => void
  setCurrentPage: (n: number) => void
  addHighlight: (h: Highlight) => void
  removeHighlight: (id: string) => void
  setResults: (results: RelatedResult[], highlightId: string) => void
  updateResultReasoning: (index: number, reasoning: string) => void
  setLoadingResults: (v: boolean) => void
  setResultsError: (msg: string | null) => void
  setActiveTab: (tab: SidePanelTab) => void
  setJumpTarget: (result: RelatedResult) => void
  clearJumpTarget: () => void
  reset: () => void
}

export const useHighlightStore = create<HighlightStore>()(
  persist(
    (set) => ({
      pdfId: null,
      pdfFilename: null,
      numPages: 0,
      currentPage: 1,
      highlights: [],
      results: [],
      activeHighlightId: null,
      loadingResults: false,
      resultsError: null,
      activeTab: 'highlights',
      jumpTarget: null,

      setPdf: (pdfId, filename) => set({ pdfId, pdfFilename: filename, highlights: [], results: [] }),
      setNumPages: (n) => set({ numPages: n }),
      setCurrentPage: (n) => set({ currentPage: n }),
      addHighlight: (h) => set((s) => ({ highlights: [...s.highlights, h] })),
      removeHighlight: (id) =>
        set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),
      setResults: (results, highlightId) =>
        set({ results, activeHighlightId: highlightId, resultsError: null }),
      updateResultReasoning: (index, reasoning) =>
        set((s) => {
          const updated = [...s.results]
          if (updated[index]) {
            updated[index] = { ...updated[index], reasoning }
          }
          return { results: updated }
        }),
      setLoadingResults: (v) => set({ loadingResults: v }),
      setResultsError: (msg) => set({ resultsError: msg, loadingResults: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setJumpTarget: (result) =>
        set((s) => ({ jumpTarget: { result, key: (s.jumpTarget?.key ?? 0) + 1 } })),
      clearJumpTarget: () => set({ jumpTarget: null }),
      reset: () =>
        set({
          pdfId: null,
          pdfFilename: null,
          numPages: 0,
          currentPage: 1,
          highlights: [],
          results: [],
          activeHighlightId: null,
          loadingResults: false,
          resultsError: null,
          jumpTarget: null,
        }),
    }),
    {
      name: 'cosima-highlights',
      partialize: (s) => ({
        pdfId: s.pdfId,
        pdfFilename: s.pdfFilename,
        highlights: s.highlights,
      }),
    }
  )
)
