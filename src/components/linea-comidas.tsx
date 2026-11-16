import type { Comida } from "@/lib/comidas";

/** Línea de tiempo de las comidas del día, armada según los turnos de entreno. */
export function LineaComidas({ comidas }: { comidas: Comida[] }) {
  return (
    <ol className="flex flex-col">
      {comidas.map((c, i) => {
        const ultima = i === comidas.length - 1;
        return (
          <li key={`${c.momento}-${c.minuto}`} className="flex gap-3">
            <span className="w-11 shrink-0 pt-0.5 text-[13px] font-semibold tabular-nums text-gris">{c.hora}</span>
            <span className="flex w-3.5 shrink-0 flex-col items-center">
              <span
                className={`mt-1 size-3 shrink-0 rounded-full ${
                  c.estado === "pasada"
                    ? "bg-verde"
                    : c.estado === "ahora"
                      ? "border-[3px] border-bordo bg-tarjeta"
                      : "border-2 border-borde bg-tarjeta"
                }`}
              />
              {!ultima && <span className="my-0.5 w-0.5 flex-1 bg-linea" />}
            </span>
            <div className={`flex flex-1 flex-col gap-0.5 ${ultima ? "" : "pb-4"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${c.estado === "pasada" ? "text-gris" : ""}`}>{c.titulo}</span>
                {c.prioritaria && (
                  <span className="rounded-[10px] bg-ambar-claro px-2 py-0.5 text-[11px] font-bold text-[#7a4a0e]">
                    Prioridad
                  </span>
                )}
                {c.estado === "ahora" && (
                  <span className="rounded-[10px] bg-bordo px-2 py-0.5 text-[11px] font-bold text-white">Ahora</span>
                )}
              </div>
              <span className="text-[13px] leading-snug text-gris">{c.detalle}</span>
              {c.extras.length > 0 && (
                <span className="text-[13px] leading-snug text-gris">{c.extras.join(" · ")}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
