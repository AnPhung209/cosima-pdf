import { useCallback, useState } from 'react'
import { uploadPdf } from '../../api/pdfApi'
import { useHighlightStore } from '../../store/useHighlightStore'

export function UploadDropzone() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setPdf = useHighlightStore((s) => s.setPdf)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.includes('pdf')) {
        setError('Please upload a PDF file.')
        return
      }
      setError(null)
      setUploading(true)
      try {
        const res = await uploadPdf(file)
        setPdf(res.pdf_id, res.filename)
      } catch {
        setError('Upload failed. Make sure the backend is running.')
      } finally {
        setUploading(false)
      }
    },
    [setPdf]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          w-full max-w-md border-2 border-dashed rounded-2xl p-12
          flex flex-col items-center gap-4 transition-all duration-200
          ${dragging
            ? 'border-accent bg-accent/5 scale-105'
            : 'border-border bg-white hover:border-primary-dark/40 hover:bg-primary-dark/5'
          }
        `}
      >
        <div className="w-16 h-16 rounded-full bg-primary-dark/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-primary-dark">Drop your PDF here</p>
          <p className="text-sm text-[#6B7280] mt-1">or click below to browse</p>
        </div>

        <label className="btn-accent cursor-pointer">
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Uploading…
            </span>
          ) : (
            'Choose PDF'
          )}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={uploading}
          />
        </label>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>

      <p className="mt-6 text-sm text-[#9CA3AF]">
        Supports any PDF · Powered by semantic AI search
      </p>
    </div>
  )
}
