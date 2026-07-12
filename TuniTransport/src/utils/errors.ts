// Maps raw Postgres/Supabase error text to a clear, user-facing message.
// Keeps rare technical strings from leaking into the UI.
function friendlyMessage(raw: string): string {
  // One rating per shipment per rater (ratings_shipment_id_rater_id_key).
  if (raw.includes('ratings_shipment_id_rater_id') || (raw.includes('duplicate key') && raw.includes('ratings'))) {
    return 'Vous avez déjà laissé un avis pour cet envoi.';
  }
  return raw;
}

/**
 * Safely extracts a message from an unknown error object.
 * Handles Error instances, Supabase error objects, and strings.
 */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof Error) return friendlyMessage(error.message);
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return friendlyMessage((error as { message: string }).message);
  }
  if (typeof error === 'string') return friendlyMessage(error);
  return fallback;
}
