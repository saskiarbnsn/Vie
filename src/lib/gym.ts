/**
 * Registro de gym: sesiones con ejercicios, series, kilos y repeticiones.
 */

import type { crearClienteServidor } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>;

export type Serie = { ejercicio: string; orden: number; numero: number; kg: number; reps: number; hecha: boolean };
export type Sesion = { id: number; fecha: string; terminada: boolean; series: Serie[] };

/** Ejercicios en el orden de la sesión, cada uno con sus series. */
export function agrupar(series: Serie[]) {
  const porNombre = new Map<string, { nombre: string; orden: number; series: Serie[] }>();
  for (const s of [...series].sort((a, b) => a.orden - b.orden || a.numero - b.numero)) {
    const e = porNombre.get(s.ejercicio) ?? { nombre: s.ejercicio, orden: s.orden, series: [] };
    e.series.push(s);
    porNombre.set(s.ejercicio, e);
  }
  return [...porNombre.values()].sort((a, b) => a.orden - b.orden);
}

const kg = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })} kg`;

/** "3 × 12 · 40 kg" con las series hechas (o todas, si no hay ninguna marcada). */
export function resumenEjercicio(series: Serie[]) {
  const validas = series.some((s) => s.hecha) ? series.filter((s) => s.hecha) : series;
  if (validas.length === 0) return { texto: "", kgMax: 0, repsMax: 0 };
  const kgMax = Math.max(...validas.map((s) => Number(s.kg)));
  const repsMax = Math.max(...validas.filter((s) => Number(s.kg) === kgMax).map((s) => s.reps));
  return { texto: `${validas.length} × ${repsMax}${kgMax > 0 ? ` · ${kg(kgMax)}` : ""}`, kgMax, repsMax };
}

function tendencia(actual: Serie[], anterior: Serie[] | undefined): string | null {
  if (!anterior) return null;
  const a = resumenEjercicio(actual);
  const b = resumenEjercicio(anterior);
  const dk = Math.round((a.kgMax - b.kgMax) * 10) / 10;
  if (dk !== 0) return `${dk > 0 ? "+" : ""}${dk.toLocaleString("es-AR")} kg`;
  const dr = a.repsMax - b.repsMax;
  if (dr !== 0) return `${dr > 0 ? "+" : ""}${dr} rep`;
  return "igual";
}

async function sesionesTerminadas(supabase: Supabase, hasta: string, limite: number): Promise<Sesion[]> {
  const { data } = await supabase
    .from("sesiones_gym")
    .select("id, fecha, terminada, series_gym (ejercicio, orden, numero, kg, reps, hecha)")
    .eq("terminada", true)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .limit(limite);
  return (data ?? []).map((s) => ({
    id: s.id,
    fecha: s.fecha,
    terminada: s.terminada,
    series: (s.series_gym ?? []).map((x) => ({ ...x, kg: Number(x.kg) })),
  }));
}

/** La última vez que se hizo cada ejercicio, antes de `fecha`. */
export function ultimaVez(sesiones: Sesion[], fecha: string) {
  const mapa = new Map<string, Serie[]>();
  for (const s of sesiones.filter((s) => s.fecha < fecha)) {
    for (const e of agrupar(s.series)) if (!mapa.has(e.nombre)) mapa.set(e.nombre, e.series);
  }
  return mapa;
}

export async function cargarResumenGym(supabase: Supabase, fecha: string) {
  const sesiones = await sesionesTerminadas(supabase, fecha, 20);
  const ultima = sesiones[0];
  if (!ultima) return { ultima: null, destacados: [] };
  const previas = ultimaVez(sesiones, ultima.fecha);
  const ejercicios = agrupar(ultima.series);
  return {
    ultima: {
      fecha: ultima.fecha,
      ejercicios: ejercicios.length,
      series: ultima.series.filter((s) => s.hecha).length || ultima.series.length,
    },
    destacados: ejercicios.slice(0, 3).map((e) => ({
      nombre: e.nombre,
      resumen: resumenEjercicio(e.series).texto,
      tendencia: tendencia(e.series, previas.get(e.nombre)),
    })),
  };
}

export async function cargarSesionDeHoy(supabase: Supabase, fecha: string) {
  const [hoy, sesiones, nombres] = await Promise.all([
    supabase
      .from("sesiones_gym")
      .select("id, fecha, terminada, series_gym (ejercicio, orden, numero, kg, reps, hecha)")
      .eq("fecha", fecha)
      .maybeSingle(),
    sesionesTerminadas(supabase, fecha, 30),
    supabase.from("series_gym").select("ejercicio").limit(500),
  ]);

  const previas = ultimaVez(sesiones, fecha);
  const anterior = sesiones.find((s) => s.fecha < fecha);

  let ejercicios: { nombre: string; series: { kg: number; reps: number; hecha: boolean }[] }[];
  let origen: "hoy" | "anterior" | "vacia";
  if (hoy.data) {
    origen = "hoy";
    ejercicios = agrupar((hoy.data.series_gym ?? []).map((x) => ({ ...x, kg: Number(x.kg) }))).map((e) => ({
      nombre: e.nombre,
      series: e.series.map((s) => ({ kg: s.kg, reps: s.reps, hecha: s.hecha })),
    }));
  } else if (anterior) {
    // Arranca con lo de la vez pasada, para no cargar todo de cero.
    origen = "anterior";
    ejercicios = agrupar(anterior.series).map((e) => ({
      nombre: e.nombre,
      series: e.series.map((s) => ({ kg: s.kg, reps: s.reps, hecha: false })),
    }));
  } else {
    origen = "vacia";
    ejercicios = [];
  }

  const laVezPasada: Record<string, string> = {};
  for (const [nombre, series] of previas) laVezPasada[nombre] = resumenEjercicio(series).texto;

  const conocidos = [...new Set((nombres.data ?? []).map((n) => n.ejercicio))].sort();

  return {
    origen,
    terminada: hoy.data?.terminada ?? false,
    ejercicios,
    laVezPasada,
    conocidos,
    anteriorFecha: anterior?.fecha ?? null,
    historial: sesiones.slice(0, 5).map((s) => {
      const ej = agrupar(s.series);
      return {
        fecha: s.fecha,
        texto: `${ej.length} ejercicios · ${s.series.filter((x) => x.hecha).length || s.series.length} series`,
        volumen: s.series.filter((x) => x.hecha).reduce((t, x) => t + x.kg * x.reps, 0),
      };
    }),
  };
}
