import { connection } from "next/server";
import { LineaComidas } from "@/components/linea-comidas";
import { Cabecera, Pantalla, TituloSeccion, etiqueta, tarjeta } from "@/components/ui";
import { horaEnCordoba } from "@/lib/ciclo";
import { cargarHoy, fechaLarga, mayuscula } from "@/lib/hoy";
import { borrarComida, registrarComida } from "./actions";

const NOMBRE_MOMENTO: Record<string, string> = {
  desayuno: "Desayuno",
  pre_entreno: "Pre entreno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  post_entreno: "Post entreno",
  cena: "Cena",
  snack: "Snack",
};

const PLATOS = [
  {
    titulo: "Almuerzo y cena",
    partes: [
      { texto: "Vegetales", pct: 50, color: "var(--folicular)" },
      { texto: "Proteína", pct: 25, color: "var(--bordo)" },
      { texto: "Hidrato", pct: 25, color: "var(--ovulatoria)" },
    ],
  },
  {
    titulo: "Desayuno y merienda",
    partes: [
      { texto: "Proteína", pct: 50, color: "var(--bordo)" },
      { texto: "Hidrato", pct: 50, color: "var(--ovulatoria)" },
    ],
  },
  {
    titulo: "Cena liviana o post entreno tardío",
    partes: [
      { texto: "Proteína", pct: 70, color: "var(--bordo)" },
      { texto: "Vegetales", pct: 30, color: "var(--folicular)" },
    ],
  },
];

export default async function Comidas() {
  await connection();
  const { supabase, fecha, comidas, ajustes } = await cargarHoy();
  const { data: registradas } = await supabase
    .from("comidas")
    .select("id, hora, momento, descripcion")
    .eq("fecha", fecha)
    .order("hora");

  const proxima = comidas.find((c) => c.estado === "ahora");

  return (
    <Pantalla>
      <Cabecera titulo="Comidas" bajada={mayuscula(fechaLarga(fecha))} />

      <section className={`${tarjeta} flex flex-col gap-3.5`}>
        <div className="flex flex-col gap-1">
          <TituloSeccion>Tu día</TituloSeccion>
          <p className="text-[13px] leading-snug text-gris">
            Horarios según tus turnos de entreno y la exigencia de cada uno.
          </p>
        </div>
        <LineaComidas comidas={comidas} />
      </section>

      {ajustes.length > 0 && (
        <section className={tarjeta}>
          <p className={etiqueta}>Ajustes de hoy</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
            {ajustes.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <section id="registrar" className={`${tarjeta} flex scroll-mt-6 flex-col gap-3`}>
        <TituloSeccion>Registrar comida</TituloSeccion>
        <form action={registrarComida} className="flex flex-col gap-2 text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              name="momento"
              defaultValue={proxima?.momento ?? "snack"}
              aria-label="Momento"
              className="h-11 rounded-xl border border-borde bg-tarjeta px-2"
            >
              {Object.entries(NOMBRE_MOMENTO).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="time"
              name="hora"
              defaultValue={horaEnCordoba()}
              aria-label="Hora"
              className="h-11 rounded-xl border border-borde bg-tarjeta px-2 tabular-nums"
            />
          </div>
          <input
            name="descripcion"
            required
            placeholder="Ej: pollo, arroz yamaní y ensalada"
            aria-label="Qué comiste"
            className="h-11 rounded-xl border border-borde bg-tarjeta px-3"
          />
          <button className="h-11 rounded-full bg-bordo font-semibold text-white">Guardar</button>
        </form>
        {(registradas ?? []).length > 0 && (
          <ul className="flex flex-col">
            {(registradas ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-t border-linea py-2 text-sm">
                <span className="w-11 tabular-nums text-gris">{c.hora?.slice(0, 5)}</span>
                <span className="flex flex-1 flex-col">
                  <span className="text-xs font-semibold text-gris">{NOMBRE_MOMENTO[c.momento]}</span>
                  {c.descripcion}
                </span>
                <form action={borrarComida}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="h-9 rounded-full px-3 text-xs text-gris hover:bg-crema">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${tarjeta} flex flex-col gap-4`}>
        <TituloSeccion accion={<span className="text-xs font-bold text-bordo">Plan de Mechi</span>}>
          Cómo armar el plato
        </TituloSeccion>
        {PLATOS.map((p) => (
          <div key={p.titulo} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{p.titulo}</span>
            <div className="flex h-3 gap-[3px]">
              {p.partes.map((x) => (
                <span key={x.texto} className="rounded-full" style={{ flex: x.pct, background: x.color }} />
              ))}
            </div>
            <span className="text-xs text-gris">{p.partes.map((x) => `${x.pct}% ${x.texto.toLowerCase()}`).join(" · ")}</span>
          </div>
        ))}
        <p className="text-xs leading-snug text-gris">
          Vegetales sin límite. Regla del 80/20: los momentos sociales y los gustos también son parte del plan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <TituloSeccion>Planificá sin esfuerzo</TituloSeccion>
        <div className="grid grid-cols-2 gap-2">
          {["Planner semanal", "Batch cooking"].map((t) => (
            <div key={t} className="flex flex-col gap-1 rounded-2xl border border-dashed border-[#b8a898] bg-tarjeta p-4">
              <span className="text-sm font-semibold">{t}</span>
              <span className="text-xs text-gris">Próximamente</span>
            </div>
          ))}
        </div>
      </section>
    </Pantalla>
  );
}
