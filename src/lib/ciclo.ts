/**
 * Cálculo de la fase del ciclo.
 *
 * La fase no se guarda en la base: se deduce de los períodos cargados.
 * Así, si se corrige una fecha o se carga un período nuevo, todo lo que
 * depende de la fase (panel "Hoy", reglas del plan) se actualiza solo.
 *
 * Las fechas se manejan como strings "YYYY-MM-DD" (fechas de calendario,
 * sin hora) para no depender de la zona horaria del servidor.
 */

export type Periodo = { fecha_inicio: string; fecha_fin: string | null };

export type Fase = "menstrual" | "folicular" | "ovulatoria" | "lutea" | "premenstrual";

export type EstadoCiclo = {
  fase: Fase;
  diaDelCiclo: number;
  duracionMedia: number;
  proximoPeriodo: string;
  diasHastaProximo: number;
};

/** Días previos al período que el plan trata como fase premenstrual. */
export const DIAS_PREMENSTRUAL = 4;
/** Cuántos ciclos completos recientes se usan para el promedio. */
const CICLOS_PARA_PROMEDIO = 6;
/** Valor por defecto si todavía no hay ciclos completos. */
const DURACION_POR_DEFECTO = 26;

const MS_DIA = 86_400_000;

export function aDia(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / MS_DIA;
}

export function aFecha(dia: number): string {
  return new Date(dia * MS_DIA).toISOString().slice(0, 10);
}

export function sumarDias(fecha: string, dias: number): string {
  return aFecha(aDia(fecha) + dias);
}

/** Lunes de la semana de una fecha. */
export function lunesDe(fecha: string): string {
  return sumarDias(fecha, 1 - diaSemanaIso(fecha));
}

/** Las 7 fechas (lunes a domingo) de la semana de una fecha. */
export function semanaDe(fecha: string): string[] {
  const lunes = lunesDe(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** Fecha de hoy en Córdoba, como "YYYY-MM-DD". */
export function hoyEnCordoba(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
  }).format(new Date());
}

