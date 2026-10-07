import Link from "next/link";
import { connection } from "next/server";
import { IconoLapiz, IconoMas } from "@/components/iconos";
import { LineaComidas } from "@/components/linea-comidas";
import {
  Cabecera,
  Pantalla,
  PildoraNivel,
  TituloSeccion,
  botonPrincipal,
  colorDisciplina,
  tarjeta,
} from "@/components/ui";
import { semanaDe } from "@/lib/ciclo";
import { asegurarDias, cargarEntrenos } from "@/lib/datos";
import { NOMBRE_ENERGIA, buscarDisciplina, type Energia } from "@/lib/exigencia";
import { cargarHoy, fechaLarga, mayuscula } from "@/lib/hoy";
import { aMinutos, armarBloques } from "@/lib/plan";
import { borrarEntreno, cambiarEstadoEntreno, planificarEntreno } from "../actions";
import { guardarEnergia } from "./actions";
import { cargarResumenGym } from "@/lib/gym";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const INICIAL = ["L", "M", "M", "J", "V", "S", "D"];

const NOTA_ENERGIA: Record<Energia, string> = {
  bien: "Exigencia según tu rutina.",
  poca: "Bajé un nivel la exigencia de hoy. El pre entreno se mantiene: llegar con energía es lo que más ayuda.",
  muy_baja: "Bajé la exigencia al mínimo. Si preferís descansar o mover un turno, editá solo esta semana.",
};

