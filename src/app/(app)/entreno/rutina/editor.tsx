"use client";

import { useState, useTransition } from "react";
import { IconoCerrar, IconoMas } from "@/components/iconos";
import { PildoraNivel, colorDisciplina, tarjeta } from "@/components/ui";
import {
  NIVELES,
  NOMBRE_NIVEL,
  buscarDisciplina,
  exigenciaDe,
  type Disciplina,
  type Nivel,
} from "@/lib/exigencia";
import { guardarRutina, type DiaEditado } from "../actions";

export type TurnoParaEditar = {
  hora: string;
  disciplina: string;
  duracion: number;
  exigencia: Nivel | null;
  /** "Hecho" o "Salteado": ya pasó y no se edita. */
  bloqueado: string | null;
};

export type DiaParaEditar = {
  clave: string;
  titulo: string;
  subtitulo: string;
  editable: boolean;
  enPeriodo: boolean;
  turnos: TurnoParaEditar[];
};

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function esDoble(turnos: TurnoParaEditar[]) {
  const t = [...turnos].sort((a, b) => aMin(a.hora) - aMin(b.hora));
  return t.some((x, i) => i > 0 && aMin(x.hora) - (aMin(t[i - 1].hora) + t[i - 1].duracion) <= 15);
}

export function EditorRutina({
  alcance,
  dias: inicial,
  disciplinas,
  descargaGym,
  ajustarEnPeriodo,
}: {
  alcance: "semana" | "siempre";
  dias: DiaParaEditar[];
  disciplinas: Disciplina[];
  descargaGym: boolean;
  ajustarEnPeriodo: boolean;
}) {
  const [dias, setDias] = useState(inicial);
  const [sel, setSel] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const firma = (t: TurnoParaEditar[]) =>
    JSON.stringify([...t].sort((a, b) => a.hora.localeCompare(b.hora) || a.disciplina.localeCompare(b.disciplina)));
  const editados = dias.filter((d, i) => firma(d.turnos) !== firma(inicial[i].turnos));

  const cambiar = (di: number, fn: (t: TurnoParaEditar[]) => void) => {
    const copia = structuredClone(dias);
    fn(copia[di].turnos);
    setDias(copia);
    setMensaje(null);
  };

  const guardar = () =>
    iniciar(async () => {
      const payload: DiaEditado[] = (alcance === "siempre" ? dias : editados)
        .filter((d) => d.editable)
        .map((d) => ({
          clave: d.clave,
          turnos: d.turnos
            .filter((t) => !t.bloqueado)
            .map(({ hora, disciplina, duracion, exigencia }) => ({ hora, disciplina, duracion, exigencia })),
        }));
      await guardarRutina(alcance, payload);
      setSel(null);
      setMensaje(
        editados.length === 0
          ? "No había cambios para guardar."
          : `Guardado ${alcance === "semana" ? "para esta semana" : "en tu rutina base"}. Recalculé las comidas de ${
              editados.length
            } ${editados.length === 1 ? "día" : "días"}.`,
      );
    });

  return (
    <>
      {dias.map((d, di) => {
        const editado = editados.includes(d);
        return (
          <section
            key={d.clave}
            className={`${tarjeta} flex flex-col gap-1.5 px-4 pb-2 pt-3.5 ${editado ? "border-[1.5px] border-bordo" : ""} ${
              d.editable ? "" : "opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">{d.titulo}</h2>
              {d.subtitulo && <span className="text-[13px] text-gris">{d.subtitulo}</span>}
              <span className="flex-1" />
              {esDoble(d.turnos) && (
                <span className="rounded-[10px] bg-ambar-claro px-2 py-1 text-[11px] font-bold text-[#7a4a0e]">
                  Doble turno
                </span>
              )}
              {d.enPeriodo && (
                <span className="rounded-[10px] bg-rosa px-2 py-1 text-[11px] font-bold text-bordo">Período</span>
              )}
              {editado && (
                <span className="rounded-[10px] bg-bordo px-2 py-1 text-[11px] font-bold text-white">Editado</span>
              )}
            </div>

            {d.turnos.map((t, ti) => {
              const id = `${d.clave}-${ti}`;
              const abierto = sel === id;
              const disc = buscarDisciplina(disciplinas, t.disciplina);
              const ex = exigenciaDe(t, {
                disciplinas,
                descargaGym: alcance === "semana" && descargaGym,
                enPeriodo: d.enPeriodo,
                ajustarEnPeriodo,
                energia: null,
              });
              const sinAjuste = exigenciaDe(
                { disciplina: t.disciplina, exigencia: null },
                { disciplinas, descargaGym: alcance === "semana" && descargaGym, enPeriodo: d.enPeriodo, ajustarEnPeriodo, energia: null },
              ).nivel;
              const puedeEditar = d.editable && !t.bloqueado;
              return (
                <div
                  key={id}
                  className={
                    abierto ? "-mx-1.5 flex flex-col gap-1 rounded-2xl bg-crema px-2.5 pb-3 pt-1.5" : "border-t border-linea"
                  }
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!puedeEditar}
                      aria-expanded={abierto}
                      onClick={() => setSel(abierto ? null : id)}
                      className="flex min-h-[52px] flex-1 items-center gap-3 py-1.5 text-left"
                    >
                      <span className="w-12 text-base font-semibold tabular-nums">{t.hora}</span>
                      <span
                        className="h-10 w-1 shrink-0 rounded-full"
                        style={{ background: colorDisciplina(disc.categoria).punto }}
                      />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold">{t.disciplina}</span>
                        <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-gris">
                          {t.duracion} min
                          <PildoraNivel nivel={ex.nivel} />
                          {t.bloqueado ? <span>{t.bloqueado}</span> : ex.motivo && <span className="italic">{ex.motivo}</span>}
                        </span>
                      </span>
                    </button>
                    {puedeEditar && (
                      <button
                        type="button"
                        aria-label={`Quitar ${t.disciplina} de las ${t.hora}`}
                        onClick={() => {
                          cambiar(di, (x) => x.splice(ti, 1));
                          setSel(null);
                        }}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-gris hover:bg-crema"
                      >
                        <IconoCerrar size={18} />
                      </button>
                    )}
                  </div>

                  {abierto && (
                    <div className="flex flex-col gap-3.5 px-1 pt-1.5">
                      <fieldset className="flex flex-col gap-2">
                        <legend className="pb-2 text-xs font-bold tracking-wide text-gris">DEPORTE</legend>
                        <div className="flex flex-wrap gap-1.5">
                          {disciplinas.map((o) => {
                            const activo = o.nombre === t.disciplina;
                            return (
                              <button
                                key={o.nombre}
                                type="button"
                                aria-pressed={activo}
                                onClick={() =>
                                  cambiar(di, (x) => {
                                    x[ti].disciplina = o.nombre;
                                    x[ti].exigencia = null;
                                  })
                                }
                                className={`min-h-10 rounded-full border px-3.5 text-[13px] ${
                                  activo
                                    ? "border-bordo bg-bordo font-semibold text-white"
                                    : "border-borde bg-tarjeta font-medium"
                                }`}
                              >
                                {o.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold tracking-wide text-gris">HORA</span>
                          <input
                            type="time"
                            step={900}
                            value={t.hora}
                            onChange={(e) => e.target.value && cambiar(di, (x) => (x[ti].hora = e.target.value))}
                            className="h-11 rounded-[14px] border border-borde bg-tarjeta px-3 text-base font-semibold tabular-nums"
                          />
                        </label>
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold tracking-wide text-gris">DURACIÓN</span>
                          <div className="flex items-center justify-between rounded-[14px] border border-borde bg-tarjeta">
                            <button
                              type="button"
                              aria-label="15 minutos menos"
                              onClick={() => cambiar(di, (x) => (x[ti].duracion = Math.max(15, x[ti].duracion - 15)))}
                              className="size-11 text-xl font-semibold text-bordo"
                            >
                              −
                            </button>
                            <span className="text-base font-semibold tabular-nums">{t.duracion} min</span>
                            <button
                              type="button"
                              aria-label="15 minutos más"
                              onClick={() => cambiar(di, (x) => (x[ti].duracion = Math.min(240, x[ti].duracion + 15)))}
                              className="size-11 text-xl font-semibold text-bordo"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <fieldset className="flex flex-col gap-2">
                        <legend className="pb-2 text-xs font-bold tracking-wide text-gris">EXIGENCIA DE ESTE TURNO</legend>
                        <div className="grid grid-cols-3 gap-1 rounded-[14px] border border-borde bg-tarjeta p-[3px]">
                          {NIVELES.map((n) => {
                            const activo = ex.nivel === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-pressed={activo}
                                onClick={() => cambiar(di, (x) => (x[ti].exigencia = n === sinAjuste ? null : n))}
                                className={`h-10 rounded-[10px] text-sm ${
                                  activo ? "bg-bordo font-semibold text-white" : "font-medium"
                                }`}
                              >
                                {NOMBRE_NIVEL[n]}
                              </button>
                            );
                          })}
                        </div>
                        {t.exigencia && (
                          <button
                            type="button"
                            onClick={() => cambiar(di, (x) => (x[ti].exigencia = null))}
                            className="h-10 w-fit text-[13px] font-semibold text-bordo"
                          >
                            Volver a la del deporte ({NOMBRE_NIVEL[sinAjuste].toLowerCase()})
                          </button>
                        )}
                      </fieldset>

                      <button
                        type="button"
                        onClick={() => setSel(null)}
                        className="h-11 rounded-full border border-bordo text-sm font-semibold text-bordo"
                      >
                        Listo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {d.turnos.length === 0 && <span className="py-1 text-sm text-gris">Descanso</span>}

            {d.editable && (
              <button
                type="button"
                onClick={() => {
                  const ult = [...d.turnos].sort((a, b) => aMin(a.hora) - aMin(b.hora)).at(-1);
                  const hora = ult ? aHora(Math.min(23 * 60, aMin(ult.hora) + ult.duracion)) : "19:00";
                  const gym = disciplinas.find((x) => x.categoria === "gym")?.nombre ?? disciplinas[0]?.nombre ?? "Gym";
                  cambiar(di, (x) => x.push({ hora, disciplina: gym, duracion: 60, exigencia: null, bloqueado: null }));
                  setSel(`${d.clave}-${d.turnos.length}`);
                }}
                className="flex h-11 w-fit items-center gap-1.5 text-sm font-semibold text-bordo"
              >
                <IconoMas size={16} />
                Agregar turno
              </button>
            )}
          </section>
        );
      })}

      <div className="sticky bottom-24 z-10 flex flex-col gap-2 rounded-[20px] border border-borde bg-tarjeta/95 p-3 shadow-lg backdrop-blur">
        {mensaje && (
          <p role="status" className="text-center text-[13px] text-verde-oscuro">
            {mensaje}
          </p>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente || editados.length === 0}
          className="flex h-12 items-center justify-center rounded-full bg-bordo text-[15px] font-semibold text-white disabled:opacity-50"
        >
          {pendiente
            ? "Guardando…"
            : editados.length === 0
              ? "Sin cambios"
              : `Guardar ${editados.length} ${editados.length === 1 ? "día" : "días"} · ${
                  alcance === "semana" ? "solo esta semana" : "todas las semanas"
                }`}
        </button>
      </div>
    </>
  );
}
