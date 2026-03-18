// dashboard/app/hooks/use-api-key.ts
'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'robin_api_key'

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null)

  useEffect(() => {
    setApiKeyState(localStorage.getItem(STORAGE_KEY))
  }, [])

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem(STORAGE_KEY, key)
    setApiKeyState(key)
  }, [])

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setApiKeyState(null)
  }, [])

  return { apiKey, hasKey: apiKey !== null, setApiKey, clearApiKey }
}