/** Hora actual en Córdoba, como "HH:MM". */
export function horaEnCordoba(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Cordoba",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha "YYYY-MM-DD". */
export function diaSemanaIso(fecha: string): number {
  const d = new Date(aDia(fecha) * MS_DIA).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Promedio de duración de los últimos ciclos completos. */
export function duracionMedia(periodos: Periodo[]): number {
  const inicios = periodos.map((p) => aDia(p.fecha_inicio)).sort((a, b) => a - b);
  const duraciones = inicios.slice(1).map((inicio, i) => inicio - inicios[i]);
  const recientes = duraciones.slice(-CICLOS_PARA_PROMEDIO);
  if (recientes.length === 0) return DURACION_POR_DEFECTO;
  return Math.round(recientes.reduce((s, d) => s + d, 0) / recientes.length);
}

export function estadoCiclo(periodos: Periodo[], hoy: string = hoyEnCordoba()): EstadoCiclo | null {
  const hoyDia = aDia(hoy);
  const pasados = periodos
    .filter((p) => aDia(p.fecha_inicio) <= hoyDia)
    .sort((a, b) => aDia(a.fecha_inicio) - aDia(b.fecha_inicio));
  const ultimo = pasados.at(-1);
  if (!ultimo) return null;

  const media = duracionMedia(pasados);
  const inicio = aDia(ultimo.fecha_inicio);
  const diaDelCiclo = hoyDia - inicio + 1;
  const proximo = inicio + media;
  const diasHastaProximo = proximo - hoyDia;

  // Si el período sigue abierto (sin fecha_fin), se asume que dura 5 días.
  const finPeriodo = ultimo.fecha_fin ? aDia(ultimo.fecha_fin) : inicio + 4;
  // La ovulación ocurre ~14 días antes del próximo período.
  const ovulacion = proximo - 14;

  let fase: Fase;
  if (hoyDia <= finPeriodo) fase = "menstrual";
  else if (diasHastaProximo <= DIAS_PREMENSTRUAL) fase = "premenstrual";
  else if (Math.abs(hoyDia - ovulacion) <= 1) fase = "ovulatoria";
  else if (hoyDia < ovulacion) fase = "folicular";
  else fase = "lutea";

  return {
    fase,
    diaDelCiclo,
    duracionMedia: media,
    proximoPeriodo: aFecha(proximo),
    diasHastaProximo,
  };
}

/** Duración de los ciclos completos, del más viejo al más nuevo. */
export function duracionesDeCiclos(periodos: Periodo[]): { inicio: string; dias: number }[] {
  const inicios = periodos.map((p) => p.fecha_inicio).sort();
  return inicios.slice(1).map((inicio, i) => ({
    inicio: inicios[i],
    dias: aDia(inicio) - aDia(inicios[i]),
  }));
}

export type Segmento = { fase: Fase; desde: number; hasta: number };

/**
 * Días del ciclo (1 = primer día del período) que ocupa cada fase,
 * con las mismas reglas que `estadoCiclo`.
 */
export function segmentosDelCiclo(duracion: number, diasPeriodo = 5): Segmento[] {
  const ovulacion = duracion - 14 + 1;
  const premenstrual = duracion - DIAS_PREMENSTRUAL + 1;
  const tramos: Segmento[] = [
    { fase: "menstrual", desde: 1, hasta: diasPeriodo },
    { fase: "folicular", desde: diasPeriodo + 1, hasta: ovulacion - 2 },
    { fase: "ovulatoria", desde: ovulacion - 1, hasta: ovulacion + 1 },
    { fase: "lutea", desde: ovulacion + 2, hasta: premenstrual - 1 },
    { fase: "premenstrual", desde: premenstrual, hasta: duracion },
  ];
  return tramos.filter((t) => t.hasta >= t.desde);
}

/** Días que duró el último período (5 si sigue abierto). */
export function diasDelUltimoPeriodo(periodos: Periodo[], hoy: string = hoyEnCordoba()): number {
  const ultimo = periodos
    .filter((p) => p.fecha_inicio <= hoy)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .at(-1);
  if (!ultimo?.fecha_fin) return 5;
  return aDia(ultimo.fecha_fin) - aDia(ultimo.fecha_inicio) + 1;
}

export type FaseDelDia = { fase: Fase; estimada: boolean; inicioEstimado: boolean };

/**
 * Fase de cualquier día de la semana, incluso futuro. Pasado el próximo
 * período estimado, el día se marca como período estimado.
 */
export function faseDelDia(periodos: Periodo[], fecha: string, hoy: string = hoyEnCordoba()): FaseDelDia | null {
  const base = estadoCiclo(periodos, fecha <= hoy ? fecha : hoy);
  if (!base) return null;
  if (fecha <= hoy) return { fase: base.fase, estimada: false, inicioEstimado: false };
  const dias = aDia(fecha) - aDia(hoy);
  const hasta = base.diasHastaProximo - dias;
  if (hasta <= 0 && hasta > -5) {
    return { fase: "menstrual", estimada: true, inicioEstimado: hasta === 0 };
  }
  const futuro = estadoCiclo(periodos, fecha);
  return futuro ? { fase: futuro.fase, estimada: true, inicioEstimado: false } : null;
}

/** Rango probable del próximo período según el ciclo más corto y el más largo. */
export function rangoProximoPeriodo(periodos: Periodo[], hoy: string = hoyEnCordoba()) {
  const pasados = periodos.filter((p) => p.fecha_inicio <= hoy);
  const ultimo = pasados.map((p) => p.fecha_inicio).sort().at(-1);
  if (!ultimo) return null;
  const recientes = duracionesDeCiclos(pasados).slice(-6).map((c) => c.dias);
  if (recientes.length === 0) return null;
  return {
    desde: sumarDias(ultimo, Math.min(...recientes)),
    hasta: sumarDias(ultimo, Math.max(...recientes)),
    variacion: Math.max(...recientes) - Math.min(...recientes),
  };
}
