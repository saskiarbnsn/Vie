# Vie

App personal que une **nutrición, entrenamiento y ciclo menstrual** en un solo lugar: un panel diario para ver qué toca hoy, formularios rápidos para cargar lo que pasó, historial para ver la evolución y un chat para pedir recomendaciones.

## Por qué existe

Entreno pole y gym varias veces por semana, a veces en doble turno, con un plan nutricional que cambia según la fase del ciclo. Esa información vivía repartida en cinco apps distintas (Period Calendar, Apple Salud, Femmto, Cookidoo y el plan en PDF) y ninguna cruzaba los datos. Vie los junta y aplica las reglas del plan de forma automática.

## Stack

| Capa | Herramienta | Por qué |
|---|---|---|
| Frontend + backend | Next.js (App Router) | Una sola base de código para la interfaz y la API |
| Base de datos + auth | Supabase (Postgres) | Historial real, seguridad a nivel de fila y API REST, en el free tier |
| Deploy | Vercel | Free tier, se despliega solo desde GitHub |

## Modelo de datos

Criterio: **lo que se carga se guarda; lo que se deduce se calcula.** La fase del ciclo y las reglas del plan no están en tablas, así nunca quedan desactualizadas.

- **Ciclo:** `periodos` (inicio y fin de cada período) y `registro_ciclo` (flujo, síntomas y ánimo por día).
- **Entrenamiento:** `rutina_semanal` (clases de horario fijo), `entrenos_planificados` (lo que pienso hacer) y `entrenos_realizados` (lo que hice, del Watch o manual). Planificado y realizado van separados: el plan permite avisar el pre entreno *antes*, y el Watch confirma *después*.
- **Nutrición:** `comidas`, `recetas` (Cookidoo, Instagram o propias) y `habitos_diarios` (agua, creatina).
- **Cuerpo:** `composicion_corporal` (Femmto → Apple Salud).
- **Carga:** `recordatorios`, que abren el formulario ya prellenado.

Los datos que llegan de Apple Salud tienen `external_id` único, para que reenviar el mismo export no duplique registros.

## Cómo levantarlo

1. Crear un proyecto en [Supabase](https://supabase.com).
2. En el **SQL Editor**, correr `supabase/migrations/20260927000000_schema.sql` y después `supabase/seed.sql`.
3. Copiar `.env.example` como `.env.local` y completar la URL y la publishable key (Project Settings → API Keys).
4. `npm install` y `npm run dev`.

## Estado

- [x] Schema, datos iniciales y cálculo de fase del ciclo
- [x] Login (una sola usuaria, registro público cerrado)
- [x] Panel "Hoy": fase del ciclo, entrenos planificados, pre entreno, ajustes del plan, agua y creatina
- [ ] Formularios de carga + recordatorios
- [ ] Historial con gráficos
- [ ] Integración con Apple Salud (Health Auto Export → webhook)
- [ ] Chat con la API de Claude
