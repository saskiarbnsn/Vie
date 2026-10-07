import { connection } from "next/server";
import { Cabecera, Pantalla, TituloSeccion, tarjeta } from "@/components/ui";
import { hoyEnCordoba } from "@/lib/ciclo";
import { cargarSesionDeHoy } from "@/lib/gym";
import { fechaLarga, mayuscula } from "@/lib/hoy";
import { crearClienteServidor } from "@/lib/supabase/server";
import { EditorGym } from "./editor";

const SUGERIDOS = [
  "Hip thrust",
  "Sentadilla búlgara",
  "Peso muerto rumano",
  "Remo con mancuerna",
  "Jalón al pecho",
  "Press militar con mancuernas",
  "Dominadas asistidas",
  "Face pull",
  "Plancha",
];

export default async function Gym(props: PageProps<"/entreno/gym">) {
  await connection();
  const { guardada } = await props.searchParams;
  const supabase = await crearClienteServidor();
  const fecha = hoyEnCordoba();
  const datos = await cargarSesionDeHoy(supabase, fecha);
  const sugeridos = [...new Set([...datos.conocidos, ...SUGERIDOS])];

  return (
    <Pantalla>
      <Cabecera
        titulo="Sesión de gym"
        bajada={mayuscula(fechaLarga(fecha))}
        volver={{ href: "/entreno", texto: "Entreno" }}
      />

      {guardada && (
        <p role="status" className="rounded-2xl bg-verde-claro p-3.5 text-sm text-verde-oscuro">
          Sesión guardada. Ahora toca el post gym: yogur griego o 1 huevo, para no llegar vacía a la próxima comida.
        </p>
      )}

      {datos.origen === "anterior" && datos.anteriorFecha && (
        <p className="rounded-2xl border border-borde bg-tarjeta p-3.5 text-[13px] leading-snug text-gris">
          Arranqué con los ejercicios de tu última sesión (
          {fechaLarga(datos.anteriorFecha, { weekday: "long", day: "numeric", month: "short" })}). Cambiá lo que haga
          falta y marcá cada serie al terminarla.
        </p>
      )}

      <EditorGym
        key={datos.origen + datos.ejercicios.length}
        inicial={datos.ejercicios}
        laVezPasada={datos.laVezPasada}
        sugeridos={sugeridos}
        terminada={datos.terminada}
      />

      {datos.historial.length > 0 && (
        <section className={`${tarjeta} flex flex-col gap-1`}>
          <TituloSeccion>Últimas sesiones</TituloSeccion>
          <ul className="flex flex-col">
            {datos.historial.map((h) => (
              <li key={h.fecha} className="flex items-center justify-between border-t border-linea py-2.5 text-sm">
                <span>{mayuscula(fechaLarga(h.fecha, { weekday: "short", day: "numeric", month: "short" }))}</span>
                <span className="text-gris">{h.texto}</span>
                <span className="tabular-nums font-semibold">{Math.round(h.volumen).toLocaleString("es-AR")} kg</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Pantalla>
  );
}
