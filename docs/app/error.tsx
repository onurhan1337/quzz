'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for development
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-3">
          Component Error Detected
        </h2>
        <p className="text-red-700 dark:text-red-400 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-red-600 dark:text-red-500 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Reload Page
          </button>
        </div>
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-400">
          <strong>Tip:</strong> Check your terminal for detailed error information from quzz,
          including the full stack trace and component props at the time of error.
        </div>
      </div>
    </div>
  )
}