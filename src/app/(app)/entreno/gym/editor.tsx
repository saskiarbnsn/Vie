"use client";

import { useState, useTransition } from "react";
import { IconoCerrar, IconoCheck, IconoMas } from "@/components/iconos";
import { botonPrincipal, botonSecundario, tarjeta } from "@/components/ui";
import { guardarSesionGym, type EjercicioEditado } from "../actions";

export function EditorGym({
  inicial,
  laVezPasada,
  sugeridos,
  terminada,
}: {
  inicial: EjercicioEditado[];
  laVezPasada: Record<string, string>;
  sugeridos: string[];
  terminada: boolean;
}) {
  const [ejercicios, setEjercicios] = useState(inicial);
  const [nuevo, setNuevo] = useState("");
  const [guardado, setGuardado] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (fn: (e: EjercicioEditado[]) => void) => {
    const copia = structuredClone(ejercicios);
    fn(copia);
    setEjercicios(copia);
    setGuardado(null);
  };

  const total = ejercicios.reduce((t, e) => t + e.series.length, 0);
  const hechas = ejercicios.reduce((t, e) => t + e.series.filter((s) => s.hecha).length, 0);
  const volumen = ejercicios.reduce(
    (t, e) => t + e.series.filter((s) => s.hecha).reduce((v, s) => v + s.kg * s.reps, 0),
    0,
  );

  const agregar = (nombre: string) => {
    const limpio = nombre.trim();
    if (!limpio || ejercicios.some((e) => e.nombre === limpio)) return;
    cambiar((x) => x.push({ nombre: limpio, series: [{ kg: 0, reps: 10, hecha: false }] }));
    setNuevo("");
  };

  const guardar = (terminar: boolean) =>
    iniciar(async () => {
      await guardarSesionGym(ejercicios, terminar);
      if (!terminar) setGuardado("Progreso guardado.");
    });

  return (
    <>
      <div className="flex items-center justify-between text-[13px] font-semibold text-gris tabular-nums">
        <span>
          {hechas} de {total} series
        </span>
        {terminada && <span className="text-verde">Sesión terminada</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-linea">
        <div className="h-full rounded-full bg-bordo" style={{ width: `${total ? (hechas / total) * 100 : 0}%` }} />
      </div>

      {ejercicios.map((e, ei) => (
        <section key={e.nombre} className={`${tarjeta} flex flex-col gap-2.5 p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold">{e.nombre}</h2>
              <span className="text-[13px] tabular-nums text-gris">
                {laVezPasada[e.nombre] ? `La vez pasada: ${laVezPasada[e.nombre]}` : "Primera vez"}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Quitar ${e.nombre}`}
              onClick={() => cambiar((x) => x.splice(ei, 1))}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris hover:bg-crema"
            >
              <IconoCerrar size={18} />
            </button>
          </div>

          <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-2 text-[11px] font-bold tracking-wide text-gris">
            <span>SERIE</span>
            <span className="text-center">KG</span>
            <span className="text-center">REPS</span>
            <span className="text-center">OK</span>
          </div>

          {e.series.map((s, si) => (
            <div
              key={si}
              className={`-mx-1.5 grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2 rounded-[14px] p-1.5 ${
                s.hecha ? "bg-verde-claro" : ""
              }`}
            >
              <span className="text-center text-[15px] font-bold tabular-nums">{si + 1}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                aria-label={`Kilos de la serie ${si + 1} de ${e.nombre}`}
                value={s.kg}
                onChange={(ev) => cambiar((x) => (x[ei].series[si].kg = Number(ev.target.value)))}
                className="h-11 w-full rounded-xl border border-borde bg-tarjeta text-center text-[15px] font-semibold tabular-nums"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                aria-label={`Repeticiones de la serie ${si + 1} de ${e.nombre}`}
                value={s.reps}
                onChange={(ev) => cambiar((x) => (x[ei].series[si].reps = Number(ev.target.value)))}
                className="h-11 w-full rounded-xl border border-borde bg-tarjeta text-center text-[15px] font-semibold tabular-nums"
              />
              <button
                type="button"
                aria-pressed={s.hecha}
                aria-label={`Serie ${si + 1} hecha`}
                onClick={() => cambiar((x) => (x[ei].series[si].hecha = !x[ei].series[si].hecha))}
                className={`flex size-11 items-center justify-center rounded-full ${
                  s.hecha ? "bg-verde text-white" : "border-[1.5px] border-borde bg-tarjeta text-[#b8a898]"
                }`}
              >
                <IconoCheck size={18} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              cambiar((x) => {
                const ult = x[ei].series.at(-1);
                x[ei].series.push({ kg: ult?.kg ?? 0, reps: ult?.reps ?? 10, hecha: false });
              })
            }
            className="flex h-11 w-fit items-center gap-1.5 text-sm font-semibold text-bordo"
          >
            <IconoMas size={16} />
            Agregar serie
          </button>
        </section>
      ))}

      <section className="flex flex-col gap-2 rounded-[20px] border border-dashed border-[#b8a898] bg-tarjeta p-4">
        <label htmlFor="nuevo-ejercicio" className="text-sm font-semibold">
          Agregar ejercicio
        </label>
        <div className="flex gap-2">
          <input
            id="nuevo-ejercicio"
            list="ejercicios-conocidos"
            value={nuevo}
            onChange={(ev) => setNuevo(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                agregar(nuevo);
              }
            }}
            placeholder="Ej: Peso muerto rumano"
            className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-tarjeta px-3 text-[15px]"
          />
          <button type="button" onClick={() => agregar(nuevo)} className={botonSecundario}>
            Sumar
          </button>
        </div>
        <datalist id="ejercicios-conocidos">
          {sugeridos.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </section>

      <section className={`${tarjeta} flex flex-col gap-3.5`}>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wide text-gris">SERIES</span>
            <span className="text-[22px] font-semibold tabular-nums">
              {hechas} / {total}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wide text-gris">VOLUMEN</span>
            <span className="text-[22px] font-semibold tabular-nums">{Math.round(volumen).toLocaleString("es-AR")} kg</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={pendiente} onClick={() => guardar(false)} className={botonSecundario}>
            Guardar
          </button>
          <button type="button" disabled={pendiente || total === 0} onClick={() => guardar(true)} className={botonPrincipal}>
            Terminar
          </button>
        </div>
        {guardado && (
          <p role="status" className="text-center text-[13px] text-verde-oscuro">
            {guardado}
          </p>
        )}
      </section>
    </>
  );
}
