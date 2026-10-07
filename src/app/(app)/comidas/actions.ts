"use server";

import { revalidatePath } from "next/cache";
import { horaEnCordoba, hoyEnCordoba } from "@/lib/ciclo";
import { crearClienteServidor } from "@/lib/supabase/server";

const MOMENTOS = ["desayuno", "pre_entreno", "post_entreno", "almuerzo", "merienda", "cena", "snack"];

export async function registrarComida(form: FormData) {
  const momento = String(form.get("momento"));
  const descripcion = String(form.get("descripcion") ?? "").trim();
  const hora = String(form.get("hora") || horaEnCordoba());
  if (!MOMENTOS.includes(momento) || !descripcion || !/^\d{2}:\d{2}$/.test(hora)) return;
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("comidas")
    .insert({ fecha: hoyEnCordoba(), hora, momento, descripcion: descripcion.slice(0, 300) });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function borrarComida(form: FormData) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("comidas").delete().eq("id", Number(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
