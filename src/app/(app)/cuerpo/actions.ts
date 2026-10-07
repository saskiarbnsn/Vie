"use server";

import { revalidatePath } from "next/cache";
import { horaEnCordoba, hoyEnCordoba } from "@/lib/ciclo";
import { crearClienteServidor } from "@/lib/supabase/server";

const CAMPOS = [
  "peso_kg",
  "grasa_pct",
  "imc",
  "tejido_magro_pct",
  "musculo_esqueletico_pct",
  "grasa_visceral",
  "tejido_oseo_pct",
  "hidratacion_pct",
  "proteina_pct",
  "edad_corporal",
  "metabolismo_basal_kcal",
] as const;

/** Carga manual de una medición de Femmto (mientras no llega por Apple Salud). */
export async function registrarMedicion(form: FormData) {
  const fila: Record<string, number | string> = {
    medido_en: `${String(form.get("fecha") || hoyEnCordoba())}T${horaEnCordoba()}:00-03:00`,
    origen: "manual",
  };
  for (const campo of CAMPOS) {
    const crudo = String(form.get(campo) ?? "").replace(",", ".").trim();
    if (crudo === "") continue;
    const n = Number(crudo);
    if (Number.isFinite(n) && n >= 0) fila[campo] = n;
  }
  if (!("peso_kg" in fila)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("composicion_corporal").insert(fila);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Prende o apaga el recordatorio de pesaje consciente. */
export async function alternarPesaje() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("recordatorios").select("id, activo").eq("tipo", "pesaje").limit(1).maybeSingle();
  const { error } = data
    ? await supabase.from("recordatorios").update({ activo: !data.activo }).eq("id", data.id)
    : await supabase.from("recordatorios").insert({ tipo: "pesaje", hora: "08:00", activo: true });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
