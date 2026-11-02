// Safe wrapper for Firestore calls — returns { data, error } instead of throwing.
// Use for one-shot getDocs/getDoc calls. For onSnapshot, use the existing error callback param.

export type SafeResult<T> = { data: T; error: null } | { data: null; error: string };

export async function safeCall<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e: any) {
    const msg: string =
      e?.code === 'unavailable'       ? 'Hors ligne — vérifiez votre connexion.'  :
      e?.code === 'permission-denied' ? 'Accès refusé.'                            :
      e?.code === 'not-found'         ? 'Document introuvable.'                    :
      e?.message ?? 'Une erreur est survenue.';
    return { data: null, error: msg };
  }
}
