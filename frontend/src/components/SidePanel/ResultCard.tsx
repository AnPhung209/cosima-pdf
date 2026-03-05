import { useState } from 'react'
import type { RelatedResult } from '../../types'

interface Props {
  result: RelatedResult
  onJump: (result: RelatedResult) => void
}

function scoreColor(score: number): string {
  // Interpolate from accent (#C17B6E) at low scores to primary-light (#4A7C59) at high scores
  if (score >= 0.8) return 'bg-primary-light'
  if (score >= 0.6) return 'bg-[#6A9E6A]'
  if (score >= 0.4) return 'bg-[#B08A60]'
  return 'bg-accent'
}

export function ResultCard({ result, onJump }: Props) {
  const [showReasoning, setShowReasoning] = useState(false)
  const pct = Math.round(result.score * 100)

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`score-badge ${scoreColor(result.score)}`}>{pct}%</span>
          <span className="text-xs font-medium text-[#6B7280]">p.{result.page}</span>
        </div>
        <button
          onClick={() => onJump(result)}
          className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          Jump
        </button>
      </div>

      {/* Snippet */}
      <p className="text-sm text-[#374151] leading-relaxed">{result.snippet}</p>

      {/* Reasoning toggle */}
      {result.reasoning && (
        <div className="mt-2">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1 text-xs text-primary-dark/70 hover:text-primary-dark transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showReasoning ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Why related?
          </button>
          {showReasoning && (
            <p className="mt-1.5 text-xs text-[#6B7280] bg-background rounded-lg p-2.5 border border-border leading-relaxed italic">
              {result.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
