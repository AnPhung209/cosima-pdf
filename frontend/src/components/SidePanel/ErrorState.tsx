interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="m-4 p-4 rounded-xl border border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">Search failed</p>
          <p className="text-xs text-red-600 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
