'use client'

import { useCallback, useEffect, useState } from 'react'

/* Fires once per browser: returns whether the flag is unseen, plus a marker to dismiss it.
   Used for first-visit teasers (e.g. a new-template announcement). */
export function useOnceFlag(key: string): [boolean, () => void] {
  const storageKey = `robin:seen:${key}`
  const [unseen, setUnseen] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(storageKey) === null) setUnseen(true)
  }, [storageKey])

  const markSeen = useCallback(() => {
    localStorage.setItem(storageKey, '1')
    setUnseen(false)
  }, [storageKey])

  return [unseen, markSeen]
}
