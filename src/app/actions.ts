"use server";

import { revalidatePath } from "next/cache";
import { hoyEnCordoba } from "@/lib/ciclo";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Agrega un entreno planificado a mano (típicamente el gym, que no tiene horario fijo). */
export async function planificarEntreno(form: FormData) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("entrenos_planificados").insert({
    fecha: String(form.get("fecha") || hoyEnCordoba()),
    hora_inicio: String(form.get("hora")),
    disciplina: String(form.get("disciplina")),
    duracion_min: Number(form.get("duracion") || 60),
    origen: "manual",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Marca un entreno como hecho, salteado o lo vuelve a pendiente. */
export async function cambiarEstadoEntreno(form: FormData) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("entrenos_planificados")
    .update({ estado: String(form.get("estado")) })
    .eq("id", Number(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Borra un entreno planificado a mano (los de la rutina se saltean, no se borran). */
export async function borrarEntreno(form: FormData) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("entrenos_planificados")
    .delete()
    .eq("id", Number(form.get("id")))
    .eq("origen", "manual");
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

async function leerHabitos(fecha: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("habitos_diarios")
    .select("agua_ml, creatina")
    .eq("fecha", fecha)
    .maybeSingle();
  return { supabase, actual: data ?? { agua_ml: 0, creatina: false } };
}

export async function sumarAgua(form: FormData) {
  const fecha = hoyEnCordoba();
  const { supabase, actual } = await leerHabitos(fecha);
  const agua_ml = Math.max(0, actual.agua_ml + Number(form.get("ml")));
  const { error } = await supabase
    .from("habitos_diarios")
    .upsert({ fecha, agua_ml, creatina: actual.creatina });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function alternarCreatina() {
  const fecha = hoyEnCordoba();
  const { supabase, actual } = await leerHabitos(fecha);
  const { error } = await supabase
    .from("habitos_diarios")
    .upsert({ fecha, agua_ml: actual.agua_ml, creatina: !actual.creatina });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
