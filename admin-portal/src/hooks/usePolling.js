import { useEffect, useRef } from 'react'

export function usePolling(callback, intervalMs = 10000, enabled = true) {
  // Keep a ref to the latest callback so the interval never captures a stale closure
  const savedCallback = useRef(callback)
  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (!enabled) return
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs])
}
