/** Síntomas del registro rápido. Mismas claves que guarda `registro_ciclo.sintomas`. */
export const SINTOMAS = {
  fatiga: "Fatiga",
  hinchazon: "Hinchazón",
  antojo_dulce: "Antojo dulce",
  dolor_pelvico: "Dolor pélvico",
  dolor_cabeza: "Dolor de cabeza",
} as const;

export const NOMBRE_SINTOMA: Record<string, string> = { ...SINTOMAS, sensible: "Ánimo sensible" };
