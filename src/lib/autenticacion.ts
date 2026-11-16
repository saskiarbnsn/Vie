import { headers } from "next/headers";

/**
 * Validaciones de los formularios de cuenta. Corren SIEMPRE en el servidor:
 * lo que valida el navegador (required, minLength) es solo comodidad,
 * cualquiera puede mandar un POST sin pasar por el formulario.
 */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email: string): string | undefined {
  if (!email || email.length > 254 || !EMAIL_VALIDO.test(email)) {
    return "Ingresá un email válido.";
  }
}

export function validarPassword(password: string): string | undefined {
  if (password.length < 8) return "La contraseña necesita al menos 8 caracteres.";
  // bcrypt (lo que usa Supabase) ignora lo que pasa de 72 bytes.
  if (password.length > 72) return "La contraseña no puede superar los 72 caracteres.";
}

/** Origen de la app para los enlaces que van por email. */
export async function urlBase(): Promise<string> {
  const h = await headers();
  const origen = h.get("origin");
  if (origen) return origen;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
