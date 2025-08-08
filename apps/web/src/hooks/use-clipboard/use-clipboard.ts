import { useState } from "react"

interface UseClipboardOptions {
  timeout: Optional<number>
}

interface UseClipboardResult {
  copy: (valueToCopy: string) => void
  reset: () => void
  error: Error | null
  copied: boolean
}

/**
 * Handle clipboard operations
 * @param {UseClipboardOptions} options - Options for the clipboard hook
 * @returns {UseClipboardResult} - The clipboard hook result
 */
export const useClipboard = ({ timeout = 2000 }: UseClipboardOptions): UseClipboardResult => {
  const [error, setError] = useState<Error | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyTimeout, setCopyTimeout] = useState<number | null>(null)

  const handleCopyResult = (value: boolean) => {
    window.clearTimeout(copyTimeout!)
    setCopyTimeout(window.setTimeout(() => setCopied(false), timeout ?? 0))
    setCopied(value)
  }

  const copy = (valueToCopy: string) => {
    if ("clipboard" in navigator) {
      navigator.clipboard
        .writeText(valueToCopy)
        .then(() => handleCopyResult(true))
        .catch((err: Error) => setError(err))
    } else {
      setError(new Error("useClipboard: navigator.clipboard is not supported"))
    }
  }

  const reset = () => {
    setCopied(false)
    setError(null)
    window.clearTimeout(copyTimeout!)
  }

  return { copy, reset, error, copied }
}
