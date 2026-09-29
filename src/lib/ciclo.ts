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

function aDia(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / MS_DIA;
}

function aFecha(dia: number): string {
  return new Date(dia * MS_DIA).toISOString().slice(0, 10);
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
