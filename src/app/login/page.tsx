"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { iniciarSesion } from "./actions";

function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, {});
  const aviso = useSearchParams().get("aviso");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="font-serif text-4xl">Vie</h1>
      <p className="mt-2 text-sm text-gris">Nutrición, entreno y ciclo en un solo lugar.</p>

      {aviso === "enlace" && (
        <p className="mt-6 rounded-xl border border-borde bg-tarjeta px-4 py-3 text-sm">
          Ese enlace no es válido o ya venció. Entrá con tu contraseña o pedí uno nuevo desde{" "}
          <Link href="/recuperar" className="font-semibold text-bordo">
            Recuperar contraseña
          </Link>
          .
        </p>
      )}

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
          autoComplete="current-password"
          placeholder="Contraseña"
          required
          maxLength={72}
          className="rounded-xl border border-borde bg-tarjeta px-4 py-3"
        />
        {estado.error && <p className="text-sm text-bordo">{estado.error}</p>}
        <button
          disabled={enviando}
          className="mt-2 rounded-xl bg-bordo px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-gris">
        <p>
          <Link href="/recuperar" className="font-semibold text-bordo">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p>
          ¿Primera vez en Vie?{" "}
          <Link href="/registro" className="font-semibold text-bordo">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense>
      <FormularioLogin />
    </Suspense>
  );
}
