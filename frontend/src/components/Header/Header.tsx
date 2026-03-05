import { useHighlightStore } from '../../store/useHighlightStore'
import { uploadPdf } from '../../api/pdfApi'
import { useRef } from 'react'

export function Header() {
  const { pdfFilename, pdfId, highlights, setPdf, reset } = useHighlightStore((s) => ({
    pdfFilename: s.pdfFilename,
    pdfId: s.pdfId,
    highlights: s.highlights,
    setPdf: s.setPdf,
    reset: s.reset,
  }))
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    if (!file.type.includes('pdf')) return
    const res = await uploadPdf(file)
    setPdf(res.pdf_id, res.filename)
  }

  return (
    <header className="h-14 bg-primary-dark flex items-center px-6 gap-4 shrink-0 shadow-md z-10">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Cosima</span>
      </div>

      {/* File name */}
      {pdfFilename && (
        <span className="text-white/60 text-sm truncate max-w-xs hidden sm:block">
          {pdfFilename}
        </span>
      )}

      <div className="flex-1" />

      {/* Highlight count */}
      {pdfId && highlights.length > 0 && (
        <span className="hidden sm:flex items-center gap-1.5 text-white/70 text-sm">
          <span className="w-5 h-5 rounded-full bg-accent/80 text-white text-xs flex items-center justify-center font-semibold">
            {highlights.length}
          </span>
          highlight{highlights.length !== 1 ? 's' : ''}
        </span>
      )}

      {/* Upload / Replace button */}
      {pdfId ? (
        <button onClick={reset} className="btn-accent text-sm py-1.5 px-4">
          Replace PDF
        </button>
      ) : (
        <label className="btn-accent cursor-pointer text-sm py-1.5 px-4">
          Upload PDF
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
        </label>
      )}
    </header>
  )
}
