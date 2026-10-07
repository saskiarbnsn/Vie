import type { Segmento } from "@/lib/ciclo";
import { COLOR_FASE } from "./ui";

const R = 52;
const GROSOR = 10;
const C = 62;

function punto(angulo: number, r = R) {
  const a = ((angulo - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arco(desde: number, hasta: number) {
  const [x1, y1] = punto(desde);
  const [x2, y2] = punto(hasta);
  const largo = hasta - desde > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largo} 1 ${x2} ${y2}`;
}

/**
 * Anillo del ciclo: cada fase con su color, lo transcurrido lleno y lo que
 * falta más claro, con un punto en el día de hoy.
 */
export function AnilloCiclo({
  segmentos,
  duracion,
  dia,
}: {
  segmentos: Segmento[];
  duracion: number;
  dia: number;
}) {
  const grados = 360 / duracion;
  const hueco = 1.6;
  const tramos = segmentos.flatMap((s) => {
    const ini = (s.desde - 1) * grados;
    const fin = s.hasta * grados;
    const hoy = Math.min(Math.max((dia - 0.5) * grados, ini), fin);
    const color = COLOR_FASE[s.fase];
    const partes = [];
    if (hoy > ini) partes.push({ d: [ini, hoy], color, opacidad: 1, clave: `${s.fase}-a` });
    if (fin > hoy) partes.push({ d: [hoy, fin], color, opacidad: 0.35, clave: `${s.fase}-b` });
    return partes.map((p, i) => ({
      ...p,
      d: [p.d[0] + (i === 0 ? hueco / 2 : 0), p.d[1] - (i === partes.length - 1 ? hueco / 2 : 0)],
    }));
  });
  const [mx, my] = punto(Math.min(dia - 0.5, duracion - 0.5) * grados);
  const actual = segmentos.find((s) => dia >= s.desde && dia <= s.hasta) ?? segmentos.at(-1);
  const colorHoy = actual ? COLOR_FASE[actual.fase] : "var(--lutea)";

  return (
    <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`Día ${dia} de unos ${duracion}`}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--tarjeta)" strokeWidth={GROSOR} />
      {tramos.map((t) =>
        t.d[1] > t.d[0] ? (
          <path
            key={t.clave}
            d={arco(t.d[0], t.d[1])}
            fill="none"
            stroke={t.color}
            strokeOpacity={t.opacidad}
            strokeWidth={GROSOR}
          />
        ) : null,
      )}
      <circle cx={mx} cy={my} r={7} fill="var(--tarjeta)" stroke={colorHoy} strokeWidth={4} />
      <text x={C} y={46} textAnchor="middle" className="fill-bordo text-[10px] font-bold tracking-[0.06em]">
        DÍA
      </text>
      <text x={C} y={76} textAnchor="middle" className="fill-tinta font-serif text-[36px]">
        {dia}
      </text>
      <text x={C} y={92} textAnchor="middle" className="fill-gris text-[10px]">
        de ~{duracion}
      </text>
    </svg>
  );
}
