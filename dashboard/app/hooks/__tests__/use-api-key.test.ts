import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useApiKey } from '../use-api-key'

beforeEach(() => localStorage.clear())

describe('useApiKey', () => {
  it('returns null when no key is set', () => {
    const { result } = renderHook(() => useApiKey())
    expect(result.current.apiKey).toBeNull()
    expect(result.current.hasKey).toBe(false)
  })

  it('sets and reads a key from localStorage', () => {
    const { result } = renderHook(() => useApiKey())
    act(() => result.current.setApiKey('sk_live_test123'))
    expect(result.current.apiKey).toBe('sk_live_test123')
    expect(result.current.hasKey).toBe(true)
    expect(localStorage.getItem('robin_api_key')).toBe('sk_live_test123')
  })

  it('clears the key', () => {
    const { result } = renderHook(() => useApiKey())
    act(() => result.current.setApiKey('sk_live_test123'))
    act(() => result.current.clearApiKey())
    expect(result.current.apiKey).toBeNull()
    expect(localStorage.getItem('robin_api_key')).toBeNull()
  })
})
