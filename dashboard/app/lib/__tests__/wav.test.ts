import { describe, it, expect } from 'vitest'
import { encodeWav, type PcmSource } from '../wav'

function source(channels: number[][], sampleRate = 48000): PcmSource {
  return {
    numberOfChannels: channels.length,
    length: channels[0].length,
    sampleRate,
    getChannelData: (c) => Float32Array.from(channels[c]),
  }
}

const ascii = (buffer: ArrayBuffer, offset: number, length: number) =>
  String.fromCharCode(...new Uint8Array(buffer, offset, length))

describe('encodeWav', () => {
  it('writes the RIFF/WAVE magic bytes the API validates uploads against', () => {
    const buffer = encodeWav(source([[0, 0]]))

    expect(ascii(buffer, 0, 4)).toBe('RIFF')
    expect(ascii(buffer, 8, 4)).toBe('WAVE')
  })

  it('declares 16-bit mono PCM regardless of input channel count', () => {
    const view = new DataView(encodeWav(source([[0], [0]])))

    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint16(34, true)).toBe(16) // bits per sample
  })

  it('sizes the header fields against the sample count', () => {
    const buffer = encodeWav(source([[0, 0, 0, 0]]))
    const view = new DataView(buffer)

    expect(buffer.byteLength).toBe(44 + 8)
    expect(view.getUint32(4, true)).toBe(36 + 8) // RIFF chunk size
    expect(view.getUint32(40, true)).toBe(8) // data chunk size
  })

  it('carries sample rate and derived byte rate', () => {
    const view = new DataView(encodeWav(source([[0]], 16000)))

    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(32000) // 16000 * 2 bytes
  })

  it('averages channels instead of dropping one', () => {
    const view = new DataView(encodeWav(source([[1], [-1]])))

    expect(view.getInt16(44, true)).toBe(0)
  })

  it('clamps out-of-range samples instead of wrapping', () => {
    const view = new DataView(encodeWav(source([[2, -2]])))

    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
  })

  it('maps full-scale samples to the endpoints', () => {
    const view = new DataView(encodeWav(source([[1, -1, 0]])))

    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
    expect(view.getInt16(48, true)).toBe(0)
  })
})
