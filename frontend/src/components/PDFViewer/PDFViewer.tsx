import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { useHighlightStore } from '../../store/useHighlightStore'
import { useTextSelection } from '../../hooks/useTextSelection'
import { HighlightLayer } from './HighlightLayer'
import { JumpTarget } from './JumpTarget'
import type { Highlight } from '../../types'
import { getPdfUrl } from '../../api/pdfApi'

// Set PDF.js worker — must match the pdfjs-dist version bundled with react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [pdfPageSize, setPdfPageSize] = useState({ width: 612, height: 792 })
  const [containerWidth, setContainerWidth] = useState(750)
  const [visiblePage, setVisiblePage] = useState(1)

  const {
    pdfId,
    numPages,
    highlights,
    jumpTarget,
    setNumPages,
    setCurrentPage,
    addHighlight,
    clearJumpTarget,
  } = useHighlightStore((s) => ({
    pdfId: s.pdfId,
    numPages: s.numPages,
    highlights: s.highlights,
    jumpTarget: s.jumpTarget,
    setNumPages: s.setNumPages,
    setCurrentPage: s.setCurrentPage,
    addHighlight: s.addHighlight,
    clearJumpTarget: s.clearJumpTarget,
  }))

  const { selection, clearSelection } = useTextSelection(containerRef)

  // Responsive: measure container width and update on resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 750
      setContainerWidth(w)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Track visible page on scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleScroll = () => {
      const pages = el.querySelectorAll('[data-page-number]')
      let closest = 1
      let minDist = Infinity
      const containerTop = el.scrollTop + el.clientHeight / 3
      pages.forEach((page) => {
        const rect = (page as HTMLElement)
        const top = rect.offsetTop
        const dist = Math.abs(top - containerTop)
        if (dist < minDist) {
          minDist = dist
          closest = parseInt(page.getAttribute('data-page-number') || '1')
        }
      })
      setVisiblePage(closest)
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [numPages])

  const handleAddHighlight = useCallback(() => {
    if (!selection) return
    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      text: selection.text,
      page: selection.pageNumber,
      rects: selection.rects,
      createdAt: Date.now(),
    }
    addHighlight(newHighlight)
    clearSelection()
  }, [selection, addHighlight, clearSelection])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const onPageLoadSuccess = (page: { width: number; height: number; originalWidth: number; originalHeight: number }) => {
    // Capture the original (unscaled) PDF page dimensions in points
    setPdfPageSize({ width: page.originalWidth, height: page.originalHeight })
  }

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages))
    setCurrentPage(clamped)
    const el = containerRef.current?.querySelector(`[data-page-number="${clamped}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!pdfId) return null

  // Leave 48px padding; clamp between 400 and 900
  const pageWidth = Math.max(400, Math.min(containerWidth - 48, 900))
  const pdfUrl = getPdfUrl(pdfId)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-[#E8E2DC] relative min-w-0"
      style={{ userSelect: 'text' }}
    >
      {/* Page indicator + controls */}
      {numPages > 0 && (
        <div className="sticky top-3 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full shadow-md border border-border px-3 py-1.5 text-sm">
            <button
              onClick={() => goToPage(visiblePage - 1)}
              disabled={visiblePage <= 1}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary-dark/10 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-primary-dark font-medium tabular-nums min-w-[4rem] text-center">
              {visiblePage} / {numPages}
            </span>
            <button
              onClick={() => goToPage(visiblePage + 1)}
              disabled={visiblePage >= numPages}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary-dark/10 disabled:opacity-30 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating highlight button */}
      {selection && (
        <div
          data-highlight-btn
          style={{
            position: 'fixed',
            left: selection.x,
            top: selection.y - 40,
            zIndex: 50,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={handleAddHighlight}
            className="btn-accent shadow-lg text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Highlight
          </button>
        </div>
      )}

      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin w-8 h-8 text-primary-dark" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-primary-dark/70">Loading PDF…</p>
            </div>
          </div>
        }
        error={
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500 text-sm">Failed to load PDF. Check the backend is running.</p>
          </div>
        }
        className="flex flex-col items-center gap-4 py-6"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <div
            key={pageNumber}
            data-page-number={pageNumber}
            className="relative shadow-lg"
            style={{ width: pageWidth }}
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              onLoadSuccess={pageNumber === 1 ? onPageLoadSuccess : undefined}
              renderAnnotationLayer
              renderTextLayer
            />

            {/* Highlight overlays */}
            <div className="absolute inset-0 pointer-events-none">
              <HighlightLayer
                highlights={highlights}
                currentPage={pageNumber}
                containerWidth={pageWidth}
              />

              {/* Jump target on matching page */}
              {jumpTarget && jumpTarget.result.page === pageNumber && (
                <JumpTarget
                  target={jumpTarget}
                  renderedPageWidth={pageWidth}
                  pdfPageWidth={pdfPageSize.width}
                  pdfPageHeight={pdfPageSize.height}
                  onDone={clearJumpTarget}
                />
              )}
            </div>
          </div>
        ))}
      </Document>
    </div>
  )
}
