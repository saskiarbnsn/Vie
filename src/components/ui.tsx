import Link from "next/link";
import type { Fase } from "@/lib/ciclo";
import type { Nivel } from "@/lib/exigencia";
import { IconoVolver } from "./iconos";

export const tarjeta = "rounded-[20px] border border-borde bg-tarjeta p-[18px]";
export const etiqueta = "text-[11px] font-bold uppercase tracking-[0.06em] text-gris";
export const botonPrincipal =
  "flex h-12 items-center justify-center gap-2 rounded-full bg-bordo px-5 text-[15px] font-semibold text-white hover:bg-bordo-oscuro disabled:opacity-60";
export const botonSecundario =
  "flex h-11 items-center justify-center gap-2 rounded-full border border-bordo px-4 text-sm font-semibold text-bordo hover:bg-rosa";

export function Pantalla({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-7">{children}</main>;
}

export function Cabecera({
  titulo,
  bajada,
  volver,
  accion,
}: {
  titulo: string;
  bajada?: React.ReactNode;
  volver?: { href: string; texto: string };
  accion?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      {volver && (
        <Link href={volver.href} className="-ml-1 mb-1 flex h-11 w-fit items-center gap-1 text-[15px] font-semibold text-bordo">
          <IconoVolver size={20} />
          {volver.texto}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {bajada && <p className="text-[13px] font-medium text-gris">{bajada}</p>}
          <h1 className="font-serif text-[30px] leading-tight">{titulo}</h1>
        </div>
        {accion}
      </div>
    </header>
  );
}

export function TituloSeccion({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl">{children}</h2>
      {accion}
    </div>
  );
}

const ESTILO_NIVEL: Record<Nivel, string> = {
  alta: "bg-rosa text-[#6e2240]",
  media: "bg-[#f6ebd9] text-ambar-oscuro",
  baja: "bg-verde-claro text-verde-oscuro",
};

export function PildoraNivel({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`rounded-[10px] px-2 py-0.5 text-xs font-bold ${ESTILO_NIVEL[nivel]}`}>
      {nivel === "alta" ? "Alta" : nivel === "media" ? "Media" : "Baja"}
    </span>
  );
}

export const COLOR_FASE: Record<Fase, string> = {
  menstrual: "var(--bordo)",
  folicular: "var(--folicular)",
  ovulatoria: "var(--ovulatoria)",
  lutea: "var(--lutea)",
  premenstrual: "var(--lutea)",
};

export const NOMBRE_FASE: Record<Fase, string> = {
  menstrual: "Menstrual",
  folicular: "Folicular",
  ovulatoria: "Ovulatoria",
  lutea: "Lútea",
  premenstrual: "Premenstrual",
};

/** Color por categoría de deporte, para los puntos y chips de la rutina. */
export function colorDisciplina(categoria: string | undefined) {
  if (categoria === "gym") return { punto: "var(--verde)", chip: "bg-verde-claro text-verde-oscuro" };
  if (categoria === "stretching") return { punto: "var(--ambar)", chip: "bg-[#f6ebd9] text-ambar-oscuro" };
  return { punto: "var(--lutea)", chip: "bg-rosa text-[#6e2240]" };
}

/** Barra de tres tramos (bajo · rango · alto) con el valor marcado. */
export function BarraRango({ porcentaje, min, max }: { porcentaje: number; min?: string; max?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-[3px] grid h-1.5 grid-cols-3 gap-[3px]">
          <span className="rounded-full bg-borde" />
          <span className="rounded-full bg-folicular/40" />
          <span className="rounded-full bg-borde" />
        </div>
        <span
          className="absolute top-0 size-3 -translate-x-1/2 rounded-full border-[3px] border-bordo bg-tarjeta"
          style={{ left: `${porcentaje}%` }}
        />
      </div>
      {(min || max) && (
        <div className="grid grid-cols-3 text-[10px] text-gris">
          <span />
          <span className="flex justify-between">
            <span className="-translate-x-1/2">{min}</span>
            <span className="translate-x-1/2">{max}</span>
          </span>
          <span />
        </div>
      )}
    </div>
  );
}
