/**
 * Todo lo que se calcula para "hoy": se usa en Inicio, Entreno y Comidas.
 */

import { horaEnCordoba, hoyEnCordoba } from "./ciclo";
import { comidasDelDia } from "./comidas";
import { asegurarDias, cargarContexto, cargarEntrenos, cargarPeriodos, exigencias } from "./datos";
import type { Nivel } from "./exigencia";
import { aMinutos, ajustesDelDia, armarBloques, esDobleTurno } from "./plan";
import { crearClienteServidor } from "./supabase/server";

export async function cargarHoy() {
  const supabase = await crearClienteServidor();
  const fecha = hoyEnCordoba();
  const ahora = aMinutos(horaEnCordoba());

  await asegurarDias(supabase, [fecha]);
  const [periodos, entrenos] = await Promise.all([
    cargarPeriodos(supabase),
    cargarEntrenos(supabase, fecha, fecha),
  ]);
  const { ctx, ciclo, energia } = await cargarContexto(supabase, fecha, periodos);

  const exig = exigencias(entrenos, ctx);
  const niveles = new Map<number, Nivel>([...exig].map(([id, e]) => [id, e.nivel]));
  const bloques = armarBloques(entrenos);
  const doble = esDobleTurno(bloques);

  return {
    supabase,
    fecha,
    ahora,
    periodos,
    ciclo,
    ctx,
    energia,
    entrenos,
    exig,
    bloques,
    doble,
    comidas: comidasDelDia({ bloques, niveles, fase: ciclo?.fase ?? null, ahora }),
    ajustes: ajustesDelDia(ciclo?.fase ?? null, doble),
  };
}

export function fechaLarga(fecha: string, opciones: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", ...opciones }).format(new Date(`${fecha}T12:00:00Z`));
}

/** Primera letra en mayúscula ("miércoles, 7 de octubre" → "Miércoles, 7 de octubre"). */
export function mayuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
