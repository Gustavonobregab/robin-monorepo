/* Minimal PCM source: a real AudioBuffer satisfies this structurally. */
export interface PcmSource {
  numberOfChannels: number
  length: number
  sampleRate: number
  getChannelData(channel: number): Float32Array
}

const HEADER_BYTES = 44

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

/* Averaged rather than channel-0 only: dropping a channel loses anything panned to it. */
function downmixToMono(source: PcmSource): Float32Array {
  const channels = Array.from({ length: source.numberOfChannels }, (_, c) =>
    source.getChannelData(c),
  )
  if (channels.length === 1) return channels[0]

  const mono = new Float32Array(source.length)
  for (let i = 0; i < source.length; i++) {
    let sum = 0
    for (const channel of channels) sum += channel[i]
    mono[i] = sum / channels.length
  }
  return mono
}

/* Encode to 16-bit mono WAV. The RIFF/WAVE header matters beyond playback:
   the API validates uploads by magic bytes, not by file extension. */
export function encodeWav(source: PcmSource): ArrayBuffer {
  const samples = downmixToMono(source)
  const dataBytes = samples.length * 2
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes)
  const view = new DataView(buffer)
  const byteRate = source.sampleRate * 2

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true)
  writeAscii(view, 8, 'WAVE')

  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // PCM subchunk size
  view.setUint16(20, 1, true) // format: PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, source.sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample

  writeAscii(view, 36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    // asymmetric because two's complement holds one more negative step than positive
    view.setInt16(HEADER_BYTES + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  }

  return buffer
}
