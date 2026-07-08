/**
 * Safely extracts a message from an unknown error object.
 * Handles Error instances, Supabase error objects, and strings.
 */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  if (typeof error === 'string') return error;
  return fallback;
}
