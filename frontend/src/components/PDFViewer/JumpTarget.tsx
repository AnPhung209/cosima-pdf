import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RelatedResult } from '../../types'

interface Props {
  target: { result: RelatedResult; key: number } | null
  renderedPageWidth: number
  pdfPageWidth: number
  pdfPageHeight: number
  onDone: () => void
}

// PyMuPDF already uses a top-left origin coordinate system, so no Y-axis
// flip is needed. We only need to scale from PDF points to rendered pixels.
function pdfToCSS(
  bbox: RelatedResult['bbox'],
  renderedPageWidth: number,
  pdfPageWidth: number,
) {
  const scale = pdfPageWidth > 0 ? renderedPageWidth / pdfPageWidth : 1
  return {
    left: bbox.x * scale,
    top: bbox.y * scale,
    width: bbox.width * scale,
    height: bbox.height * scale,
  }
}

export function JumpTarget({ target, renderedPageWidth, pdfPageWidth, pdfPageHeight, onDone }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!target) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onDone()
    }, 3000)
    return () => clearTimeout(timerRef.current)
  }, [target, onDone])

  if (!target) return null

  const pos = pdfToCSS(target.result.bbox, renderedPageWidth, pdfPageWidth)

  return (
    <AnimatePresence>
      <motion.div
        key={target.key}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: [0, 1, 0.7, 1, 0.7, 1, 0],
          scale: [0.95, 1, 1.01, 1, 1.01, 1, 1],
          boxShadow: [
            '0 0 0 0 rgba(193,123,110,0)',
            '0 0 0 4px rgba(193,123,110,0.6)',
            '0 0 0 8px rgba(193,123,110,0.3)',
            '0 0 0 4px rgba(193,123,110,0.6)',
            '0 0 0 8px rgba(193,123,110,0.3)',
            '0 0 0 4px rgba(193,123,110,0.6)',
            '0 0 0 0 rgba(193,123,110,0)',
          ],
        }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          left: pos.left,
          top: pos.top,
          width: Math.max(pos.width, 40),
          height: Math.max(pos.height, 16),
          border: '2px solid #C17B6E',
          borderRadius: 3,
          pointerEvents: 'none',
          zIndex: 20,
          backgroundColor: 'rgba(193,123,110,0.15)',
        }}
      />
    </AnimatePresence>
  )
}
