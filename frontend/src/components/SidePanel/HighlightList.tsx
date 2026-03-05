import { useHighlightStore } from '../../store/useHighlightStore'
import { HighlightCard } from './HighlightCard'
import { EmptyState } from './EmptyState'

export function HighlightList() {
  const highlights = useHighlightStore((s) => s.highlights)

  if (highlights.length === 0) {
    return <EmptyState type="highlights" />
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {[...highlights].reverse().map((h) => (
        <HighlightCard key={h.id} highlight={h} />
      ))}
    </div>
  )
}
