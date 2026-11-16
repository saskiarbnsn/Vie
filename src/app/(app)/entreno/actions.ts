"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hoyEnCordoba, lunesDe, semanaDe } from "@/lib/ciclo";
import { asegurarDias } from "@/lib/datos";
import { NIVELES, type Energia, type Nivel } from "@/lib/exigencia";
import { crearClienteServidor } from "@/lib/supabase/server";

function refrescar() {
  revalidatePath("/", "layout");
}

function esNivel(v: unknown): v is Nivel {
  return typeof v === "string" && (NIVELES as string[]).includes(v);
}

function esHora(v: unknown): v is string {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
}

/** Cómo se siente para entrenar hoy. */
export async function guardarEnergia(form: FormData) {
  const nivel = String(form.get("nivel")) as Energia;
  if (!["bien", "poca", "muy_baja"].includes(nivel)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("energia_diaria").upsert({ fecha: hoyEnCordoba(), nivel });
  if (error) throw new Error(error.message);
  refrescar();
}

/** Prende o apaga la semana de descarga de gym (semana actual). */
export async function alternarDescarga() {
  const supabase = await crearClienteServidor();
  const semana_inicio = lunesDe(hoyEnCordoba());
  const { data } = await supabase
    .from("ajustes_semana")
    .select("descarga_gym")
    .eq("semana_inicio", semana_inicio)
    .maybeSingle();
  const { error } = await supabase
    .from("ajustes_semana")
    .upsert({ semana_inicio, descarga_gym: !(data?.descarga_gym ?? false) });
  if (error) throw new Error(error.message);
  refrescar();
}

export async function alternarAjustePeriodo() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("preferencias").select("ajustar_en_periodo").eq("id", 1).maybeSingle();
  const { error } = await supabase
    .from("preferencias")
    .upsert({ id: 1, ajustar_en_periodo: !(data?.ajustar_en_periodo ?? true) });
  if (error) throw new Error(error.message);
  refrescar();
}

