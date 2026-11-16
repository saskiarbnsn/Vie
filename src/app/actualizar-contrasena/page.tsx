"use client";

import { useActionState } from "react";
import { actualizarContrasena } from "./actions";

export default function ActualizarContrasena() {
  const [estado, accion, enviando] = useActionState(actualizarContrasena, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-4xl">Contraseña nueva</h1>
      <p className="mt-2 text-sm text-gris">Elegí la contraseña para entrar a Vie desde ahora.</p>

      <form action={accion} className="mt-8 flex flex-col gap-3">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Contraseña nueva (mínimo 8 caracteres)"
          required
          minLength={8}
          maxLength={72}
          className="rounded-xl border border-borde bg-tarjeta px-4 py-3"
        />
        <input
          name="confirmar"
          type="password"
          autoComplete="new-password"
          placeholder="Repetir contraseña nueva"
          required
          minLength={8}
          maxLength={72}
          className="rounded-xl border border-borde bg-tarjeta px-4 py-3"
        />
        {estado.error && <p className="text-sm text-bordo">{estado.error}</p>}
        <button
          disabled={enviando}
          className="mt-2 rounded-xl bg-bordo px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
