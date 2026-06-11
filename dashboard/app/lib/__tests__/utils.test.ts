import { describe, it, expect } from 'vitest'
import { formatBytes } from '../utils'

describe('formatBytes', () => {
  it('returns 0 B for 0', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('returns 0 B for negative input', () => {
    expect(formatBytes(-100)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  it('clamps to GB for very large values', () => {
    const result = formatBytes(1024 * 1024 * 1024 * 1024) // 1 TB
    expect(result).toMatch(/GB$/)
  })
})
