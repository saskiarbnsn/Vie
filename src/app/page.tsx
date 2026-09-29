import { connection } from "next/server";
import {
  diaSemanaIso,
  estadoCiclo,
  horaEnCordoba,
  hoyEnCordoba,
  type Fase,
} from "@/lib/ciclo";
import {
  OPCIONES_PRE,
  ajustesDelDia,
  aMinutos,
  armarBloques,
  esDobleTurno,
  objetivoAgua,
  preEntrenos,
  type EntrenoDelDia,
} from "@/lib/plan";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  alternarCreatina,
  borrarEntreno,
  cambiarEstadoEntreno,
  planificarEntreno,
  sumarAgua,
} from "./actions";
import { cerrarSesion } from "./login/actions";

const NOMBRE_FASE: Record<Fase, string> = {
  menstrual: "menstrual",
  folicular: "folicular",
  ovulatoria: "ovulatoria",
  lutea: "lútea",
  premenstrual: "premenstrual",
};

const DISCIPLINAS = [
  "Gym",
  "Pole Sport",
  "Pole Exotic",
  "Pole Acrobático",
  "Pole Giratorio",
  "Stretching",
];

async function cargarDia(fecha: string) {
  const supabase = await crearClienteServidor();

  // Las clases de horario fijo se copian al plan del día la primera vez que se abre.
  // Si ya existen, no se tocan (así se respeta si una se marcó como salteada).
  const { data: rutina } = await supabase
    .from("rutina_semanal")
    .select("hora_inicio, disciplina, duracion_min")
    .eq("dia_semana", diaSemanaIso(fecha))
    .eq("activa", true);
  if (rutina?.length) {
    await supabase.from("entrenos_planificados").upsert(
      rutina.map((r) => ({ ...r, fecha, origen: "rutina" })),
      { onConflict: "fecha,hora_inicio,disciplina", ignoreDuplicates: true },
    );
  }

  const [periodos, entrenos, habitos] = await Promise.all([
    supabase.from("periodos").select("fecha_inicio, fecha_fin").order("fecha_inicio"),
    supabase
      .from("entrenos_planificados")
      .select("id, hora_inicio, disciplina, duracion_min, estado, origen")
      .eq("fecha", fecha)
      .order("hora_inicio"),
    supabase.from("habitos_diarios").select("agua_ml, creatina").eq("fecha", fecha).maybeSingle(),
  ]);

  return {
    periodos: periodos.data ?? [],
    entrenos: (entrenos.data ?? []) as EntrenoDelDia[],
    habitos: habitos.data ?? { agua_ml: 0, creatina: false },
  };
}

const tarjeta = "rounded-2xl border border-borde bg-white p-5";
const etiqueta = "text-xs font-medium uppercase tracking-wide text-gris";

