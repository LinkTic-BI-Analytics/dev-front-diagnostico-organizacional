const STORAGE_KEY = 'linktic-diagnostico-draft';

export interface StoredDraft {
  draftToken: string;
  lastStep: number;
  savedAt: string;
}

/**
 * Guarda el token del borrador en el navegador para poder ofrecer "continuar donde quedó".
 *
 * Es un puntero, no una copia de las respuestas: la fuente de verdad es el servidor. Si el
 * usuario cambia de dispositivo pierde el puntero, pero no la encuesta.
 *
 * Todo el acceso pasa por try/catch porque en modo privado de Safari `localStorage` lanza
 * al escribir, y perder el autoguardado local no debe tumbar la encuesta.
 */
export function saveDraftPointer(draftToken: string, lastStep: number): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredDraft = {
      draftToken,
      lastStep,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Sin almacenamiento local la encuesta sigue funcionando contra el servidor.
  }
}

export function readDraftPointer(): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    return parsed.draftToken ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraftPointer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que hacer: el borrador ya quedó cerrado en el servidor.
  }
}
