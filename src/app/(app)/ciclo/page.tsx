import Link from "next/link";
import { connection } from "next/server";
import { AnilloCiclo } from "@/components/anillo-ciclo";
import { COLOR_FASE, Cabecera, NOMBRE_FASE, Pantalla, TituloSeccion, etiqueta, tarjeta } from "@/components/ui";
import {
  diasDelUltimoPeriodo,
  duracionesDeCiclos,
  faseDelDia,
  rangoProximoPeriodo,
  segmentosDelCiclo,
  semanaDe,
  type EstadoCiclo,
  type Fase,
} from "@/lib/ciclo";
import { cargarHoy, fechaLarga } from "@/lib/hoy";
import { NOMBRE_SINTOMA, SINTOMAS } from "@/lib/sintomas";
import { alternarSintoma, guardarFlujo, iniciarPeriodo, terminarPeriodo } from "./actions";

const INICIAL = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function titularFase(c: EstadoCiclo): string {
  switch (c.fase) {
    case "menstrual":
      return `Día ${c.diaDelCiclo} del período`;
    case "folicular":
      return "Energía en subida";
    case "ovulatoria":
      return "Ovulación estimada";
    case "lutea":
      return `Premenstrual en ${c.diasHastaProximo - 4} días`;
    case "premenstrual":
      return c.diasHastaProximo > 0 ? `Período en ${c.diasHastaProximo} días` : "Período estimado para hoy";
  }
}

const BAJADA_FASE: Record<Fase, string> = {
  menstrual: "Los primeros días suelen traer dolor, hinchazón y fatiga. Bajá la exigencia si hace falta y cuidá la hidratación.",
  folicular: "Suele subir la energía. Es un buen momento para los entrenos más exigentes.",
  ovulatoria: "Es una estimación según tu historial: no confirma la ovulación.",
  lutea: "Seguís con el plan base. Cuando empiece la fase premenstrual, Vie suma los ajustes solo.",
  premenstrual: "Baja la serotonina y sube la sensibilidad a la insulina. Por eso el plan suma hidrato y no saltea la merienda.",
};

