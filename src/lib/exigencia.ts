/**
 * Exigencia de cada turno de entreno.
 *
 * Se arma en capas, de lo general a lo puntual:
 *   1. La exigencia habitual del deporte (tabla `disciplinas`).
 *   2. La semana: en semana de descarga, el gym baja un nivel.
 *   3. El período: si está activado, esos días baja un nivel.
 *   4. El turno: si se ajustó a mano, manda eso por sobre 1–3.
 *   5. Cómo se siente hoy: baja uno o dos niveles los turnos del día.
 *
 * La exigencia define qué pre entreno sugiere Vie (ver `comidas.ts`).
 */

export type Nivel = "alta" | "media" | "baja";
export type Energia = "bien" | "poca" | "muy_baja";
export type Categoria = "pole" | "gym" | "stretching" | "otro";

export type Disciplina = {
  nombre: string;
  categoria: Categoria;
  exigencia_base: Nivel;
  orden: number;
};

export const NIVELES: Nivel[] = ["alta", "media", "baja"];

export const NOMBRE_NIVEL: Record<Nivel, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export const NOMBRE_ENERGIA: Record<Energia, string> = {
  bien: "Bien",
  poca: "Poca fuerza",
  muy_baja: "Muy baja",
};

export function bajar(nivel: Nivel, pasos = 1): Nivel {
  return NIVELES[Math.min(NIVELES.length - 1, NIVELES.indexOf(nivel) + pasos)];
}

export function nivelMaximo(niveles: Nivel[]): Nivel {
  return NIVELES.find((n) => niveles.includes(n)) ?? "media";
}

export type Contexto = {
  disciplinas: Disciplina[];
  descargaGym: boolean;
  enPeriodo: boolean;
  ajustarEnPeriodo: boolean;
  energia: Energia | null;
};

export type Exigencia = { nivel: Nivel; motivo: string | null };

/** Disciplina conocida, o una genérica de exigencia media si no está en la tabla. */
export function buscarDisciplina(disciplinas: Disciplina[], nombre: string): Disciplina {
  return (
    disciplinas.find((d) => d.nombre === nombre) ?? {
      nombre,
      categoria: "otro",
      exigencia_base: "media",
      orden: 99,
    }
  );
}

export function exigenciaDe(
  turno: { disciplina: string; exigencia?: Nivel | null },
  ctx: Contexto,
): Exigencia {
  const d = buscarDisciplina(ctx.disciplinas, turno.disciplina);
  let nivel: Nivel;
  let motivo: string | null = null;

  if (turno.exigencia) {
    nivel = turno.exigencia;
    motivo = "ajustada a mano";
  } else {
    nivel = d.exigencia_base;
    if (ctx.descargaGym && d.categoria === "gym") {
      nivel = bajar(nivel);
      motivo = "semana de descarga";
    }
    if (ctx.enPeriodo && ctx.ajustarEnPeriodo) {
      nivel = bajar(nivel);
      motivo = motivo ? `${motivo} y período` : "período";
    }
  }

  if (ctx.energia === "poca" || ctx.energia === "muy_baja") {
    nivel = bajar(nivel, ctx.energia === "poca" ? 1 : 2);
    motivo = "cómo te sentís hoy";
  }

  return { nivel, motivo };
}
