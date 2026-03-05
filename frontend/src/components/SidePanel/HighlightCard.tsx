import { useState } from 'react'
import type { Highlight } from '../../types'
import { useHighlightStore } from '../../store/useHighlightStore'
import { findRelatedStream } from '../../api/pdfApi'

interface Props {
  highlight: Highlight
}

export function HighlightCard({ highlight }: Props) {
  const { pdfId, removeHighlight, setResults, updateResultReasoning, setLoadingResults, setResultsError, setActiveTab } =
    useHighlightStore((s) => ({
      pdfId: s.pdfId,
      removeHighlight: s.removeHighlight,
      setResults: s.setResults,
      updateResultReasoning: s.updateResultReasoning,
      setLoadingResults: s.setLoadingResults,
      setResultsError: s.setResultsError,
      setActiveTab: s.setActiveTab,
    }))

  const [loading, setLoading] = useState(false)

  const handleFindRelated = () => {
    if (!pdfId) return
    setLoading(true)
    setLoadingResults(true)
    setActiveTab('results')

    findRelatedStream(highlight.text, pdfId, {
      onResults: (data) => {
        // Results arrive instantly from FAISS — show them immediately
        setResults(data.results, highlight.id)
        setLoadingResults(false)
      },
      onReasoning: (index, reasoning) => {
        // Each reasoning streams in as Gemini completes — update in place
        updateResultReasoning(index, reasoning)
      },
      onDone: () => {
        setLoading(false)
      },
      onError: (msg) => {
        setResultsError(msg)
        setLoading(false)
        setLoadingResults(false)
      },
    })
  }

  const preview = highlight.text.length > 80 ? highlight.text.slice(0, 80) + '…' : highlight.text

  return (
    <div className="card relative group">
      {/* Remove button */}
      <button
        onClick={() => removeHighlight(highlight.id)}
        className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#F0EBE5] hover:bg-red-100
                   text-[#9CA3AF] hover:text-red-500 flex items-center justify-center
                   transition-colors opacity-0 group-hover:opacity-100"
        title="Remove highlight"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Page badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-white bg-primary-dark rounded-full px-2 py-0.5">
          p.{highlight.page}
        </span>
        <span className="text-xs text-[#9CA3AF]">
          {new Date(highlight.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Text preview */}
      <p className="text-sm text-[#374151] leading-relaxed mb-3 pr-4">
        <span className="inline-block px-0.5 bg-accent/20 rounded">{preview}</span>
      </p>

      {/* Find Related button */}
      <button
        onClick={handleFindRelated}
        disabled={loading || !pdfId}
        className="btn-accent w-full flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Searching…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Find Related
          </>
        )}
      </button>
    </div>
  )
}
