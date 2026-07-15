// dashboard/app/http/errors.ts
import { HTTPError } from 'ky'
import { toast } from 'sonner'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

export const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_CREDITS: "You've run out of credits for this billing cycle.",
  RATE_LIMITED: 'Too many requests. Wait a moment and try again.',
  NO_PLAN: "Your account doesn't have an active plan. Pick one on the billing page.",
  SUBSCRIPTION_ENDED: 'Your subscription has ended. Renew it to keep processing.',
  FEATURE_NOT_AVAILABLE: "This feature isn't available on your current plan.",
  FILE_TOO_LARGE: "This file exceeds your plan's size limit.",
  INVALID_FORMAT: "This file format isn't supported.",
  UPLOAD_EXPIRED: 'The upload expired. Select your file and try again.',
  UPLOAD_NOT_FOUND: "We couldn't find that upload. Select your file and try again.",
  UPLOAD_NOT_COMPLETED: "The file hasn't finished uploading. Wait a moment and try again.",
  TEXT_INVALID_INPUT: "We couldn't process this text. Check your input and try again.",
  AUDIO_INVALID_INPUT: "We couldn't process this audio file. Check the file and try again.",
  KEY_LIMIT_REACHED: "You've reached the limit of 5 active keys. Revoke one to create another.",
  KEY_NOT_FOUND: "That key no longer exists. Refresh the page.",
  KEY_ALREADY_REVOKED: 'This key was already revoked. Refresh the page.',
  JOB_NOT_FOUND: "We couldn't find that job.",
  UNAUTHORIZED: 'Your session has expired. Sign in again.',
  USER_NOT_FOUND: 'Your session has expired. Sign in again.',
}

export const parseApiError = async (
  err: unknown,
): Promise<{ code: string; message: string }> => {
  if (err instanceof HTTPError) {
    try {
      const body = (await err.response.clone().json()) as {
        error?: { code?: string; message?: string }
      }
      if (body?.error?.code) {
        return { code: body.error.code, message: body.error.message ?? GENERIC_MESSAGE }
      }
    } catch {
    }
  }
  return { code: 'UNKNOWN', message: GENERIC_MESSAGE }
}

export const getErrorMessage = async (
  err: unknown,
  fallback: string = GENERIC_MESSAGE,
): Promise<string> => {
  const { code } = await parseApiError(err)
  return ERROR_MESSAGES[code] ?? fallback
}

export const toastApiError = async (err: unknown, fallback?: string): Promise<void> => {
  toast.error(await getErrorMessage(err, fallback))
}

/* Submit-error funnel: only INSUFFICIENT_CREDITS is special-cased (View plan action). */
export const toastSubmitError = async (
  err: unknown,
  fallback: string,
  onViewPlan: () => void,
): Promise<void> => {
  const { code } = await parseApiError(err)
  if (code === 'INSUFFICIENT_CREDITS') {
    toast.error(ERROR_MESSAGES.INSUFFICIENT_CREDITS, {
      action: { label: 'View plan', onClick: onViewPlan },
    })
    return
  }
  toast.error(ERROR_MESSAGES[code] ?? fallback)
}
