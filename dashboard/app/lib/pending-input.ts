/* Hands a file or text from the home composer to a pipeline page across a client navigation. */
export interface PendingInput {
  file?: File
  text?: string
}

let pending: PendingInput | null = null

export function setPendingInput(input: PendingInput) {
  pending = input
}

export function consumePendingInput(): PendingInput | null {
  const value = pending
  pending = null
  return value
}
