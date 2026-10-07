import Link from "next/link";
import { connection } from "next/server";
import { IconoChevron, IconoCiclo, IconoComidas, IconoCuerpo, IconoEntreno } from "@/components/iconos";
import { COLOR_FASE, NOMBRE_FASE, Pantalla, PildoraNivel, etiqueta, tarjeta } from "@/components/ui";
import { cargarHoy, fechaLarga, mayuscula } from "@/lib/hoy";
import { objetivoAgua } from "@/lib/plan";
import { alternarCreatina, sumarAgua } from "./actions";
import { cerrarSesion } from "../login/actions";

function saludo(minutos: number) {
  if (minutos < 13 * 60) return "Buenos días";
  if (minutos < 20 * 60) return "Buenas tardes";
  return "Buenas noches";
}

export default async function Inicio() {
  // Todo depende de la fecha y hora actuales: se arma en cada visita.
  await connection();

  const { supabase, fecha, ahora, ciclo, entrenos, exig, doble, comidas, ajustes } = await cargarHoy();
  const { data } = await supabase.from("habitos_diarios").select("agua_ml, creatina").eq("fecha", fecha).maybeSingle();
  const habitos = data ?? { agua_ml: 0, creatina: false };

  const metaAgua = objetivoAgua(doble);
  const pctAgua = Math.min(100, Math.round((habitos.agua_ml / metaAgua) * 100));
  const proxima = comidas.find((c) => c.estado === "ahora");
  const activos = entrenos.filter((e) => e.estado !== "salteado");

  return (
    <Pantalla>
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-medium text-gris">{mayuscula(fechaLarga(fecha))}</p>
          <h1 className="font-serif text-[30px] leading-tight">{saludo(ahora)}, Saskia</h1>
        </div>
        <form action={cerrarSesion}>
          <button className="h-11 text-sm text-gris underline-offset-4 hover:underline">Salir</button>
        </form>
      </header>

      {/* Ciclo */}
      <Link href="/ciclo" className={`${tarjeta} flex items-center gap-4 bg-rosa`}>
        {ciclo ? (
          <>
            <span
              className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-4 bg-tarjeta"
              style={{ borderColor: COLOR_FASE[ciclo.fase] }}
            >
              <span className="text-[9px] font-bold tracking-wider text-bordo">DÍA</span>
              <span className="font-serif text-xl leading-none">{ciclo.diaDelCiclo}</span>
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-serif text-xl">Fase {NOMBRE_FASE[ciclo.fase].toLowerCase()}</span>
              <span className="text-[13px] text-gris">
                Próximo período{" "}
                {ciclo.diasHastaProximo > 0
                  ? `en ${ciclo.diasHastaProximo} días`
                  : ciclo.diasHastaProximo === 0
                    ? "estimado para hoy"
                    : `con ${-ciclo.diasHastaProximo} días de atraso`}
              </span>
            </div>
          </>
        ) : (
          <span className="flex-1 text-sm text-gris">Todavía no hay períodos cargados. Cargalos desde Ciclo.</span>
        )}
        <IconoChevron size={18} className="text-bordo" />
      </Link>

      {/* Próxima comida */}
      {proxima && (
        <section className={`${tarjeta} flex flex-col gap-1 ${proxima.prioritaria ? "border-bordo" : ""}`}>
          <div className="flex items-center justify-between">
            <p className={etiqueta}>Próxima comida · {proxima.hora}</p>
            {proxima.prioritaria && (
              <span className="rounded-full bg-bordo px-2.5 py-0.5 text-xs font-bold text-white">Prioridad</span>
            )}
          </div>
          <p className="font-serif text-2xl">{proxima.titulo}</p>
          <p className="text-sm text-gris">{proxima.detalle}</p>
          {proxima.extras.length > 0 && <p className="text-sm text-gris">{proxima.extras.join(" · ")}</p>}
          <Link href="/comidas" className="mt-1 h-11 w-fit content-center text-sm font-semibold text-bordo">
            Ver el día completo
          </Link>
        </section>
      )}

      {/* Entrenos de hoy */}
      <section className={tarjeta}>
        <div className="flex items-center justify-between">
          <p className={etiqueta}>Entrenos de hoy</p>
          <Link href="/entreno" className="h-11 content-center text-sm font-semibold text-bordo">
            Abrir
          </Link>
        </div>
        {activos.length === 0 ? (
          <p className="text-sm text-gris">Día de descanso, salvo que sumes algo.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea">
            {activos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="w-12 text-[15px] font-semibold tabular-nums">{e.hora_inicio.slice(0, 5)}</span>
                <span className={`flex-1 text-[15px] ${e.estado === "hecho" ? "text-gris" : ""}`}>
                  {e.disciplina}
                  {e.estado === "hecho" && <span className="ml-1 text-verde">✓</span>}
                </span>
                <PildoraNivel nivel={exig.get(e.id)!.nivel} />
              </li>
            ))}
          </ul>
        )}
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
          className="mt-2 h-2 overflow-hidden rounded-full bg-crema"
          role="progressbar"
          aria-label="Agua del día"
          aria-valuenow={pctAgua}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-bordo" style={{ width: `${pctAgua}%` }} />
        </div>
        <div className="mt-3 flex gap-2 text-sm">
          {[250, 500].map((ml) => (
            <form key={ml} action={sumarAgua}>
              <input type="hidden" name="ml" value={ml} />
              <button className="h-11 rounded-full border border-borde px-4">+{ml} ml</button>
            </form>
          ))}
          <form action={sumarAgua}>
            <input type="hidden" name="ml" value={-250} />
            <button className="h-11 rounded-full px-3 text-gris">−250</button>
          </form>
        </div>

        <form action={alternarCreatina} className="mt-4 border-t border-linea pt-3">
          <button className="flex min-h-11 w-full items-center justify-between text-sm">
            <span>Creatina (3–5 g con el almuerzo)</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                habitos.creatina ? "bg-bordo text-white" : "border border-borde text-gris"
              }`}
            >
              {habitos.creatina ? "Tomada" : "Pendiente"}
            </span>
          </button>
        </form>
      </section>

      {/* Accesos rápidos */}
      <section className="flex flex-col gap-2">
        <h2 className="font-serif text-xl">Registrar en segundos</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/entreno/gym", texto: "Sesión de gym", Icono: IconoEntreno },
            { href: "/cuerpo#medicion", texto: "Medición", Icono: IconoCuerpo },
            { href: "/ciclo#sintomas", texto: "Cómo me siento", Icono: IconoCiclo },
            { href: "/comidas#registrar", texto: "Comida", Icono: IconoComidas },
          ].map(({ href, texto, Icono }) => (
            <Link key={href} href={href} className={`${tarjeta} flex items-center gap-3 p-4 text-sm font-semibold`}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-rosa text-bordo">
                <Icono size={18} />
              </span>
              {texto}
            </Link>
          ))}
        </div>
      </section>
    </Pantalla>
  );
}
