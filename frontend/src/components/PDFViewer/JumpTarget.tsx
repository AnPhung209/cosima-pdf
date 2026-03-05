import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RelatedResult } from '../../types'

interface Props {
  target: { result: RelatedResult; key: number } | null
  pageWidth: number
  pageHeight: number
  onDone: () => void
}

// PDF coordinate space has origin at bottom-left.
// We need to convert to top-left CSS coordinates.
function pdfToCSS(
  bbox: RelatedResult['bbox'],
  pageWidth: number,
  pageHeight: number,
  scale: number
) {
  return {
    left: bbox.x * scale,
    top: (pageHeight - bbox.y - bbox.height) * scale,
    width: bbox.width * scale,
    height: bbox.height * scale,
  }
}

export function JumpTarget({ target, pageWidth, pageHeight, onDone }: Props) {
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

  const scale = pageWidth > 0 ? pageWidth / 612 : 1 // 612 = standard PDF page width in points
  const pos = pdfToCSS(target.result.bbox, pageWidth, pageHeight, scale)

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
