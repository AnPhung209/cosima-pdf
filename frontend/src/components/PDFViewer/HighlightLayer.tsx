import type { Highlight } from '../../types'

interface Props {
  highlights: Highlight[]
  currentPage: number
  containerWidth: number
}

export function HighlightLayer({ highlights, currentPage, containerWidth }: Props) {
  const pageHighlights = highlights.filter((h) => h.page === currentPage)

  return (
    <>
      {pageHighlights.map((h) =>
        h.rects.map((rect, i) => (
          <div
            key={`${h.id}-${i}`}
            className="highlight-overlay"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))
      )}
    </>
  )
}
