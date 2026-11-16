"use server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { urlBase, validarEmail } from "@/lib/autenticacion";

export type EstadoRecuperar = { ok?: boolean; error?: string };

export async function pedirRecuperacion(
  _: EstadoRecuperar,
  form: FormData,
): Promise<EstadoRecuperar> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  const error = validarEmail(email);
  if (error) return { error };

  const supabase = await crearClienteServidor();
  const { error: errorReset } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await urlBase()}/auth/confirm?next=/actualizar-contrasena`,
  });

  // Supabase responde igual exista o no la cuenta; un error acá es casi
  // siempre el límite de intentos, y tampoco revela nada.
  if (errorReset) {
    return { error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." };
  }
  return { ok: true };
}
