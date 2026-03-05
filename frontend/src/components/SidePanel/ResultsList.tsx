import { useHighlightStore } from '../../store/useHighlightStore'
import { ResultCard } from './ResultCard'
import { SkeletonLoader } from './SkeletonLoader'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { findRelatedStream } from '../../api/pdfApi'
import type { RelatedResult } from '../../types'

interface Props {
  onJump: (result: RelatedResult) => void
}

export function ResultsList({ onJump }: Props) {
  const { results, loadingResults, resultsError, activeHighlightId, highlights, pdfId,
    setResults, updateResultReasoning, setLoadingResults, setResultsError } =
    useHighlightStore((s) => ({
      results: s.results,
      loadingResults: s.loadingResults,
      resultsError: s.resultsError,
      activeHighlightId: s.activeHighlightId,
      highlights: s.highlights,
      pdfId: s.pdfId,
      setResults: s.setResults,
      updateResultReasoning: s.updateResultReasoning,
      setLoadingResults: s.setLoadingResults,
      setResultsError: s.setResultsError,
    }))

  const handleRetry = () => {
    if (!activeHighlightId || !pdfId) return
    const highlight = highlights.find((h) => h.id === activeHighlightId)
    if (!highlight) return
    setLoadingResults(true)
    setResultsError(null)

    findRelatedStream(highlight.text, pdfId, {
      onResults: (data) => {
        setResults(data.results, highlight.id)
        setLoadingResults(false)
      },
      onReasoning: (index, reasoning) => {
        updateResultReasoning(index, reasoning)
      },
      onDone: () => {},
      onError: (msg) => {
        setResultsError(msg)
        setLoadingResults(false)
      },
    })
  }

  if (loadingResults) return <SkeletonLoader />
  if (resultsError) return <ErrorState message={resultsError} onRetry={handleRetry} />

  // Distinguish "never searched" from "searched but no results"
  if (!activeHighlightId && results.length === 0) return <EmptyState type="no-search" />
  if (results.length === 0) return <EmptyState type="results" />

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">
        {results.length} related passage{results.length !== 1 ? 's' : ''} found
      </p>
      {results.map((r) => (
        <ResultCard key={r.id} result={r} onJump={onJump} />
      ))}
    </div>
  )
}
