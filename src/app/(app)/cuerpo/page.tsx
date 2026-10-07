import Link from "next/link";
import { connection } from "next/server";
import { IconoAmanecer, IconoChispa, IconoLlama, IconoMas, IconoSync } from "@/components/iconos";
import { BarraRango, Cabecera, NOMBRE_FASE, Pantalla, TituloSeccion, botonPrincipal, tarjeta } from "@/components/ui";
import { aDia, estadoCiclo, hoyEnCordoba } from "@/lib/ciclo";
import {
  METRICAS,
  formatear,
  lecturaObjetivo,
  porcentajeEnBarra,
  posicion,
  type ClaveMetrica,
  type Medicion,
} from "@/lib/cuerpo";
import { cargarPeriodos } from "@/lib/datos";
import { fechaLarga } from "@/lib/hoy";
import { crearClienteServidor } from "@/lib/supabase/server";
import { alternarPesaje, registrarMedicion } from "./actions";

const TONO = {
  bien: "bg-folicular/15 text-verde-oscuro",
  atencion: "bg-ovulatoria/15 text-ambar-oscuro",
  alerta: "bg-bordo/10 text-bordo",
};

const MAS: ClaveMetrica[] = ["hidratacion_pct", "proteina_pct", "imc", "grasa_visceral", "tejido_oseo_pct", "edad_corporal"];

const fechaMedicion = (m: Medicion) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Cordoba" }).format(new Date(m.medido_en));

function Valor({ m, clave, grande }: { m: Medicion; clave: ClaveMetrica; grande?: boolean }) {
  const def = METRICAS[clave];
  const v = m[clave];
  return (
    <span className="flex items-baseline gap-1">
      <span className={`font-serif ${grande ? "text-[26px]" : "text-xl"}`}>{v == null ? "—" : formatear(Number(v), def.decimales)}</span>
      {def.unidad && <span className="text-xs text-gris">{def.unidad}</span>}
    </span>
  );
}

