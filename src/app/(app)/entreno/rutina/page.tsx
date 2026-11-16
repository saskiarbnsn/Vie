import Link from "next/link";
import { connection } from "next/server";
import { IconoInfo, IconoMas } from "@/components/iconos";
import { Cabecera, Pantalla, TituloSeccion, colorDisciplina, tarjeta } from "@/components/ui";
import { faseDelDia, hoyEnCordoba, semanaDe } from "@/lib/ciclo";
import { asegurarDias, cargarContexto, cargarEntrenos, cargarPeriodos } from "@/lib/datos";
import { NIVELES, NOMBRE_NIVEL } from "@/lib/exigencia";
import { fechaLarga } from "@/lib/hoy";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  alternarAjustePeriodo,
  alternarDescarga,
  cambiarExigenciaDisciplina,
  crearDisciplina,
} from "../actions";
import { EditorRutina, type DiaParaEditar } from "./editor";

const NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function Rutina(props: PageProps<"/entreno/rutina">) {
  await connection();
  const { alcance: param } = await props.searchParams;
  const alcance = param === "siempre" ? "siempre" : "semana";

  const supabase = await crearClienteServidor();
  const hoy = hoyEnCordoba();
  const semana = semanaDe(hoy);
  const periodos = await cargarPeriodos(supabase);
  const { ctx, ciclo } = await cargarContexto(supabase, hoy, periodos);

  let dias: DiaParaEditar[];
  if (alcance === "semana") {
    await asegurarDias(supabase, semana);
    const entrenos = await cargarEntrenos(supabase, semana[0], semana[6]);
    dias = semana.map((fecha, i) => ({
      clave: fecha,
      titulo: NOMBRES[i],
      subtitulo: fecha === hoy ? `${Number(fecha.slice(8))} · hoy` : fechaLarga(fecha, { day: "numeric", month: "short" }),
      editable: fecha >= hoy,
      enPeriodo: faseDelDia(periodos, fecha, hoy)?.fase === "menstrual",
      turnos: entrenos
        .filter((e) => e.fecha === fecha)
        .map((e) => ({
          hora: e.hora_inicio.slice(0, 5),
          disciplina: e.disciplina,
          duracion: e.duracion_min,
          exigencia: e.exigencia ?? null,
          bloqueado: e.estado !== "pendiente" ? (e.estado === "hecho" ? "Hecho" : "Salteado") : null,
        })),
    }));
  } else {
    const { data } = await supabase
      .from("rutina_semanal")
      .select("dia_semana, hora_inicio, disciplina, duracion_min, exigencia")
      .eq("activa", true)
      .order("hora_inicio");
    dias = NOMBRES.map((titulo, i) => ({
      clave: String(i + 1),
      titulo,
      subtitulo: "",
      editable: true,
      enPeriodo: false,
      turnos: (data ?? [])
        .filter((r) => r.dia_semana === i + 1)
        .map((r) => ({
          hora: r.hora_inicio.slice(0, 5),
          disciplina: r.disciplina,
          duracion: r.duracion_min,
          exigencia: r.exigencia ?? null,
          bloqueado: null,
        })),
    }));
  }

  // Próximo período: para avisar que esos días se ajustan solos.
  const inicioEstimado =
    ciclo && ciclo.diasHastaProximo > 0 ? fechaLarga(ciclo.proximoPeriodo, { weekday: "long", day: "numeric", month: "short" }) : null;

  return (
    <Pantalla>
      <Cabecera
        titulo="Rutina semanal"
        volver={{ href: "/entreno", texto: "Entreno" }}
        bajada="Tocá un turno para cambiar deporte, hora, duración o exigencia."
      />

      <section className={`${tarjeta} flex flex-col gap-2.5 p-4`}>
        <span className="text-[13px] font-bold tracking-wide text-gris">QUÉ ESTÁS EDITANDO</span>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-crema p-1">
          {(["semana", "siempre"] as const).map((a) => (
            <Link
              key={a}
              href={`/entreno/rutina?alcance=${a}`}
              aria-current={alcance === a ? "page" : undefined}
              className={`flex h-11 items-center justify-center rounded-[11px] text-sm ${
                alcance === a ? "bg-bordo font-semibold text-white" : "font-medium"
              }`}
            >
              {a === "semana" ? "Solo esta semana" : "Todas las semanas"}
            </Link>
          ))}
        </div>
        <p className="text-[13px] leading-snug text-gris">
          {alcance === "semana"
            ? "Para un cambio puntual. La semana que viene vuelve tu rutina base."
            : "Cambia tu rutina base y el plan de comidas de todas las semanas, desde hoy."}
        </p>
      </section>

      <section className={`${tarjeta} flex flex-col gap-1 p-4`}>
        <TituloSeccion>Exigencia de esta semana</TituloSeccion>
        <Interruptor
          titulo="Semana de descarga de gym"
          detalle="Baja un nivel la exigencia de todos los turnos de gym."
          activo={ctx.descargaGym}
          accion={alternarDescarga}
        />
        <Interruptor
          titulo="Ajustar en mi período"
          detalle="Esos días baja un nivel. Antes de entrenar, contale a Vie cómo te sentís."
          activo={ctx.ajustarEnPeriodo}
          accion={alternarAjustePeriodo}
          borde
        />
        {ctx.ajustarEnPeriodo && inicioEstimado && (
          <p className="mt-1 rounded-[14px] bg-rosa px-3.5 py-3 text-[13px] leading-snug text-bordo-oscuro">
            Tu próximo período se estima para el {inicioEstimado}. Los turnos de esos días se ajustan solos.
          </p>
        )}
      </section>

      <EditorRutina
        key={alcance}
        alcance={alcance}
        dias={dias}
        disciplinas={ctx.disciplinas}
        descargaGym={ctx.descargaGym}
        ajustarEnPeriodo={ctx.ajustarEnPeriodo}
      />

      <section className={`${tarjeta} flex flex-col gap-1.5 p-4`}>
        <TituloSeccion>Tus deportes</TituloSeccion>
        <p className="pb-1.5 text-[13px] leading-snug text-gris">
          Exigencia habitual de cada uno. Es la base: después la ajustás por semana o por turno.
        </p>
        {ctx.disciplinas.map((d) => (
          <div key={d.nombre} className="flex flex-col gap-2 border-t border-linea py-3">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full" style={{ background: colorDisciplina(d.categoria).punto }} />
              <span className="text-[15px] font-semibold">{d.nombre}</span>
            </div>
            <div
              role="group"
              aria-label={`Exigencia habitual de ${d.nombre}`}
              className="grid grid-cols-3 gap-1 rounded-xl bg-crema p-[3px]"
            >
              {NIVELES.map((n) => (
                <form key={n} action={cambiarExigenciaDisciplina}>
                  <input type="hidden" name="nombre" value={d.nombre} />
                  <input type="hidden" name="nivel" value={n} />
                  <button
                    aria-pressed={d.exigencia_base === n}
                    className={`h-10 w-full rounded-[10px] text-sm ${
                      d.exigencia_base === n ? "bg-bordo font-semibold text-white" : "font-medium"
                    }`}
                  >
                    {NOMBRE_NIVEL[n]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
        <details className="border-t border-linea pt-1">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-bordo">
            <IconoMas size={16} />
            Nuevo deporte
          </summary>
          <form action={crearDisciplina} className="flex flex-col gap-2 pb-2 text-sm">
            <input
              name="nombre"
              required
              placeholder="Nombre"
              aria-label="Nombre del deporte"
              className="h-11 rounded-xl border border-borde bg-tarjeta px-3"
            />
            <div className="grid grid-cols-2 gap-2">
              <select name="categoria" aria-label="Tipo" className="h-11 rounded-xl border border-borde bg-tarjeta px-2">
                <option value="pole">Pole</option>
                <option value="gym">Gym</option>
                <option value="stretching">Stretching</option>
                <option value="otro">Otro</option>
              </select>
              <select
                name="nivel"
                defaultValue="media"
                aria-label="Exigencia habitual"
                className="h-11 rounded-xl border border-borde bg-tarjeta px-2"
              >
                {NIVELES.map((n) => (
                  <option key={n} value={n}>
                    Exigencia {NOMBRE_NIVEL[n].toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <button className="h-11 rounded-full bg-bordo font-semibold text-white">Agregar</button>
          </form>
        </details>
      </section>

      <p className="flex gap-2.5 rounded-2xl bg-rosa p-3.5 text-[13px] leading-snug text-bordo-oscuro">
        <IconoInfo size={18} className="mt-px shrink-0" />
        Al guardar, Vie recalcula el pre entreno (60 a 90 min antes), el post y las porciones. La exigencia define qué
        pre entreno te sugiere. Dos turnos seguidos cuentan como doble turno, con +½ cda de hidrato.
      </p>
    </Pantalla>
  );
}

function Interruptor({
  titulo,
  detalle,
  activo,
  accion,
  borde,
}: {
  titulo: string;
  detalle: string;
  activo: boolean;
  accion: () => Promise<void>;
  borde?: boolean;
}) {
  return (
    <form action={accion} className={`flex items-center gap-3 py-2 ${borde ? "border-t border-linea" : ""}`}>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{titulo}</span>
        <span className="text-[13px] leading-snug text-gris">{detalle}</span>
      </div>
      <button
        role="switch"
        aria-checked={activo}
        aria-label={titulo}
        className="flex h-11 w-14 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-7 w-12 items-center rounded-full p-[3px] ${
            activo ? "justify-end bg-bordo" : "justify-start bg-borde"
          }`}
        >
          <span className="size-[22px] rounded-full bg-white shadow" />
        </span>
      </button>
    </form>
  );
}
