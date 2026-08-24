import { ApiRequestError } from '../lib/api'

export function mutationErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'
}
