/**
 * Las comidas del día, armadas a partir de los turnos de entreno y del plan.
 *
 * Toma los horarios base del plan (desayuno 9:00, almuerzo 13:30, cena 21:30)
 * y los acomoda alrededor de cada bloque de entreno:
 *   - Pre entreno 60–90 min antes (45 min y fruta sola si la exigencia es baja).
 *   - Post entreno liviano al terminar, salvo que una comida principal ya caiga cerca.
 *   - Si un entreno pisa el almuerzo o la cena, esa comida pasa a después del entreno.
 *   - Si no hay pre ni post a la tarde, suma una merienda.
 *
 * Es pura (sin base de datos) para poder probarla aislada.
 */

import type { Fase } from "./ciclo";
import { nivelMaximo, type Nivel } from "./exigencia";
import { aHora, type Bloque } from "./plan";

export type Momento = "desayuno" | "pre_entreno" | "almuerzo" | "merienda" | "post_entreno" | "cena";

export type Comida = {
  minuto: number;
  hora: string;
  momento: Momento;
  titulo: string;
  detalle: string;
  extras: string[];
  prioritaria: boolean;
  estado: "pasada" | "ahora" | "despues";
};

const DESAYUNO = 9 * 60;
const ALMUERZO = 13 * 60 + 30;
const MERIENDA = 17 * 60;
const CENA = 21 * 60 + 30;
/** Una comida principal hasta 60 min después del entreno ya cumple de post. */
const CUBRE_POST_MIN = 60;

const PRE_POR_NIVEL: Record<Nivel, string> = {
  alta: "Banana + yogur griego (hidrato rápido + proteína)",
  media: "Fruta + frutos secos, o pan con queso untable + fruta",
  baja: "Fruta sola",
};

const PLATO = "½ vegetales · ¼ proteína · ¼ hidrato";

function redondear15(min: number): number {
  return Math.round(min / 15) * 15;
}

type Entrada = Omit<Comida, "hora" | "estado"> & { cubreTarde?: boolean };

export function comidasDelDia(params: {
  bloques: Bloque[];
  niveles: Map<number, Nivel>;
  fase: Fase | null;
  ahora: number;
}): Comida[] {
  const { bloques, niveles, fase, ahora } = params;
  const doble = bloques.some((b) => b.entrenos.length >= 2);
  const premenstrual = fase === "premenstrual";
  const tardio = bloques.some((b) => b.fin >= 20 * 60);

  let almuerzo = ALMUERZO;
  let cena = CENA;
  let hayDesayuno = true;
  const notasAlmuerzo: string[] = [];
  const notasCena: string[] = [];
  const items: Entrada[] = [];

  for (const b of bloques) {
    const nivel = nivelMaximo(b.entrenos.map((e) => niveles.get(e.id) ?? "media"));
    const nombres = b.entrenos.map((e) => e.disciplina).join(" + ");
    const esDoble = b.entrenos.length >= 2;

    // Si el entreno pisa una comida principal, la comida pasa a después.
    let pisoAlmuerzo = false;
    if (almuerzo >= b.inicio - 60 && almuerzo < b.fin) {
      almuerzo = redondear15(b.fin + 30);
      pisoAlmuerzo = true;
    }
    if (cena >= b.inicio - 60 && cena < b.fin) {
      cena = redondear15(b.fin + 30);
    }

    // Pre entreno
    const pre = redondear15(b.inicio - (nivel === "baja" ? 45 : 90));
    if (pre <= DESAYUNO + 30) hayDesayuno = false; // entreno de mañana: el pre es el desayuno
    // Si el almuerzo cae justo a la hora del pre entreno, cumple ese rol.
    const almuerzoEsPre = !pisoAlmuerzo && Math.abs(almuerzo - pre) <= 30 && almuerzo <= b.inicio - 60;
    if (almuerzoEsPre) {
      notasAlmuerzo.push(`Es tu pre entreno de ${nombres}`);
    } else {
      items.push({
        minuto: pre,
        momento: "pre_entreno",
        titulo: esDoble ? "Pre entreno · doble turno" : "Pre entreno",
        detalle: `${PRE_POR_NIVEL[nivel]}. Antes de ${nombres}.`,
        extras: [],
        prioritaria: esDoble,
        cubreTarde: nivel !== "baja",
      });
    }

    // Post entreno (no hace falta con exigencia baja)
    if (nivel !== "baja") {
      const post = redondear15(b.fin + 15);
      const cubreAlmuerzo = almuerzo >= b.fin && almuerzo - b.fin <= CUBRE_POST_MIN;
      const cubreCena = cena >= b.fin && cena - b.fin <= CUBRE_POST_MIN;
      if (cubreAlmuerzo) notasAlmuerzo.push("También es tu post entreno");
      else if (cubreCena) notasCena.push("También es tu post entreno");
      else
        items.push({
          minuto: post,
          momento: "post_entreno",
          titulo: "Post entreno",
          detalle: post >= 17 * 60 ? "1 huevo o yogur griego, para no llegar vacía a la cena." : "Liviano: 1 huevo o yogur griego.",
          extras: [],
          prioritaria: false,
          cubreTarde: true,
        });
    }
  }

  if (hayDesayuno) {
    items.push({
      minuto: DESAYUNO,
      momento: "desayuno",
      titulo: "Desayuno",
      detalle: "50% proteína · 50% hidrato",
      extras: [],
      prioritaria: false,
    });
  }

  const extrasPlato: string[] = [];
  if (premenstrual) extrasPlato.push("+1 cda de hidrato");
  if (doble) extrasPlato.push("+½ cda de hidrato por doble turno");

  items.push({
    minuto: almuerzo,
    momento: "almuerzo",
    titulo: "Almuerzo",
    detalle: PLATO,
    extras: [...extrasPlato, "Creatina 3–5 g", ...notasAlmuerzo],
    prioritaria: false,
  });

  // Merienda si a la tarde no hay un pre o post con proteína (la fruta sola no cuenta).
  const tardeCubierta = items.some((i) => i.cubreTarde && i.minuto >= 900 && i.minuto <= 1140);
  if (!tardeCubierta) {
    items.push({
      minuto: MERIENDA,
      momento: "merienda",
      titulo: "Merienda",
      detalle: "50% proteína · 50% hidrato",
      extras: premenstrual ? ["No la saltees esta semana"] : [],
      prioritaria: false,
    });
  }

  items.push({
    minuto: cena,
    momento: "cena",
    titulo: "Cena",
    detalle: tardio ? "70% proteína · 30% vegetales (entreno tardío)" : PLATO,
    extras: [...(tardio ? [] : extrasPlato), ...notasCena],
    prioritaria: false,
  });

  items.sort((a, b) => a.minuto - b.minuto);
  const proxima = items.findIndex((i) => i.minuto >= ahora - 30);

  return items.map((i, idx) => ({
    minuto: i.minuto,
    momento: i.momento,
    titulo: i.titulo,
    detalle: i.detalle,
    extras: i.extras,
    prioritaria: i.prioritaria,
    hora: aHora(i.minuto).replace(/^0/, ""),
    estado: proxima === -1 || idx < proxima ? "pasada" : idx === proxima ? "ahora" : "despues",
  }));
}
