import { describe, it, expect } from 'vitest'
import { HTTPError } from 'ky'
import { parseApiError, getErrorMessage, ERROR_MESSAGES } from '../errors'

function httpError(body: unknown, status = 400): HTTPError {
  const response = new Response(JSON.stringify(body), { status })
  return new HTTPError(response, new Request('http://api.test/x'), {} as never)
}

describe('parseApiError', () => {
  it('extracts the code and message from the API envelope', async () => {
    const err = httpError({ success: false, error: { code: 'INSUFFICIENT_CREDITS', message: 'limit' } }, 429)
    expect(await parseApiError(err)).toEqual({ code: 'INSUFFICIENT_CREDITS', message: 'limit' })
  })

  it('falls back to UNKNOWN for non-JSON bodies', async () => {
    const response = new Response('<html>gateway error</html>', { status: 502 })
    const err = new HTTPError(response, new Request('http://api.test/x'), {} as never)
    expect((await parseApiError(err)).code).toBe('UNKNOWN')
  })

  it('falls back to UNKNOWN for non-HTTPError values', async () => {
    expect((await parseApiError(new Error('boom'))).code).toBe('UNKNOWN')
  })
})

describe('getErrorMessage', () => {
  it('maps known codes to user-facing copy, never the backend message', async () => {
    const err = httpError({ error: { code: 'FILE_TOO_LARGE', message: 'technical internals' } }, 413)
    const message = await getErrorMessage(err)
    expect(message).toBe(ERROR_MESSAGES.FILE_TOO_LARGE)
    expect(message).not.toContain('technical internals')
  })

  it('uses the caller fallback for unmapped codes', async () => {
    const err = httpError({ error: { code: 'BRAND_NEW_CODE', message: 'x' } })
    expect(await getErrorMessage(err, 'Custom fallback')).toBe('Custom fallback')
  })
})