export default async function Cuerpo() {
  await connection();
  const supabase = await crearClienteServidor();
  const hoy = hoyEnCordoba();
  const [{ data }, periodos, { data: pesaje }] = await Promise.all([
    supabase.from("composicion_corporal").select("*").order("medido_en", { ascending: false }).limit(7),
    cargarPeriodos(supabase),
    supabase.from("recordatorios").select("activo").eq("tipo", "pesaje").limit(1).maybeSingle(),
  ]);

  const mediciones = ((data ?? []) as Medicion[]).map((m) => ({
    ...m,
    ...Object.fromEntries(
      Object.keys(METRICAS).map((k) => [k, m[k as ClaveMetrica] == null ? null : Number(m[k as ClaveMetrica])]),
    ),
  })) as Medicion[];
  const ultima = mediciones[0];
  const anterior = mediciones[1];

  const formulario = (
    <details id="medicion" className={`${tarjeta} scroll-mt-6 p-4`} open={!ultima}>
      <summary className={`${botonPrincipal} cursor-pointer list-none`}>
        <IconoMas size={18} />
        Registrar medición
      </summary>
      <form action={registrarMedicion} className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-bold tracking-wide text-gris">FECHA</span>
          <input type="date" name="fecha" defaultValue={hoy} max={hoy} className="h-11 rounded-xl border border-borde bg-tarjeta px-3" />
        </label>
        {(Object.keys(METRICAS) as ClaveMetrica[]).map((k) => (
          <label key={k} className="flex flex-col gap-1">
            <span className="text-xs text-gris">
              {METRICAS[k].nombre}
              {METRICAS[k].unidad ? ` (${METRICAS[k].unidad})` : ""}
            </span>
            <input
              name={k}
              inputMode="decimal"
              required={k === "peso_kg"}
              className="h-11 rounded-xl border border-borde bg-tarjeta px-3 tabular-nums"
            />
          </label>
        ))}
        <button className="col-span-2 h-12 rounded-full bg-bordo font-semibold text-white">Guardar medición</button>
      </form>
    </details>
  );

  if (!ultima) {
    return (
      <Pantalla>
        <Cabecera titulo="Tu cuerpo" bajada="Todavía no hay mediciones" />
        {formulario}
      </Pantalla>
    );
  }

  const fechaUltima = fechaMedicion(ultima);
  const fase = estadoCiclo(periodos, fechaUltima)?.fase;
  const dias = aDia(hoy) - aDia(fechaUltima);
  const cambio = anterior?.peso_kg != null && ultima.peso_kg != null ? ultima.peso_kg - anterior.peso_kg : null;

  // Gráfico: peso partido en grasa y masa libre de grasa, últimas 7 mediciones.
  const serie = [...mediciones].reverse().filter((m) => m.peso_kg != null);
  const pesos = serie.map((m) => m.peso_kg!);
  const base = Math.floor(Math.min(...pesos) - 6);
  const tope = Math.max(...pesos);

  const grasa = ultima.grasa_pct != null ? lecturaObjetivo("grasa_pct", ultima.grasa_pct) : null;
  const magro = ultima.tejido_magro_pct != null ? posicion(ultima.tejido_magro_pct, METRICAS.tejido_magro_pct) : null;

  return (
    <Pantalla>
      <Cabecera
        titulo="Tu cuerpo"
        bajada={`Última medición · ${fechaLarga(fechaUltima, { day: "numeric", month: "short" })} · Femmto${
          fase ? ` · fase ${NOMBRE_FASE[fase].toLowerCase()}` : ""
        }`}
      />

      {/* Peso */}
      <section className={`${tarjeta} flex flex-col gap-4 shadow-[0_5px_16px_rgba(74,59,53,0.08)]`}>
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gris">Peso</span>
            <span className="flex items-baseline gap-1">
              <span className="font-serif text-[40px] leading-none">{formatear(ultima.peso_kg ?? 0, 2)}</span>
              <span className="text-sm text-gris">kg</span>
            </span>
          </div>
          <span className="rounded-full bg-borde/45 px-2.5 py-1 text-[11px] font-bold">
            {cambio == null
              ? "Primera medición"
              : `${Math.abs(cambio) < 0.3 ? "Estable" : cambio > 0 ? "Subió" : "Bajó"} · ${cambio > 0 ? "+" : ""}${formatear(cambio, 2)} kg`}
          </span>
        </div>
        <div className="flex h-36 items-end gap-3" role="img" aria-label="Peso de las últimas mediciones">
          {serie.map((m, i) => {
            const ultimaBarra = i === serie.length - 1;
            const total = ((m.peso_kg! - base) / (tope - base)) * 120;
            const g = m.grasa_pct != null ? (m.peso_kg! * m.grasa_pct) / 100 : 0;
            const altoGrasa = (g / (m.peso_kg! - base)) * total;
            return (
              <div key={m.medido_en} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full max-w-9 flex-col gap-0.5 overflow-hidden rounded-[10px]" style={{ height: total }}>
                  <span className="w-full bg-lutea" style={{ height: Math.min(altoGrasa, total), opacity: ultimaBarra ? 0.55 : 0.3 }} />
                  <span className="w-full flex-1 bg-bordo" style={{ opacity: ultimaBarra ? 1 : 0.55 }} />
                </div>
                <span className={`text-[10px] ${ultimaBarra ? "font-bold text-bordo" : "text-gris"}`}>
                  {fechaLarga(fechaMedicion(m), { day: "numeric", month: ultimaBarra ? "numeric" : undefined }).replace(
                    /\s/g,
                    "",
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-gris">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-bordo" />
            Masa libre de grasa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-lutea/55" />
            Grasa corporal
          </span>
          <span className="flex-1 text-right">
            {serie.length === 1 ? "Con más mediciones vas a ver la evolución" : `Últimas ${serie.length} mediciones`}
          </span>
        </div>
      </section>

      {/* Objetivo */}
      <section className="flex flex-col gap-2.5">
        <TituloSeccion accion={<span className="text-xs font-bold text-bordo">Bajar grasa · cuidar músculo</span>}>
          Para tu objetivo
        </TituloSeccion>
        {(["grasa_pct", "musculo_esqueletico_pct", "tejido_magro_pct"] as const).map((k) => {
          const v = ultima[k];
          if (v == null) return null;
          const def = METRICAS[k];
          const lectura = lecturaObjetivo(k, v);
          return (
            <div key={k} className={`${tarjeta} flex flex-col gap-2.5 px-4 py-3.5`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-gris">{def.nombre}</span>
                  <Valor m={ultima} clave={k} grande />
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${TONO[lectura.tono]}`}>{lectura.texto}</span>
              </div>
              <BarraRango
                porcentaje={porcentajeEnBarra(v, def)}
                min={`${formatear(def.min, 1)} ${def.unidad}`}
                max={`${formatear(def.max, 1)} ${def.unidad}`}
              />
            </div>
          );
        })}
        <div className="flex gap-3 rounded-2xl bg-rosa p-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-bordo/10 text-bordo">
            <IconoChispa size={16} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold text-bordo">Lectura de Vie</span>
            <span className="text-[13px] leading-snug">
              {magro === "piso" || magro === "bajo"
                ? "El tejido magro está en el piso del rango. Proteína en cada comida y no saltear el gym es lo que más lo sostiene mientras baja la grasa."
                : grasa?.tono === "atencion"
                  ? "Estás en rango, con margen para bajar grasa. Proteína en cada comida y el gym cuidan el músculo en el proceso."
                  : "Todo en rango. Seguí con el plan y compará la próxima medición en la misma fase del ciclo."}
            </span>
          </div>
        </div>
      </section>

      {/* Metabolismo */}
      {ultima.metabolismo_basal_kcal != null && (
        <section className="flex flex-col gap-2.5">
          <TituloSeccion
            accion={
              <Link href="/comidas" className="h-11 content-center text-xs font-bold text-bordo">
                Ver en Comidas
              </Link>
            }
          >
            Metabolismo
          </TituloSeccion>
          <div className={`${tarjeta} flex flex-col gap-2.5 p-4`}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ovulatoria/15 text-ambar">
                <IconoLlama size={18} />
              </span>
              <div className="flex flex-col">
                <span className="text-xs text-gris">Tasa metabólica basal</span>
                <Valor m={ultima} clave="metabolismo_basal_kcal" grande />
              </div>
            </div>
            <BarraRango
              porcentaje={porcentajeEnBarra(ultima.metabolismo_basal_kcal, METRICAS.metabolismo_basal_kcal)}
              min="1200"
              max="1600 kcal"
            />
            <p className="text-[11px] leading-snug text-gris">
              Es lo que gastás en reposo, sin contar el entreno. Comer por debajo de esto juega en contra del músculo.
            </p>
          </div>
        </section>
      )}

      {/* Más métricas */}
      <section className="flex flex-col gap-2.5">
        <TituloSeccion
          accion={
            <span className="text-xs font-bold text-bordo">
              {MAS.every((k) => ultima[k] == null || ["piso", "rango", "techo"].includes(posicion(ultima[k]!, METRICAS[k])))
                ? "Todo en rango"
                : "Revisá las marcadas"}
            </span>
          }
        >
          Más métricas
        </TituloSeccion>
        <div className="grid grid-cols-2 gap-2">
          {MAS.filter((k) => ultima[k] != null).map((k) => (
            <div key={k} className="flex flex-col gap-2 rounded-[14px] border border-borde bg-tarjeta p-3">
              <span className="text-[11px] text-gris">{METRICAS[k].nombre}</span>
              <Valor m={ultima} clave={k} />
              <BarraRango porcentaje={porcentajeEnBarra(ultima[k]!, METRICAS[k])} />
            </div>
          ))}
        </div>
      </section>

      {/* Pesaje consciente */}
      <form action={alternarPesaje} className="flex items-center gap-3 rounded-2xl bg-rosa p-3.5">
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-bordo/10 text-bordo">
          <IconoAmanecer size={18} />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-bold text-bordo">Pesaje consciente</span>
          <span className="text-[11px] leading-snug">
            Al despertar y en ayunas, para comparar mediciones. Recordatorio a las 8:00, y cada medición queda marcada con
            su fase del ciclo.
          </span>
        </div>
        <button role="switch" aria-checked={pesaje?.activo ?? false} aria-label="Recordatorio de pesaje consciente" className="flex h-11 w-12 items-center justify-center">
          <span className={`flex h-6 w-10 items-center rounded-full p-[3px] ${pesaje?.activo ? "justify-end bg-bordo" : "justify-start bg-borde"}`}>
            <span className="size-[18px] rounded-full bg-tarjeta" />
          </span>
        </button>
      </form>

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-gris">
        <IconoSync size={12} />
        {ultima.origen === "apple_salud" ? "Sincronizado desde Femmto vía Apple Salud" : "Cargado a mano desde Femmto"} ·{" "}
        {dias === 0 ? "hoy" : `hace ${dias} ${dias === 1 ? "día" : "días"}`}
      </p>

      {formulario}
    </Pantalla>
  );
}