/** Cambia la exigencia habitual de un deporte. */
export async function cambiarExigenciaDisciplina(form: FormData) {
  const nombre = String(form.get("nombre"));
  const nivel = form.get("nivel");
  if (!esNivel(nivel)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("disciplinas").update({ exigencia_base: nivel }).eq("nombre", nombre);
  if (error) throw new Error(error.message);
  refrescar();
}

export async function crearDisciplina(form: FormData) {
  const nombre = String(form.get("nombre") ?? "").trim();
  const nivel = form.get("nivel");
  const categoria = String(form.get("categoria"));
  if (!nombre || !esNivel(nivel) || !["pole", "gym", "stretching", "otro"].includes(categoria)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("disciplinas")
    .upsert({ nombre, exigencia_base: nivel, categoria, orden: 50 });
  if (error) throw new Error(error.message);
  refrescar();
}

// ─────────────────────────────────────────────────────────────
// Rutina
// ─────────────────────────────────────────────────────────────

export type TurnoEditado = {
  hora: string;
  disciplina: string;
  duracion: number;
  exigencia: Nivel | null;
};

export type DiaEditado = {
  /** "YYYY-MM-DD" si se edita esta semana, "1".."7" si se edita la rutina base. */
  clave: string;
  turnos: TurnoEditado[];
};

function limpiarTurnos(turnos: unknown): TurnoEditado[] {
  if (!Array.isArray(turnos)) return [];
  return turnos
    .filter((t) => t && esHora(t.hora) && typeof t.disciplina === "string" && t.disciplina.trim())
    .map((t) => ({
      hora: t.hora,
      disciplina: String(t.disciplina).trim(),
      duracion: Math.min(240, Math.max(15, Math.round(Number(t.duracion) || 60))),
      exigencia: esNivel(t.exigencia) ? t.exigencia : null,
    }));
}

/**
 * Guarda la rutina.
 *  - "siempre": reemplaza la rutina base y vuelve a planificar desde hoy.
 *  - "semana": reemplaza los turnos pendientes de esta semana, de hoy en adelante.
 * Los turnos ya marcados como hechos o salteados no se tocan.
 */
export async function guardarRutina(alcance: "semana" | "siempre", dias: DiaEditado[]) {
  const supabase = await crearClienteServidor();
  const hoy = hoyEnCordoba();

  if (alcance === "siempre") {
    const filas = dias.flatMap((d) => {
      const dia = Number(d.clave);
      if (!(dia >= 1 && dia <= 7)) return [];
      return limpiarTurnos(d.turnos).map((t) => ({
        dia_semana: dia,
        hora_inicio: t.hora,
        disciplina: t.disciplina,
        duracion_min: t.duracion,
        exigencia: t.exigencia,
        activa: true,
      }));
    });
    const borrar = await supabase.from("rutina_semanal").delete().gte("id", 0);
    if (borrar.error) throw new Error(borrar.error.message);
    if (filas.length) {
      const { error } = await supabase.from("rutina_semanal").insert(filas);
      if (error) throw new Error(error.message);
    }
    // Desde hoy, los días se vuelven a armar con la rutina nueva.
    await supabase
      .from("entrenos_planificados")
      .delete()
      .eq("origen", "rutina")
      .eq("estado", "pendiente")
      .gte("fecha", hoy);
    await supabase.from("dias_planificados").delete().gte("fecha", hoy);
    await asegurarDias(supabase, semanaDe(hoy).filter((f) => f >= hoy));
  } else {
    const semana = new Set(semanaDe(hoy));
    for (const d of dias) {
      if (!semana.has(d.clave) || d.clave < hoy) continue;
      await asegurarDias(supabase, [d.clave]);
      const borrar = await supabase
        .from("entrenos_planificados")
        .delete()
        .eq("fecha", d.clave)
        .eq("estado", "pendiente");
      if (borrar.error) throw new Error(borrar.error.message);
      const filas = limpiarTurnos(d.turnos).map((t) => ({
        fecha: d.clave,
        hora_inicio: t.hora,
        disciplina: t.disciplina,
        duracion_min: t.duracion,
        exigencia: t.exigencia,
        origen: "manual",
      }));
      if (filas.length) {
        const { error } = await supabase
          .from("entrenos_planificados")
          .upsert(filas, { onConflict: "fecha,hora_inicio,disciplina", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
    }
  }

  refrescar();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Gym
// ─────────────────────────────────────────────────────────────

export type EjercicioEditado = {
  nombre: string;
  series: { kg: number; reps: number; hecha: boolean }[];
};

export async function guardarSesionGym(ejercicios: EjercicioEditado[], terminar: boolean) {
  const supabase = await crearClienteServidor();
  const fecha = hoyEnCordoba();

  const { data: sesion, error } = await supabase
    .from("sesiones_gym")
    .upsert({ fecha, terminada: terminar }, { onConflict: "fecha" })
    .select("id")
    .single();
  if (error || !sesion) throw new Error(error?.message ?? "No se pudo guardar la sesión");

  const filas = (Array.isArray(ejercicios) ? ejercicios : [])
    .filter((e) => typeof e?.nombre === "string" && e.nombre.trim() && Array.isArray(e.series))
    .flatMap((e, orden) =>
      e.series.map((s, i) => ({
        sesion_id: sesion.id,
        ejercicio: e.nombre.trim(),
        orden,
        numero: i + 1,
        kg: Math.max(0, Math.min(999, Number(s.kg) || 0)),
        reps: Math.max(0, Math.min(999, Math.round(Number(s.reps) || 0))),
        hecha: Boolean(s.hecha),
      })),
    );

  const borrar = await supabase.from("series_gym").delete().eq("sesion_id", sesion.id);
  if (borrar.error) throw new Error(borrar.error.message);
  if (filas.length) {
    const ins = await supabase.from("series_gym").insert(filas);
    if (ins.error) throw new Error(ins.error.message);
  }

  if (terminar) {
    // Marca como hecho el turno de gym planificado para hoy, si había uno.
    const { data: gyms } = await supabase.from("disciplinas").select("nombre").eq("categoria", "gym");
    const nombres = (gyms ?? []).map((g) => g.nombre);
    if (nombres.length) {
      await supabase
        .from("entrenos_planificados")
        .update({ estado: "hecho" })
        .eq("fecha", fecha)
        .eq("estado", "pendiente")
        .in("disciplina", nombres);
    }
  }

  refrescar();
  if (terminar) redirect("/entreno/gym?guardada=1");
  return { ok: true };
}
