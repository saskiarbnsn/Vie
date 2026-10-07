"use server";

import { revalidatePath } from "next/cache";
import { hoyEnCordoba } from "@/lib/ciclo";
import { SINTOMAS } from "@/lib/sintomas";
import { crearClienteServidor } from "@/lib/supabase/server";


function refrescar() {
  revalidatePath("/", "layout");
}

/** Marca el inicio de un período (hoy, o la fecha que se elija). */
export async function iniciarPeriodo(form: FormData) {
  const fecha = String(form.get("fecha") || hoyEnCordoba());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("periodos")
    .upsert({ fecha_inicio: fecha }, { onConflict: "fecha_inicio", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  refrescar();
}

/** Cierra el período abierto con fecha de hoy. */
export async function terminarPeriodo() {
  const supabase = await crearClienteServidor();
  const hoy = hoyEnCordoba();
  const { data } = await supabase
    .from("periodos")
    .select("id, fecha_inicio")
    .is("fecha_fin", null)
    .lte("fecha_inicio", hoy)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return;
  const { error } = await supabase.from("periodos").update({ fecha_fin: hoy }).eq("id", data.id);
  if (error) throw new Error(error.message);
  refrescar();
}

async function registroDeHoy() {
  const supabase = await crearClienteServidor();
  const fecha = hoyEnCordoba();
  const { data } = await supabase
    .from("registro_ciclo")
    .select("flujo, sintomas, animo")
    .eq("fecha", fecha)
    .maybeSingle();
  return { supabase, fecha, actual: data ?? { flujo: null, sintomas: [] as string[], animo: [] as string[] } };
}

/** Prende o apaga un síntoma o el ánimo sensible de hoy. */
export async function alternarSintoma(form: FormData) {
  const valor = String(form.get("valor"));
  const campo = form.get("campo") === "animo" ? "animo" : "sintomas";
  if (campo === "sintomas" && !(valor in SINTOMAS)) return;
  if (campo === "animo" && valor !== "sensible") return;
  const { supabase, fecha, actual } = await registroDeHoy();
  const lista: string[] = actual[campo] ?? [];
  const nueva = lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  const { error } = await supabase.from("registro_ciclo").upsert({ ...actual, fecha, [campo]: nueva });
  if (error) throw new Error(error.message);
  refrescar();
}

export async function guardarFlujo(form: FormData) {
  const flujo = String(form.get("flujo"));
  if (!["poco", "media", "mucho", "inundacion"].includes(flujo)) return;
  const { supabase, fecha, actual } = await registroDeHoy();
  const { error } = await supabase
    .from("registro_ciclo")
    .upsert({ ...actual, fecha, flujo: actual.flujo === flujo ? null : flujo });
  if (error) throw new Error(error.message);
  refrescar();
}
