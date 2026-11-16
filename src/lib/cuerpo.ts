/**
 * Métricas de composición corporal (Femmto) con los rangos que muestra la app
 * para el perfil de Saskia. Los rangos salen de las capturas de Femmto.
 */

export type Medicion = {
  medido_en: string;
  peso_kg: number | null;
  grasa_pct: number | null;
  imc: number | null;
  tejido_magro_pct: number | null;
  musculo_esqueletico_pct: number | null;
  grasa_visceral: number | null;
  tejido_oseo_pct: number | null;
  hidratacion_pct: number | null;
  proteina_pct: number | null;
  edad_corporal: number | null;
  metabolismo_basal_kcal: number | null;
  origen: "apple_salud" | "manual";
};

export type ClaveMetrica = Exclude<keyof Medicion, "medido_en" | "origen">;

export type Metrica = {
  clave: ClaveMetrica;
  nombre: string;
  unidad: string;
  min: number;
  max: number;
  decimales: number;
};

export const METRICAS: Record<ClaveMetrica, Metrica> = {
  peso_kg: { clave: "peso_kg", nombre: "Peso", unidad: "kg", min: 50.4, max: 68.1, decimales: 2 },
  grasa_pct: { clave: "grasa_pct", nombre: "Grasa corporal", unidad: "%", min: 20.9, max: 31.5, decimales: 1 },
  imc: { clave: "imc", nombre: "IMC", unidad: "", min: 18.5, max: 25, decimales: 1 },
  tejido_magro_pct: { clave: "tejido_magro_pct", nombre: "Tejido magro", unidad: "%", min: 69, max: 73.4, decimales: 1 },
  musculo_esqueletico_pct: {
    clave: "musculo_esqueletico_pct",
    nombre: "Músculo esquelético",
    unidad: "%",
    min: 30,
    max: 50,
    decimales: 1,
  },
  grasa_visceral: { clave: "grasa_visceral", nombre: "Grasa visceral", unidad: "", min: 6, max: 12, decimales: 0 },
  tejido_oseo_pct: { clave: "tejido_oseo_pct", nombre: "Tejido óseo", unidad: "%", min: 3, max: 5, decimales: 1 },
  hidratacion_pct: { clave: "hidratacion_pct", nombre: "Hidratación", unidad: "%", min: 45, max: 60, decimales: 1 },
  proteina_pct: { clave: "proteina_pct", nombre: "Proteína", unidad: "%", min: 12, max: 20, decimales: 1 },
  edad_corporal: { clave: "edad_corporal", nombre: "Edad corporal", unidad: "años", min: 22, max: 26, decimales: 0 },
  metabolismo_basal_kcal: {
    clave: "metabolismo_basal_kcal",
    nombre: "Tasa metabólica basal",
    unidad: "kcal/día",
    min: 1200,
    max: 1600,
    decimales: 0,
  },
};

export function formatear(valor: number, decimales: number): string {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}

export type Posicion = "bajo" | "piso" | "rango" | "techo" | "alto";

/** Dónde cae un valor respecto de su rango. "piso" y "techo" = dentro, en el 10% del borde. */
export function posicion(valor: number, m: Metrica): Posicion {
  if (valor < m.min) return "bajo";
  if (valor > m.max) return "alto";
  const margen = (m.max - m.min) * 0.1;
  if (valor - m.min <= margen) return "piso";
  if (m.max - valor <= margen) return "techo";
  return "rango";
}

/** Posición del marcador sobre una barra de tres tramos (bajo · rango · alto), de 0 a 100. */
export function porcentajeEnBarra(valor: number, m: Metrica): number {
  const tercio = 100 / 3;
  if (valor < m.min) return Math.max(2, (valor / m.min) * tercio);
  if (valor > m.max) return Math.min(98, 2 * tercio + Math.min(1, (valor - m.max) / (m.max - m.min)) * tercio);
  return tercio + ((valor - m.min) / (m.max - m.min)) * tercio;
}

/** Lectura según el objetivo: bajar grasa, mantener y mostrar músculo. */
export function lecturaObjetivo(clave: "grasa_pct" | "musculo_esqueletico_pct" | "tejido_magro_pct", valor: number) {
  const p = posicion(valor, METRICAS[clave]);
  if (clave === "grasa_pct") {
    if (p === "alto") return { texto: "Por encima del rango", tono: "alerta" as const };
    if (p === "bajo" || p === "piso") return { texto: "En el piso del rango", tono: "bien" as const };
    return { texto: "En rango · margen para bajar", tono: "atencion" as const };
  }
  if (clave === "musculo_esqueletico_pct") {
    if (p === "bajo") return { texto: "Por debajo del rango", tono: "alerta" as const };
    return { texto: "En rango · mantener", tono: "bien" as const };
  }
  if (p === "bajo") return { texto: "Por debajo del rango", tono: "alerta" as const };
  if (p === "piso") return { texto: "En el piso del rango", tono: "atencion" as const };
  return { texto: "En rango", tono: "bien" as const };
}