export default async function Hoy() {
  // Todo depende de la fecha y hora actuales: se arma en cada visita.
  await connection();

  const fecha = hoyEnCordoba();
  const ahora = aMinutos(horaEnCordoba());
  const { periodos, entrenos, habitos } = await cargarDia(fecha);

  const ciclo = estadoCiclo(periodos, fecha);
  const bloques = armarBloques(entrenos);
  const doble = esDobleTurno(bloques);
  // Solo se muestran los pre entrenos cuyo entreno todavía no empezó.
  const pres = preEntrenos(bloques).filter((p) => p.paraBloque.inicio > ahora);
  const ajustes = ajustesDelDia(ciclo?.fase ?? null, doble);
  const metaAgua = objetivoAgua(doble);
  const pctAgua = Math.min(100, Math.round((habitos.agua_ml / metaAgua) * 100));

  const titulo = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl">Hoy</h1>
          <p className="mt-1 text-sm capitalize text-gris">{titulo}</p>
        </div>
        <form action={cerrarSesion}>
          <button className="text-sm text-gris underline-offset-4 hover:underline">Salir</button>
        </form>
      </header>

      {/* Ciclo */}
      <section className={tarjeta}>
        <p className={etiqueta}>Ciclo</p>
        {ciclo ? (
          <>
            <p className="mt-1 font-serif text-2xl">Fase {NOMBRE_FASE[ciclo.fase]}</p>
            <p className="mt-1 text-sm text-gris">
              Día {ciclo.diaDelCiclo} · próximo período{" "}
              {ciclo.diasHastaProximo > 0
                ? `en ${ciclo.diasHastaProximo} días`
                : ciclo.diasHastaProximo === 0
                  ? "hoy"
                  : `con ${-ciclo.diasHastaProximo} días de atraso`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-gris">Todavía no hay períodos cargados.</p>
        )}
      </section>

      {/* Pre entreno */}
      {pres.map((p) => (
        <section
          key={p.desde}
          className={`${tarjeta} ${p.prioritario ? "border-terracota" : ""}`}
        >
          <div className="flex items-center justify-between">
            <p className={etiqueta}>Pre entreno</p>
            {p.prioritario && (
              <span className="rounded-full bg-terracota px-2 py-0.5 text-xs text-white">
                Prioridad · doble turno
              </span>
            )}
          </div>
          <p className="mt-1 font-serif text-2xl">
            {p.desde} – {p.hasta}
          </p>
          <p className="mt-1 text-sm text-gris">
            Para {p.paraBloque.entrenos.map((e) => e.disciplina).join(" + ")}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {OPCIONES_PRE.map((o) => (
              <li key={o.opcion}>
                <span className="font-medium">{o.opcion}.</span> {o.que}{" "}
                <span className="text-gris">· {o.porque}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Entrenos */}
      <section className={tarjeta}>
        <p className={etiqueta}>Entrenos</p>
        {entrenos.length === 0 && (
          <p className="mt-2 text-sm text-gris">Día de descanso, salvo que sumes algo.</p>
        )}
        <ul className="mt-2 flex flex-col divide-y divide-borde">
          {entrenos.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 py-2">
              <div className={e.estado === "salteado" ? "text-gris line-through" : ""}>
                <span className="tabular-nums">{e.hora_inicio.slice(0, 5)}</span> · {e.disciplina}
                {e.estado === "hecho" && <span className="ml-1 text-terracota">✓</span>}
              </div>
              <div className="flex gap-1 text-xs">
                {e.estado === "pendiente" ? (
                  <>
                    <FormEstado id={e.id} estado="hecho" texto="Hecho" />
                    <FormEstado id={e.id} estado="salteado" texto="Saltear" />
                  </>
                ) : (
                  <FormEstado id={e.id} estado="pendiente" texto="Deshacer" />
                )}
                {e.origen === "manual" && (
                  <form action={borrarEntreno}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="rounded-lg px-2 py-1 text-gris hover:bg-marfil">Borrar</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>

        <form action={planificarEntreno} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="fecha" value={fecha} />
          <input
            name="hora"
            type="time"
            required
            defaultValue="19:00"
            className="rounded-lg border border-borde px-2 py-1.5"
          />
          <select name="disciplina" className="rounded-lg border border-borde px-2 py-1.5">
            {DISCIPLINAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            name="duracion"
            defaultValue="60"
            className="rounded-lg border border-borde px-2 py-1.5"
          >
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="75">75 min</option>
            <option value="90">90 min</option>
          </select>
          <button className="rounded-lg bg-pizarra px-3 py-1.5 text-marfil">Sumar</button>
        </form>
      </section>

      {/* Ajustes del plan */}
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

      {/* Hábitos */}
      <section className={tarjeta}>
        <p className={etiqueta}>Hidratación</p>
        <p className="mt-1 font-serif text-2xl tabular-nums">
          {(habitos.agua_ml / 1000).toLocaleString("es-AR")} L
          <span className="text-base text-gris"> / {(metaAgua / 1000).toLocaleString("es-AR")} L</span>
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-marfil"
          role="progressbar"
          aria-valuenow={pctAgua}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-terracota" style={{ width: `${pctAgua}%` }} />
        </div>
        <div className="mt-3 flex gap-2 text-sm">
          {[250, 500].map((ml) => (
            <form key={ml} action={sumarAgua}>
              <input type="hidden" name="ml" value={ml} />
              <button className="rounded-lg border border-borde px-3 py-1.5">+{ml} ml</button>
            </form>
          ))}
          <form action={sumarAgua}>
            <input type="hidden" name="ml" value={-250} />
            <button className="rounded-lg px-3 py-1.5 text-gris">−250</button>
          </form>
        </div>

        <form action={alternarCreatina} className="mt-4 border-t border-borde pt-4">
          <button className="flex w-full items-center justify-between text-sm">
            <span>Creatina (3–5 g con el almuerzo)</span>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                habitos.creatina ? "bg-terracota text-white" : "border border-borde text-gris"
              }`}
            >
              {habitos.creatina ? "Tomada" : "Pendiente"}
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}

function FormEstado({ id, estado, texto }: { id: number; estado: string; texto: string }) {
  return (
    <form action={cambiarEstadoEntreno}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button className="rounded-lg border border-borde px-2 py-1 hover:bg-marfil">{texto}</button>
    </form>
  );
}
