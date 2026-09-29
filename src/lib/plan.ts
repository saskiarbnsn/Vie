/**
 * Reglas del plan de @mechicaracoche (Integral Nutrición) convertidas en lógica.
 *
 * Todo lo de acá es puro (sin base de datos) para poder probarlo aislado:
 * recibe los entrenos del día y la fase del ciclo, y devuelve qué hacer.
 */

import type { Fase } from "./ciclo";

export type EntrenoDelDia = {
  id: number;
  hora_inicio: string; // "HH:MM" o "HH:MM:SS"
  disciplina: string;
  duracion_min: number;
  estado: "pendiente" | "hecho" | "salteado";
  origen: "rutina" | "manual";
};

export type Bloque = { entrenos: EntrenoDelDia[]; inicio: number; fin: number };

export type PreEntreno = {
  desde: string; // "HH:MM"
  hasta: string;
  paraBloque: Bloque;
  prioritario: boolean;
};

/** Minutos de separación máximos para considerar dos clases como un mismo bloque. */
const PAUSA_MAX_MIN = 15;
/** El pre entreno va 60–90 min antes. */
const PRE_DESDE_MIN = 90;
const PRE_HASTA_MIN = 60;

export const OPCIONES_PRE = [
  { opcion: "A", que: "Banana + yogur griego", porque: "Hidrato rápido + proteína" },
  { opcion: "B", que: "Fruta + frutos secos", porque: "Hidrato + grasa de absorción media" },
  { opcion: "C", que: "Pan con queso untable + fruta", porque: "Hidrato + proteína" },
] as const;

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function aHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Agrupa clases seguidas (doble turno) en un mismo bloque. Ignora las salteadas. */
export function armarBloques(entrenos: EntrenoDelDia[]): Bloque[] {
  const ordenados = entrenos
    .filter((e) => e.estado !== "salteado")
    .sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio));

  const bloques: Bloque[] = [];
  for (const e of ordenados) {
    const inicio = aMinutos(e.hora_inicio);
    const fin = inicio + e.duracion_min;
    const ultimo = bloques.at(-1);
    if (ultimo && inicio - ultimo.fin <= PAUSA_MAX_MIN) {
      ultimo.entrenos.push(e);
      ultimo.fin = Math.max(ultimo.fin, fin);
    } else {
      bloques.push({ entrenos: [e], inicio, fin });
    }
  }
  return bloques;
}

export function esDobleTurno(bloques: Bloque[]): boolean {
  return bloques.some((b) => b.entrenos.length >= 2);
}

/**
 * Un pre entreno por bloque. En doble turno consecutivo es prioridad absoluta,
 * porque es el combustible para las dos clases.
 */
export function preEntrenos(bloques: Bloque[]): PreEntreno[] {
  return bloques.map((b) => ({
    desde: aHora(Math.max(0, b.inicio - PRE_DESDE_MIN)),
    hasta: aHora(Math.max(0, b.inicio - PRE_HASTA_MIN)),
    paraBloque: b,
    prioritario: b.entrenos.length >= 2,
  }));
}

/** Objetivo de agua del día, en ml. */
export function objetivoAgua(dobleTurno: boolean): number {
  return dobleTurno ? 3000 : 2500;
}

/** Ajustes del día según la fase del ciclo y la carga de entrenamiento. */
export function ajustesDelDia(fase: Fase | null, dobleTurno: boolean): string[] {
  const ajustes: string[] = [];
  if (dobleTurno) {
    ajustes.push("Doble turno: podés sumar ½ cda extra de hidrato en almuerzo y cena.");
  }
  if (fase === "premenstrual") {
    ajustes.push("+1 cda de hidrato en almuerzo y cena.");
    ajustes.push("No saltear la merienda (proteína + hidrato).");
    ajustes.push("Para el antojo: 2–3 cuadraditos de chocolate >70% después de una comida.");
  }
  return ajustes;
}
