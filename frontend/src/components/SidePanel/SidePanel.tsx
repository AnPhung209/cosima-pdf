import { useState } from 'react'
import { useHighlightStore } from '../../store/useHighlightStore'
import { HighlightList } from './HighlightList'
import { ResultsList } from './ResultsList'
import type { RelatedResult } from '../../types'

interface Props {
  onJump: (result: RelatedResult) => void
}

export function SidePanel({ onJump }: Props) {
  const { activeTab, setActiveTab, highlights, results } = useHighlightStore((s) => ({
    activeTab: s.activeTab,
    setActiveTab: s.setActiveTab,
    highlights: s.highlights,
    results: s.results,
  }))

  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Collapse / expand toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-5 h-10 bg-white border border-border rounded-l-md
                   flex items-center justify-center hover:bg-primary-dark/5 transition-colors shadow-sm"
        style={{ right: collapsed ? 0 : undefined, position: 'relative' }}
        title={collapsed ? 'Show panel' : 'Hide panel'}
      >
        <svg className={`w-3 h-3 text-primary-dark transition-transform ${collapsed ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!collapsed && (
        <aside className="w-[340px] xl:w-[380px] shrink-0 flex flex-col border-l border-border bg-background overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border bg-white shrink-0">
            {(['highlights', 'results'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-3 px-4 text-sm font-medium capitalize transition-all
                  flex items-center justify-center gap-1.5
                  ${activeTab === tab
                    ? 'text-primary-dark border-b-2 border-primary-dark bg-background'
                    : 'text-[#6B7280] hover:text-primary-dark hover:bg-background/50'
                  }
                `}
              >
                {tab === 'highlights' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                {tab}
                {tab === 'highlights' && highlights.length > 0 && (
                  <span className="ml-1 bg-primary-dark text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {highlights.length}
                  </span>
                )}
                {tab === 'results' && results.length > 0 && (
                  <span className="ml-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {results.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'highlights' ? (
              <HighlightList />
            ) : (
              <ResultsList onJump={onJump} />
            )}
          </div>
        </aside>
      )}
    </>
  )
}
