"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoCiclo, IconoComidas, IconoCuerpo, IconoEntreno, IconoInicio } from "./iconos";

const SECCIONES = [
  { href: "/", nombre: "Inicio", Icono: IconoInicio },
  { href: "/entreno", nombre: "Entreno", Icono: IconoEntreno },
  { href: "/cuerpo", nombre: "Cuerpo", Icono: IconoCuerpo },
  { href: "/ciclo", nombre: "Ciclo", Icono: IconoCiclo },
  { href: "/comidas", nombre: "Comidas", Icono: IconoComidas },
] as const;

export function BarraInferior() {
  const ruta = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-tarjeta pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2">
        {SECCIONES.map(({ href, nombre, Icono }) => {
          const activa = href === "/" ? ruta === "/" : ruta.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-1.5 text-[11px] ${
                  activa ? "font-bold text-bordo" : "font-medium text-gris"
                }`}
              >
                <Icono />
                {nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
