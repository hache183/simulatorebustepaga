/** Cookie HttpOnly impostato da POST /api/leads dopo invio lead valido. */
export const LEAD_UNLOCK_COOKIE = 'lead_unlock';

/** Durata sblocco report (giorni). */
export const LEAD_UNLOCK_MAX_AGE_DAYS = 30;

export const LEAD_UNLOCK_MAX_AGE_SEC = LEAD_UNLOCK_MAX_AGE_DAYS * 24 * 60 * 60;

export type LeadModulo = 'dipendenti' | 'edili' | 'domestici' | 'soci';
