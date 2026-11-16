"use client";

import Link from "next/link";
import { useActionState } from "react";
import { crearCuenta } from "./actions";

export default function Registro() {
  const [estado, accion, enviando] = useActionState(crearCuenta, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-4xl">Crear cuenta</h1>
      <p className="mt-2 text-sm text-gris">Nutrición, entreno y ciclo en un solo lugar.</p>

      {estado.ok ? (
        <div className="mt-8 rounded-xl border border-borde bg-tarjeta px-4 py-5 text-sm">
          <p className="font-semibold">Revisá tu casilla</p>
          <p className="mt-1 text-gris">
            Si el email es nuevo, te llega un enlace para confirmar la cuenta. Abrilo desde este
            dispositivo para entrar directo.
          </p>
        </div>
      ) : (
        <form action={accion} className="mt-8 flex flex-col gap-3">
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            maxLength={254}
            className="rounded-xl border border-borde bg-tarjeta px-4 py-3"
          />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            required
            minLength={8}
            maxLength={72}
            className="rounded-xl border border-borde bg-tarjeta px-4 py-3"
          />
          <input
            name="confirmar"
            type="password"
            autoComplete="new-password"
            placeholder="Repetir contraseña"
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
            {enviando ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-gris">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-bordo">
          Entrar
        </Link>
      </p>
    </main>
  );
}
