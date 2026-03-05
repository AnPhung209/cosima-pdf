interface EmptyStateProps {
  type: 'highlights' | 'results' | 'no-search'
}

export function EmptyState({ type }: EmptyStateProps) {
  if (type === 'highlights') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-dark/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-primary-dark/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="font-medium text-primary-dark">No highlights yet</p>
        <p className="text-sm text-[#9CA3AF] mt-1">Select text in the PDF to create a highlight</p>
      </div>
    )
  }

  if (type === 'no-search') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-dark/10 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-primary-dark/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="font-medium text-primary-dark">No search yet</p>
        <p className="text-sm text-[#9CA3AF] mt-1">Click "Find Related" on a highlight to search for similar passages</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-primary-dark/10 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-primary-dark/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="font-medium text-primary-dark">No related passages found</p>
      <p className="text-sm text-[#9CA3AF] mt-1">Try a different highlight or a longer text selection</p>
    </div>
  )
}
