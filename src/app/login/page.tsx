"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function Login() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-4xl">Vie</h1>
      <p className="mt-2 text-sm text-gris">Nutrición, entreno y ciclo en un solo lugar.</p>

      <form action={accion} className="mt-8 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="rounded-xl border border-borde bg-white px-4 py-3"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          required
          className="rounded-xl border border-borde bg-white px-4 py-3"
        />
        {estado.error && <p className="text-sm text-terracota">{estado.error}</p>}
        <button
          disabled={enviando}
          className="mt-2 rounded-xl bg-pizarra px-4 py-3 text-marfil disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
