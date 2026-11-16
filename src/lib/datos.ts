/**
 * Lecturas compartidas entre pantallas. Todo lo de acá corre en el servidor.
 */

import { diaSemanaIso, estadoCiclo, lunesDe, type EstadoCiclo, type Periodo } from "./ciclo";
import {
  exigenciaDe,
  type Contexto,
  type Disciplina,
  type Energia,
  type Exigencia,
} from "./exigencia";
import type { EntrenoDelDia } from "./plan";
import { crearClienteServidor } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>;

/**
 * Copia la rutina semanal a los entrenos planificados de cada fecha, una sola vez
 * por fecha. Si después se mueve un turno "solo esta semana", no vuelve a aparecer.
 */
export async function asegurarDias(supabase: Supabase, fechas: string[]) {
  const { data: hechos } = await supabase.from("dias_planificados").select("fecha").in("fecha", fechas);
  const listos = new Set((hechos ?? []).map((d) => d.fecha));
  const faltan = fechas.filter((f) => !listos.has(f));
  if (faltan.length === 0) return;

  const { data: rutina } = await supabase
    .from("rutina_semanal")
    .select("dia_semana, hora_inicio, disciplina, duracion_min, exigencia")
    .eq("activa", true);

  const filas = faltan.flatMap((fecha) =>
    (rutina ?? [])
      .filter((r) => r.dia_semana === diaSemanaIso(fecha))
      .map((r) => ({
        fecha,
        hora_inicio: r.hora_inicio,
        disciplina: r.disciplina,
        duracion_min: r.duracion_min,
        exigencia: r.exigencia,
        origen: "rutina",
      })),
  );
  if (filas.length) {
    await supabase
      .from("entrenos_planificados")
      .upsert(filas, { onConflict: "fecha,hora_inicio,disciplina", ignoreDuplicates: true });
  }
  await supabase
    .from("dias_planificados")
    .upsert(faltan.map((fecha) => ({ fecha })), { ignoreDuplicates: true });
}

export async function cargarPeriodos(supabase: Supabase): Promise<Periodo[]> {
  const { data } = await supabase.from("periodos").select("fecha_inicio, fecha_fin").order("fecha_inicio");
  return data ?? [];
}

export type Entreno = EntrenoDelDia & { fecha: string };

export async function cargarEntrenos(supabase: Supabase, desde: string, hasta: string): Promise<Entreno[]> {
  const { data } = await supabase
    .from("entrenos_planificados")
    .select("id, fecha, hora_inicio, disciplina, duracion_min, estado, origen, exigencia")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha")
    .order("hora_inicio");
  return (data ?? []) as Entreno[];
}

/** Todo lo que hace falta para calcular la exigencia de los turnos de un día. */
export async function cargarContexto(
  supabase: Supabase,
  fecha: string,
  periodos: Periodo[],
): Promise<{ ctx: Contexto; ciclo: EstadoCiclo | null; energia: Energia | null }> {
  const [disciplinas, semana, prefs, energia] = await Promise.all([
    supabase.from("disciplinas").select("nombre, categoria, exigencia_base, orden").order("orden"),
    supabase.from("ajustes_semana").select("descarga_gym").eq("semana_inicio", lunesDe(fecha)).maybeSingle(),
    supabase.from("preferencias").select("ajustar_en_periodo").eq("id", 1).maybeSingle(),
    supabase.from("energia_diaria").select("nivel").eq("fecha", fecha).maybeSingle(),
  ]);
  const ciclo = estadoCiclo(periodos, fecha);
  const nivelEnergia = (energia.data?.nivel ?? null) as Energia | null;
  return {
    ciclo,
    energia: nivelEnergia,
    ctx: {
      disciplinas: (disciplinas.data ?? []) as Disciplina[],
      descargaGym: semana.data?.descarga_gym ?? false,
      enPeriodo: ciclo?.fase === "menstrual",
      ajustarEnPeriodo: prefs.data?.ajustar_en_periodo ?? true,
      energia: nivelEnergia,
    },
  };
}

export function exigencias(entrenos: EntrenoDelDia[], ctx: Contexto): Map<number, Exigencia> {
  return new Map(entrenos.map((e) => [e.id, exigenciaDe(e, ctx)]));
}