export default async function Ciclo() {
  await connection();
  const { supabase, fecha, periodos, ciclo, comidas, doble } = await cargarHoy();

  const [{ data: registro }, { data: registros }] = await Promise.all([
    supabase.from("registro_ciclo").select("flujo, sintomas, animo").eq("fecha", fecha).maybeSingle(),
    supabase.from("registro_ciclo").select("fecha, sintomas, animo").order("fecha", { ascending: false }).limit(200),
  ]);

  const duracion = ciclo?.duracionMedia ?? 26;
  const segmentos = segmentosDelCiclo(duracion, diasDelUltimoPeriodo(periodos, fecha));
  const ciclos = duracionesDeCiclos(periodos).slice(-6);
  const variacion = ciclos.length ? Math.max(...ciclos.map((c) => c.dias)) - Math.min(...ciclos.map((c) => c.dias)) : 0;
  const rango = rangoProximoPeriodo(periodos, fecha);
  const semana = semanaDe(fecha);
  const abierto = periodos.find((p) => p.fecha_inicio <= fecha && !p.fecha_fin);
  const numeroCiclo = periodos.filter((p) => p.fecha_inicio <= fecha).length;

  // Síntomas que se repiten: en cuántos ciclos distintos aparece cada uno.
  const inicios = periodos.map((p) => p.fecha_inicio).sort();
  const cicloDe = (f: string) => inicios.filter((i) => i <= f).length;
  const porSintoma = new Map<string, Set<number>>();
  for (const r of registros ?? []) {
    for (const s of [...(r.sintomas ?? []), ...(r.animo ?? [])]) {
      if (!porSintoma.has(s)) porSintoma.set(s, new Set());
      porSintoma.get(s)!.add(cicloDe(r.fecha));
    }
  }
  const ciclosConRegistro = new Set((registros ?? []).map((r) => cicloDe(r.fecha))).size;
  const repetidos = [...porSintoma]
    .map(([s, c]) => ({ s, n: c.size }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  // Para hoy: lo que el plan pide según la fase y los turnos.
  const pre = comidas.find((c) => c.momento === "pre_entreno" && c.estado !== "pasada");
  const consejos: { titulo: string; etiqueta: string; detalle: string; prioridad?: boolean }[] = [];
  if (pre) consejos.push({ etiqueta: `Pre entreno · ${pre.hora}`, titulo: pre.detalle.split(".")[0], detalle: pre.detalle.split(". ")[1] ?? "", prioridad: pre.prioritaria });
  if (ciclo?.fase === "premenstrual") {
    consejos.push({ etiqueta: "Almuerzo y cena", titulo: "+1 cda de hidrato", detalle: "Estabiliza la glucemia" });
    consejos.push({ etiqueta: "Merienda", titulo: "No la saltees", detalle: "Proteína + hidrato" });
    consejos.push({ etiqueta: "Antojo dulce", titulo: "2 o 3 cuadraditos >70%", detalle: "Después de una comida" });
  } else if (ciclo?.fase === "menstrual") {
    consejos.push({ etiqueta: "Entreno", titulo: "Escuchá tu energía", detalle: "Contale a Vie cómo te sentís en Entreno" });
    consejos.push({ etiqueta: "Hidratación", titulo: "Mínimo 2,5 L", detalle: "Ayuda con la hinchazón" });
  } else {
    consejos.push({ etiqueta: "Almuerzo y cena", titulo: "Plato base", detalle: "½ vegetales · ¼ proteína · ¼ hidrato" });
  }
  if (doble && ciclo?.fase !== "premenstrual") {
    consejos.push({ etiqueta: "Doble turno", titulo: "+½ cda de hidrato", detalle: "En almuerzo y cena" });
  }

  const marcados = new Set([...(registro?.sintomas ?? []), ...(registro?.animo ?? [])]);

  return (
    <Pantalla>
      <Cabecera
        titulo="Tu ciclo"
        bajada={
          ciclo
            ? `Ciclo ${numeroCiclo} · día ${ciclo.diaDelCiclo} · ${fechaLarga(fecha, { weekday: "long", day: "numeric", month: "short" })}`
            : undefined
        }
      />

      {/* Fase actual */}
      {ciclo ? (
        <section className="flex flex-col gap-4 rounded-[20px] bg-rosa p-4 shadow-[0_5px_16px_rgba(74,59,53,0.08)]">
          <div className="flex items-center gap-4">
            <AnilloCiclo segmentos={segmentos} duracion={duracion} dia={ciclo.diaDelCiclo} />
            <div className="flex flex-1 flex-col gap-2">
              <span
                className="w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.06em] text-white"
                style={{ background: COLOR_FASE[ciclo.fase] }}
              >
                FASE {NOMBRE_FASE[ciclo.fase].toUpperCase()}
              </span>
              <span className="font-serif text-xl leading-tight">{titularFase(ciclo)}</span>
              <span className="text-xs leading-snug text-gris">{BAJADA_FASE[ciclo.fase]}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative h-4">
              <div className="absolute inset-x-0 top-1 flex h-2 gap-[3px]">
                {segmentos.map((s) => (
                  <span
                    key={s.fase}
                    className="rounded-full"
                    style={{ flex: s.hasta - s.desde + 1, background: COLOR_FASE[s.fase] }}
                  />
                ))}
              </div>
              <span
                className="absolute top-0 size-4 -translate-x-1/2 rounded-full border-4 bg-tarjeta"
                style={{
                  left: `${((Math.min(ciclo.diaDelCiclo, duracion) - 0.5) / duracion) * 100}%`,
                  borderColor: COLOR_FASE[ciclo.fase],
                }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gris">
              {(["menstrual", "folicular", "ovulatoria", "lutea"] as Fase[]).map((f) => (
                <span key={f} className="flex items-center gap-1">
                  <span className="size-[7px] rounded-full" style={{ background: COLOR_FASE[f] }} />
                  {NOMBRE_FASE[f]}
                </span>
              ))}
            </div>
            <span className="text-[10px] text-gris">
              Estimado con tus últimos {ciclos.length} ciclos · variación ±{variacion} días
            </span>
          </div>
        </section>
      ) : (
        <section className={tarjeta}>
          <p className="text-sm text-gris">Todavía no hay períodos cargados. Marcá el inicio del último para empezar.</p>
        </section>
      )}

      {/* Período */}
      <section className={`${tarjeta} flex flex-wrap items-center gap-2 p-4`}>
        {abierto ? (
          <>
            <span className="flex-1 text-sm">
              Período en curso desde el {fechaLarga(abierto.fecha_inicio, { day: "numeric", month: "short" })}
            </span>
            <form action={terminarPeriodo}>
              <button className="h-11 rounded-full bg-bordo px-4 text-sm font-semibold text-white">Terminó hoy</button>
            </form>
          </>
        ) : (
          <>
            <form action={iniciarPeriodo} className="flex-1">
              <button className="h-11 w-full rounded-full bg-bordo px-4 text-sm font-semibold text-white">
                Me vino hoy
              </button>
            </form>
            <details className="w-full">
              <summary className="flex h-11 cursor-pointer list-none items-center text-sm font-semibold text-bordo">
                Cargar otra fecha
              </summary>
              <form action={iniciarPeriodo} className="flex gap-2">
                <input
                  type="date"
                  name="fecha"
                  required
                  max={fecha}
                  aria-label="Primer día del período"
                  className="h-11 flex-1 rounded-xl border border-borde bg-tarjeta px-3"
                />
                <button className="h-11 rounded-full border border-bordo px-4 text-sm font-semibold text-bordo">
                  Guardar
                </button>
              </form>
            </details>
          </>
        )}
      </section>

      {/* Para hoy */}
      {ciclo && (
        <section className="flex flex-col gap-2.5">
          <TituloSeccion accion={<span className="text-xs font-bold text-bordo">Plan de Mechi</span>}>Para hoy</TituloSeccion>
          <div className="grid grid-cols-2 gap-2">
            {consejos.slice(0, 4).map((c) => (
              <Link
                key={c.etiqueta}
                href="/comidas"
                className={`flex flex-col gap-1.5 rounded-2xl border p-3 ${
                  c.prioridad ? "border-bordo bg-rosa" : "border-borde bg-tarjeta"
                }`}
              >
                {c.prioridad && (
                  <span className="w-fit rounded-full bg-bordo px-2 py-0.5 text-[9px] font-bold tracking-wide text-white">
                    PRIORIDAD
                  </span>
                )}
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-gris">{c.etiqueta}</span>
                <span className="text-sm">{c.titulo}</span>
                {c.detalle && <span className="text-[11px] text-gris">{c.detalle}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Semana */}
      {ciclo && (
        <section className={`${tarjeta} flex flex-col gap-3 p-4`}>
          <TituloSeccion>Esta semana</TituloSeccion>
          <ol className="grid grid-cols-7 gap-1.5">
            {semana.map((f, i) => {
              const fd = faseDelDia(periodos, f, fecha);
              const esHoy = f === fecha;
              return (
                <li
                  key={f}
                  aria-current={esHoy ? "date" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-[14px] py-2 ${
                    esHoy
                      ? "bg-bordo text-white"
                      : fd?.inicioEstimado
                        ? "border border-dashed border-bordo bg-tarjeta"
                        : "border border-borde bg-tarjeta"
                  }`}
                >
                  <span className={`text-[11px] ${esHoy ? "" : "text-gris"}`}>{INICIAL[i]}</span>
                  <span className="text-base font-semibold">{Number(f.slice(8))}</span>
                  <span
                    className="size-[5px] rounded-full"
                    style={{ background: esHoy ? "#fff" : fd ? COLOR_FASE[fd.fase] : "transparent", opacity: fd?.estimada && !esHoy ? 0.6 : 1 }}
                  />
                </li>
              );
            })}
          </ol>
          {semana.some((f) => faseDelDia(periodos, f, fecha)?.inicioEstimado) && (
            <p className="text-[10px] text-gris">El borde punteado marca el inicio estimado del próximo período.</p>
          )}
        </section>
      )}

      {/* Registro rápido */}
      <section id="sintomas" className="flex scroll-mt-6 flex-col gap-2.5">
        <TituloSeccion accion={<span className="text-xs font-bold text-bordo">Un toque y listo</span>}>
          ¿Cómo te sentís hoy?
        </TituloSeccion>
        <div className="grid grid-cols-3 gap-2">
          {[...Object.entries(SINTOMAS).map(([valor, texto]) => ({ campo: "sintomas", valor, texto })), { campo: "animo", valor: "sensible", texto: "Ánimo sensible" }].map(
            (s) => {
              const activo = marcados.has(s.valor);
              return (
                <form key={s.valor} action={alternarSintoma}>
                  <input type="hidden" name="campo" value={s.campo} />
                  <input type="hidden" name="valor" value={s.valor} />
                  <button
                    aria-pressed={activo}
                    className={`flex min-h-14 w-full items-center justify-center rounded-2xl border px-1.5 py-3 text-center text-[13px] ${
                      activo ? "border-[1.5px] border-lutea bg-rosa font-bold" : "border-borde bg-tarjeta"
                    }`}
                  >
                    {s.texto}
                  </button>
                </form>
              );
            },
          )}
        </div>
        {(ciclo?.fase === "menstrual" || abierto) && (
          <div className="flex flex-col gap-1.5">
            <span className={etiqueta}>Flujo</span>
            <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-tarjeta p-1">
              {[
                ["poco", "Poco"],
                ["media", "Medio"],
                ["mucho", "Mucho"],
              ].map(([v, t]) => (
                <form key={v} action={guardarFlujo}>
                  <input type="hidden" name="flujo" value={v} />
                  <button
                    aria-pressed={registro?.flujo === v}
                    className={`h-11 w-full rounded-[11px] text-sm ${
                      registro?.flujo === v ? "bg-bordo font-semibold text-white" : ""
                    }`}
                  >
                    {t}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Patrones */}
      {ciclos.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <TituloSeccion>Patrones de tus ciclos</TituloSeccion>
          <div className={`${tarjeta} flex flex-col gap-3.5 p-4`}>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-0.5">
                <span className={etiqueta}>Duración del ciclo</span>
                <span className="flex items-baseline gap-1">
                  <span className="font-serif text-3xl">{duracion}</span>
                  <span className="text-xs text-gris">días de promedio</span>
                </span>
              </div>
              <span className="rounded-full bg-ambar-claro px-2.5 py-1 text-[11px] font-bold text-ambar">
                ±{variacion} días
              </span>
            </div>
            <div className="flex h-28 items-end gap-2.5" role="img" aria-label="Duración de tus últimos ciclos">
              {ciclos.map((c) => {
                const fuera = Math.abs(c.dias - duracion) >= 4;
                return (
                  <div key={c.inicio} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${fuera ? "text-ambar" : ""}`}>{c.dias}</span>
                    <span
                      className="w-full rounded-md"
                      style={{
                        height: `${Math.max(8, ((c.dias - 18) / 16) * 72)}px`,
                        background: fuera ? "var(--ovulatoria)" : "var(--lutea)",
                        opacity: fuera ? 1 : 0.75,
                      }}
                    />
                    <span className="text-[10px] text-gris">{MESES[Number(c.inicio.slice(5, 7)) - 1]}</span>
                  </div>
                );
              })}
              {ciclo && (
                <div className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-gris">hoy</span>
                  <span className="h-3.5 w-full rounded-md bg-lutea/25" />
                  <span className="text-[10px] text-gris">en curso</span>
                </div>
              )}
            </div>
            <div className="border-t border-linea pt-3 text-sm">
              {repetidos.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {repetidos.map((r) => (
                    <li key={r.s} className="flex flex-col">
                      <span>{NOMBRE_SINTOMA[r.s] ?? r.s}</span>
                      <span className="text-[11px] text-gris">
                        Lo registraste en {r.n} de tus últimos {ciclosConRegistro} ciclos
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-gris">
                  Registrá cómo te sentís unos ciclos y acá aparece lo que se repite.
                </p>
              )}
            </div>
            <p className="rounded-xl bg-rosa p-2.5 text-[11px] leading-snug">
              <b className="text-bordo">Cruce con Femmto.</b> Cada medición queda marcada con su fase. Si el peso sube en
              la fase premenstrual, lo más probable es retención y no grasa.
            </p>
          </div>
        </section>
      )}

      {/* Próximo período */}
      {ciclo && (
        <section className="flex flex-col gap-2">
          <div className={`${tarjeta} flex flex-col gap-0.5 p-3.5`}>
            <span className={etiqueta}>Próximo período · estimado</span>
            <span className="text-sm">
              Alrededor del {fechaLarga(ciclo.proximoPeriodo, { weekday: "long", day: "numeric", month: "short" })}
            </span>
            {rango && (
              <span className="text-[11px] text-gris">
                Rango probable del {fechaLarga(rango.desde, { day: "numeric", month: "short" })} al{" "}
                {fechaLarga(rango.hasta, { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
          <p className="text-[10px] leading-snug text-gris">
            Es una estimación según tu historial. No confirma la ovulación ni sirve como método anticonceptivo.
          </p>
        </section>
      )}
    </Pantalla>
  );
}
