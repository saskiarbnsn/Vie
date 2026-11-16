import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad para toda la app.
 *
 * La CSP permite 'unsafe-inline' en scripts porque Next inyecta scripts
 * inline al hidratar; el paso siguiente (anotado en el README) es pasar a
 * nonces generados en el proxy para poder sacarlo.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // Supabase: API y realtime.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cabecerasSeguridad = [
  // Nadie puede meter a Vie en un iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // El navegador no adivina tipos de contenido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Siempre HTTPS, también los subdominios.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No filtrar la URL completa a otros sitios.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Vie no usa cámara, micrófono ni ubicación en la web.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
