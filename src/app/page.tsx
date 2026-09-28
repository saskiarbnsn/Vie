import { connection } from "next/server";
import { estadoCiclo, type Fase, type Periodo } from "@/lib/ciclo";
import { crearClienteServidor } from "@/lib/supabase/server";

// Primer esqueleto del panel "Hoy": por ahora solo muestra la fase del ciclo,
// para comprobar que la conexión con Supabase y el cálculo funcionan.

const NOMBRE_FASE: Record<Fase, string> = {
  menstrual: "Menstrual",
  folicular: "Folicular",
  ovulatoria: "Ovulatoria",
  lutea: "Lútea",
  premenstrual: "Premenstrual",
};

async function leerPeriodos(): Promise<{ periodos: Periodo[]; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { periodos: [], error: "Falta configurar Supabase (.env.local)." };
  }
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("periodos")
    .select("fecha_inicio, fecha_fin")
    .order("fecha_inicio");
  if (error) return { periodos: [], error: error.message };
  return { periodos: data ?? [] };
}

export default async function Hoy() {
  // La fase depende de la fecha de hoy: la página se arma en cada visita,
  // no una sola vez al hacer el build.
  await connection();
  const { periodos, error } = await leerPeriodos();
  const ciclo = estadoCiclo(periodos);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="font-serif text-3xl">Hoy</h1>

      <section className="mt-6 rounded-2xl border border-borde bg-white p-5">
        <p className="text-sm text-gris">Ciclo</p>
        {ciclo ? (
          <>
            <p className="mt-1 font-serif text-2xl">
              Fase {NOMBRE_FASE[ciclo.fase].toLowerCase()}
            </p>
            <p className="mt-1 text-sm text-gris">
              Día {ciclo.diaDelCiclo} de ~{ciclo.duracionMedia} · próximo período en{" "}
              {ciclo.diasHastaProximo} días
            </p>
            {ciclo.fase === "premenstrual" && (
              <p className="mt-3 text-sm text-terracota">
                +1 cda de hidrato en almuerzo y cena, no saltear la merienda.
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-gris">{error ?? "Todavía no hay períodos cargados."}</p>
        )}
      </section>
    </main>
  );
}
