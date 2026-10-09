import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad de la API: las que ponía `helmet` en el backend de NestJS.
 *
 * Solo sobre /api/v1. La API sirve JSON y descargas, nunca HTML, así que admite la política
 * más cerrada (`default-src 'none'`); aplicarla a las páginas rompería los scripts en línea
 * con los que Next hidrata.
 */
const API_SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Download-Options', value: 'noopen' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-XSS-Protection', value: '0' },
];

const nextConfig: NextConfig = {
  /**
   * La API vive en este mismo proyecto (`src/app/api/v1`), así que el navegador y el
   * servidor comparten origen: la cookie de sesión es first-party sin rewrites, sin CORS y
   * sin `SameSite=None`.
   */
  async headers() {
    return [{ source: '/api/v1/:path*', headers: API_SECURITY_HEADERS }];
  },
};

export default nextConfig;
