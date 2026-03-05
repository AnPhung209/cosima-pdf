import { useEffect, useRef, useState } from 'react'

interface SelectionInfo {
  text: string
  x: number
  y: number
  pageNumber: number
  rects: { x: number; y: number; width: number; height: number }[]
}

export function useTextSelection(containerRef: React.RefObject<HTMLDivElement>) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setSelection(null)
          return
        }

        const text = sel.toString().trim()
        const range = sel.getRangeAt(0)
        const clientRects = Array.from(range.getClientRects())

        if (!containerRef.current) return

        // Find the page element the selection starts in
        let pageNumber = 1
        let pageEl: HTMLElement | null = null
        let el: HTMLElement | null = range.startContainer.parentElement
        while (el) {
          const pageAttr = el.getAttribute('data-page-number')
          if (pageAttr) {
            pageNumber = parseInt(pageAttr)
            pageEl = el
            break
          }
          el = el.parentElement
        }

        if (!pageEl) return

        // Compute rects relative to the page element, not the container
        const pageRect = pageEl.getBoundingClientRect()

        const rects = clientRects.map((r) => ({
          x: r.left - pageRect.left,
          y: r.top - pageRect.top,
          width: r.width,
          height: r.height,
        }))

        setSelection({
          text,
          x: e.clientX,
          y: e.clientY,
          pageNumber,
          rects,
        })
      }, 50)
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-highlight-btn]')) {
        setSelection(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      clearTimeout(timeoutRef.current)
    }
  }, [containerRef])

  const clearSelection = () => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  return { selection, clearSelection }
}
