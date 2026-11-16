"use server";

import { crearClienteServidor } from "@/lib/supabase/server";
import { urlBase, validarEmail, validarPassword } from "@/lib/autenticacion";

export type EstadoRegistro = { ok?: boolean; error?: string };

export async function crearCuenta(_: EstadoRegistro, form: FormData): Promise<EstadoRegistro> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");

  const error = validarEmail(email) ?? validarPassword(password);
  if (error) return { error };
  if (password !== confirmar) return { error: "Las contraseñas no coinciden." };

  const supabase = await crearClienteServidor();
  const { error: errorSignUp } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await urlBase()}/auth/confirm?next=/` },
  });

  if (errorSignUp) {
    return { error: "No se pudo crear la cuenta. Probá de nuevo en unos minutos." };
  }

  // Mismo mensaje exista o no una cuenta con ese email:
  // la pantalla de registro no revela qué emails están registrados.
  return { ok: true };
}
