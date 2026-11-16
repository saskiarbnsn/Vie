"use client";

import Link from "next/link";
import { useActionState } from "react";
import { pedirRecuperacion } from "./actions";

export default function Recuperar() {
  const [estado, accion, enviando] = useActionState(pedirRecuperacion, {});

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-4xl">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-gris">
        Te mandamos un enlace por email para crear una contraseña nueva.
      </p>

      {estado.ok ? (
        <div className="mt-8 rounded-xl border border-borde bg-tarjeta px-4 py-5 text-sm">
          <p className="font-semibold">Revisá tu casilla</p>
          <p className="mt-1 text-gris">
            Si existe una cuenta con ese email, el enlace llega en un momento. Vence a los pocos
            minutos, así que usalo apenas llegue.
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
          {estado.error && <p className="text-sm text-bordo">{estado.error}</p>}
          <button
            disabled={enviando}
            className="mt-2 rounded-xl bg-bordo px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-gris">
        <Link href="/login" className="font-semibold text-bordo">
          Volver a entrar
        </Link>
      </p>
    </main>
  );
}