export default async function Entreno() {
  await connection();
  const hoy = await cargarHoy();
  const { supabase, fecha, ahora, ctx, energia, entrenos, exig, comidas, ciclo } = hoy;

  const semana = semanaDe(fecha);
  await asegurarDias(supabase, semana);
  const [entrenosSemana, rutina, gym] = await Promise.all([
    cargarEntrenos(supabase, semana[0], semana[6]),
    supabase
      .from("rutina_semanal")
      .select("dia_semana, hora_inicio, disciplina")
      .eq("activa", true)
      .order("dia_semana")
      .order("hora_inicio"),
    cargarResumenGym(supabase, fecha),
  ]);

  const disciplina = (nombre: string) => buscarDisciplina(ctx.disciplinas, nombre);
  const bloquesHoy = armarBloques(entrenos);
  const rutinaPorDia = DIAS.map((_, i) => (rutina.data ?? []).filter((r) => r.dia_semana === i + 1));
  const proximoGym = entrenosSemana.find(
    (e) => e.fecha > fecha && e.estado === "pendiente" && disciplina(e.disciplina).categoria === "gym",
  );

  return (
    <Pantalla>
      <Cabecera
        titulo="Entreno"
        bajada={mayuscula(fechaLarga(fecha))}
        accion={
          <Link
            href="/entreno/rutina"
            className="flex h-11 items-center gap-1.5 rounded-full border border-borde bg-tarjeta px-3.5 text-sm font-semibold text-bordo"
          >
            <IconoLapiz size={16} />
            Editar rutina
          </Link>
        }
      />

      {/* Semana */}
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Esta semana">
        {semana.map((f, i) => {
          const delDia = entrenosSemana.filter((e) => e.fecha === f && e.estado !== "salteado");
          const esHoy = f === fecha;
          return (
            <li
              key={f}
              aria-current={esHoy ? "date" : undefined}
              className={`flex flex-col items-center gap-1 rounded-[14px] py-2.5 ${
                esHoy ? "bg-bordo text-white" : "border border-borde bg-tarjeta"
              }`}
            >
              <span className="text-[11px] font-semibold">{INICIAL[i]}</span>
              <span className="text-[17px] font-semibold">{Number(f.slice(8))}</span>
              <span className="flex h-1.5 gap-[3px]">
                {delDia.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className="size-1.5 rounded-full"
                    style={{ background: esHoy ? "#fff" : colorDisciplina(disciplina(e.disciplina).categoria).punto }}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Hoy */}
      <section className={`${tarjeta} flex flex-col gap-3.5`}>
        <div className="flex items-baseline justify-between">
          <TituloSeccion>Hoy entrenás</TituloSeccion>
          {bloquesHoy.some((b) => b.entrenos.length >= 2) && (
            <span className="rounded-xl bg-ambar-claro px-2.5 py-1 text-xs font-bold text-[#7a4a0e]">Doble turno</span>
          )}
        </div>

        {entrenos.length === 0 && <p className="text-sm text-gris">Día de descanso, salvo que sumes algo.</p>}
        <ul className="flex flex-col gap-3">
          {entrenos.map((e) => {
            const inicio = aMinutos(e.hora_inicio);
            const enCurso = e.estado === "pendiente" && ahora >= inicio && ahora < inicio + e.duracion_min;
            const ex = exig.get(e.id)!;
            const salteado = e.estado === "salteado";
            return (
              <li key={e.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`w-12 text-base font-semibold tabular-nums ${salteado ? "text-gris line-through" : ""}`}>
                    {e.hora_inicio.slice(0, 5)}
                  </span>
                  <span
                    className="w-1 self-stretch rounded-full"
                    style={{ background: colorDisciplina(disciplina(e.disciplina).categoria).punto }}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className={`text-[15px] font-semibold ${salteado ? "text-gris line-through" : ""}`}>
                      {e.disciplina}
                      {e.estado === "hecho" && <span className="ml-1 text-verde">✓</span>}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-gris">
                      {e.duracion_min} min
                      <PildoraNivel nivel={ex.nivel} />
                      {ex.motivo && <span className="italic">{ex.motivo}</span>}
                    </span>
                  </div>
                  {enCurso && (
                    <span className="rounded-xl bg-bordo px-2.5 py-1 text-xs font-bold text-white">En curso</span>
                  )}
                </div>
                <div className="flex gap-1.5 pl-[60px] text-xs">
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
                      <button className="h-9 rounded-full px-3 text-gris hover:bg-crema">Borrar</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <details className="border-t border-linea pt-2">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-bordo">
            <IconoMas size={16} />
            Sumar un turno hoy
          </summary>
          <form action={planificarEntreno} className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <input type="hidden" name="fecha" value={fecha} />
            <input
              name="hora"
              type="time"
              required
              defaultValue="19:00"
              aria-label="Hora"
              className="h-11 rounded-xl border border-borde bg-tarjeta px-2"
            />
            <select name="disciplina" aria-label="Deporte" className="h-11 rounded-xl border border-borde bg-tarjeta px-2">
              {ctx.disciplinas.map((d) => (
                <option key={d.nombre}>{d.nombre}</option>
              ))}
            </select>
            <select
              name="duracion"
              defaultValue="60"
              aria-label="Duración"
              className="h-11 rounded-xl border border-borde bg-tarjeta px-2"
            >
              <option value="45">45 min</option>
              <option value="60">60 min</option>
              <option value="75">75 min</option>
              <option value="90">90 min</option>
            </select>
            <button className="h-11 rounded-full bg-bordo px-4 font-semibold text-white">Sumar</button>
          </form>
        </details>

        {entrenos.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-linea pt-3.5">
            <span className="text-sm font-semibold">¿Cómo te sentís para entrenar hoy?</span>
            <div role="group" aria-label="Energía de hoy" className="grid grid-cols-3 gap-1 rounded-[14px] bg-crema p-1">
              {(Object.keys(NOMBRE_ENERGIA) as Energia[]).map((n) => {
                const activa = (energia ?? "bien") === n;
                return (
                  <form key={n} action={guardarEnergia}>
                    <input type="hidden" name="nivel" value={n} />
                    <button
                      aria-pressed={activa}
                      className={`h-11 w-full rounded-[11px] text-sm ${
                        activa ? "bg-bordo font-semibold text-white" : "font-medium"
                      }`}
                    >
                      {NOMBRE_ENERGIA[n]}
                    </button>
                  </form>
                );
              })}
            </div>
            <p className="text-[13px] leading-snug text-gris">{NOTA_ENERGIA[energia ?? "bien"]}</p>
          </div>
        )}
      </section>

      {/* Comidas según los turnos */}
      <section className={`${tarjeta} flex flex-col gap-3.5`}>
        <div className="flex flex-col gap-1">
          <TituloSeccion>Tu comida de hoy, según tus turnos</TituloSeccion>
          <p className="text-[13px] leading-snug text-gris">
            Vie arma los horarios a partir de la rutina y la exigencia. Si cambiás un turno, esto se recalcula.
          </p>
        </div>
        <LineaComidas comidas={comidas} />
        {ciclo?.fase === "premenstrual" && (
          <p className="rounded-[14px] bg-rosa px-3.5 py-3 text-[13px] leading-snug text-bordo-oscuro">
            Día {ciclo.diaDelCiclo} del ciclo, fase premenstrual. Sumá +1 cda de hidrato en almuerzo y cena, y no
            saltees la merienda.
          </p>
        )}
      </section>

      {/* Rutina */}
      <section className={`${tarjeta} flex flex-col gap-2`}>
        <TituloSeccion
          accion={
            <Link href="/entreno/rutina?alcance=siempre" className="h-11 content-center text-sm font-semibold text-bordo">
              Editar
            </Link>
          }
        >
          Rutina semanal
        </TituloSeccion>
        <ul className="flex flex-col">
          {rutinaPorDia.map((turnos, i) => {
            const esHoy = semana[i] === fecha;
            const bloques = armarBloques(
              turnos.map((t, j) => ({
                id: j,
                hora_inicio: t.hora_inicio,
                disciplina: t.disciplina,
                duracion_min: 60,
                estado: "pendiente" as const,
                origen: "rutina" as const,
              })),
            );
            return (
              <li
                key={DIAS[i]}
                className={`-mx-2.5 flex items-start gap-2.5 rounded-xl p-2.5 ${esHoy ? "bg-crema" : ""}`}
              >
                <span className="w-9 shrink-0 pt-1 text-[13px] font-bold">{DIAS[i]}</span>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {turnos.length === 0 && <span className="py-1 text-[13px] text-gris">Descanso</span>}
                  {turnos.map((t) => (
                    <span
                      key={`${t.hora_inicio}-${t.disciplina}`}
                      className={`whitespace-nowrap rounded-xl px-2.5 py-1 text-[13px] ${colorDisciplina(disciplina(t.disciplina).categoria).chip}`}
                    >
                      <b className="tabular-nums">{t.hora_inicio.slice(0, 5)}</b> {t.disciplina}
                    </span>
                  ))}
                  {bloques.some((b) => b.entrenos.length >= 2) && (
                    <span className="rounded-[10px] bg-ambar-claro px-2 py-1 text-[11px] font-bold text-[#7a4a0e]">
                      Doble turno
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-gris">
          El gym cambia de horario: sumalo como turno del día o en &ldquo;Editar rutina&rdquo;, solo esta semana.
        </p>
      </section>

      {/* Gym */}
      <section className={`${tarjeta} flex flex-col gap-3.5`}>
        <div className="flex flex-col gap-1">
          <TituloSeccion>Gym</TituloSeccion>
          <span className="text-[13px] text-gris">
            {gym.ultima
              ? `Última sesión · ${fechaLarga(gym.ultima.fecha, { weekday: "long", day: "numeric", month: "short" })} · ${gym.ultima.ejercicios} ejercicios · ${gym.ultima.series} series`
              : "Todavía no registraste sesiones."}
          </span>
        </div>
        {gym.destacados.length > 0 && (
          <ul className="flex flex-col">
            {gym.destacados.map((x) => (
              <li key={x.nombre} className="flex items-center gap-3 border-t border-linea py-2.5">
                <div className="flex flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{x.nombre}</span>
                  <span className="text-[13px] tabular-nums text-gris">{x.resumen}</span>
                </div>
                {x.tendencia && (
                  <span
                    className={`rounded-[10px] px-2 py-1 text-xs font-bold ${
                      x.tendencia === "igual" ? "bg-crema text-gris" : "bg-verde-claro text-verde-oscuro"
                    }`}
                  >
                    {x.tendencia}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <Link href="/entreno/gym" className={botonPrincipal}>
          <IconoMas size={18} />
          Registrar sesión de gym
        </Link>
        {proximoGym && (
          <p className="text-center text-[13px] text-gris">
            Próxima: {fechaLarga(proximoGym.fecha, { weekday: "long", day: "numeric" })} ·{" "}
            {proximoGym.hora_inicio.slice(0, 5)}
          </p>
        )}
      </section>

      <p className="text-center text-xs text-gris">
        La exigencia se ajusta en Editar rutina: por deporte, por semana o por turno.
      </p>
    </Pantalla>
  );
}

function FormEstado({ id, estado, texto }: { id: number; estado: string; texto: string }) {
  return (
    <form action={cambiarEstadoEntreno}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button className="h-9 rounded-full border border-borde px-3 hover:bg-crema">{texto}</button>
    </form>
  );
}
