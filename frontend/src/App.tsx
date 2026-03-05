import { useHighlightStore } from './store/useHighlightStore'
import { Header } from './components/Header/Header'
import { PDFViewer } from './components/PDFViewer/PDFViewer'
import { SidePanel } from './components/SidePanel/SidePanel'
import { UploadDropzone } from './components/Upload/UploadDropzone'
import type { RelatedResult } from './types'

export function App() {
  const { pdfId, setJumpTarget, setCurrentPage } = useHighlightStore((s) => ({
    pdfId: s.pdfId,
    setJumpTarget: s.setJumpTarget,
    setCurrentPage: s.setCurrentPage,
  }))

  const handleJump = (result: RelatedResult) => {
    setCurrentPage(result.page)
    setJumpTarget(result)
    // Scroll to page
    setTimeout(() => {
      const pageEl = document.querySelector(`[data-page-number="${result.page}"]`)
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {pdfId ? (
          <>
            <PDFViewer />
            <SidePanel onJump={handleJump} />
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <UploadDropzone />
          </div>
        )}
      </div>
    </div>
  )
}
