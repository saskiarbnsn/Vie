"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { validarPassword } from "@/lib/autenticacion";

export type EstadoActualizar = { error?: string };

export async function actualizarContrasena(
  _: EstadoActualizar,
  form: FormData,
): Promise<EstadoActualizar> {
  const password = String(form.get("password") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");

  const error = validarPassword(password);
  if (error) return { error };
  if (password !== confirmar) return { error: "Las contraseñas no coinciden." };

  const supabase = await crearClienteServidor();

  // Solo con sesión válida (la del enlace de recuperación o una normal).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: errorUpdate } = await supabase.auth.updateUser({ password });
  if (errorUpdate) {
    return {
      error:
        errorUpdate.code === "same_password"
          ? "La contraseña nueva tiene que ser distinta de la actual."
          : "No se pudo actualizar la contraseña. Probá de nuevo.",
    };
  }
  redirect("/");
}
