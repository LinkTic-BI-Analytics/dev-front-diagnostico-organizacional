import { hashWithSalt, secretsMatch } from '../common/utils/hash.util';
import { serverEnv } from '../env';
import { HttpError } from '../http';
import { signSession } from '../session';
import { countRecentAudits, recordAudit } from './audit';

/**
 * Valida el token de acceso y devuelve un JWT de sesión.
 *
 * El token compartido no da trazabilidad por persona ni revocación individual; el JWT es lo
 * que se valida en cada llamada, así que migrar a cuentas por usuario más adelante no
 * obliga a tocar las rutas: solo cambia quién emite la sesión.
 */
export async function login(candidate: string, ip: string | undefined) {
  const ipHash = hashIp(ip);
  await assertNotRateLimited(ipHash);

  if (!secretsMatch(candidate, serverEnv.adminAccessToken)) {
    await recordAudit('LOGIN_FAIL', ipHash);
    throw new HttpError(401, 'Token de acceso incorrecto.');
  }

  await recordAudit('LOGIN_OK', ipHash);
  return { token: await signSession(), expiresIn: serverEnv.jwtExpiresIn };
}

export async function logout(ip: string | undefined): Promise<void> {
  await recordAudit('LOGOUT', hashIp(ip));
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return hashWithSalt(ip, serverEnv.hashSalt);
}

/**
 * Rate limit respaldado en `admin_audit_log`. Se usa esa tabla en vez de un contador aparte
 * porque cada intento ya se audita: una sola fuente de verdad que sobrevive a los arranques
 * en frío de serverless, y límites configurables por entorno sin tocar código.
 */
async function assertNotRateLimited(ipHash: string | null): Promise<void> {
  if (!ipHash) return;

  const limit = serverEnv.loginRateLimit;
  const windowMinutes = serverEnv.loginRateWindowMinutes;

  const failures = await countRecentAudits('LOGIN_FAIL', ipHash, windowMinutes);
  if (failures >= limit) {
    await recordAudit('LOGIN_RATE_LIMITED', ipHash, { failures });
    throw new HttpError(429, {
      statusCode: 429,
      message: `Demasiados intentos fallidos. Espere ${windowMinutes} minutos.`,
      retryAfterSeconds: windowMinutes * 60,
    });
  }
}
