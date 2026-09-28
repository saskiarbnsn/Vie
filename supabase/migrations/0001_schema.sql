-- Vie · schema inicial
-- Une nutrición, entrenamiento y ciclo menstrual en una sola base.
--
-- Criterio general:
--   * Lo que se CARGA se guarda en tablas.
--   * Lo que se DEDUCE (fase del ciclo, reglas del plan) se calcula en la app,
--     así no queda desactualizado si cambia un dato de origen.
--   * Los datos que llegan de Apple Salud tienen `external_id` único para que
--     reenviar el mismo export no duplique registros.

-- ─────────────────────────────────────────────────────────────
-- CICLO
-- ─────────────────────────────────────────────────────────────

-- Un registro por período. El ciclo va de un inicio al siguiente,
-- así que su duración se deduce y no se guarda.
create table periodos (
  id           bigint generated always as identity primary key,
  fecha_inicio date not null unique,
  fecha_fin    date,                      -- null mientras el período está en curso
  notas        text,
  creado_en    timestamptz not null default now(),
  constraint fin_despues_de_inicio check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

-- Registro diario opcional: flujo, síntomas y ánimo.
-- Mismas categorías que P.C. para que la migración futura sea directa.
create table registro_ciclo (
  fecha     date primary key,
  flujo     text check (flujo in ('poco', 'media', 'mucho', 'inundacion')),
  sintomas  text[] not null default '{}',  -- ej: dolor_pelvico, hinchazon, fatiga
  animo     text[] not null default '{}',  -- ej: sensible, agotada, feliz
  notas     text,
  creado_en timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- ENTRENAMIENTO
-- Planificado (lo que pienso hacer) y realizado (lo que hice) van separados:
-- el plan permite avisar el pre entreno ANTES, y el Watch confirma DESPUÉS.
-- ─────────────────────────────────────────────────────────────

-- Plantilla semanal de clases con horario fijo (pole).
-- A partir de acá se generan los entrenos planificados de cada semana.
create table rutina_semanal (
  id           bigint generated always as identity primary key,
  dia_semana   smallint not null check (dia_semana between 1 and 7), -- 1 = lunes (ISO)
  hora_inicio  time not null,
  disciplina   text not null,
  duracion_min smallint not null default 60,
  activa       boolean not null default true
);

-- Lo que hice, venga del Watch (vía Apple Salud) o cargado a mano.
create table entrenos_realizados (
  id           bigint generated always as identity primary key,
  inicio       timestamptz not null,
  fin          timestamptz,
  disciplina   text,                        -- se completa al vincularlo con el planificado
  tipo_apple   text,                        -- tipo de actividad que manda Apple Salud
  kcal_activas numeric(6,1),
  fc_media     smallint,
  origen       text not null default 'manual' check (origen in ('apple_salud', 'manual')),
  external_id  text unique,
  creado_en    timestamptz not null default now()
);

-- Lo que pienso hacer. Cuando llega el realizado, se vincula acá.
create table entrenos_planificados (
  id                   bigint generated always as identity primary key,
  fecha                date not null,
  hora_inicio          time not null,
  disciplina           text not null,
  duracion_min         smallint not null default 60,
  origen               text not null default 'manual' check (origen in ('rutina', 'manual')),
  estado               text not null default 'pendiente' check (estado in ('pendiente', 'hecho', 'salteado')),
  entreno_realizado_id bigint references entrenos_realizados (id) on delete set null,
  creado_en            timestamptz not null default now(),
  unique (fecha, hora_inicio, disciplina)
);

-- ─────────────────────────────────────────────────────────────
-- NUTRICIÓN
-- ─────────────────────────────────────────────────────────────

-- Recetas propias o traídas de Cookidoo / Instagram (título + ingredientes).
create table recetas (
  id           bigint generated always as identity primary key,
  titulo       text not null,
  fuente       text not null default 'propia' check (fuente in ('cookidoo', 'instagram', 'propia')),
  url          text,
  ingredientes jsonb not null default '[]', -- [{ "nombre": "...", "cantidad": "..." }]
  notas        text,
  creado_en    timestamptz not null default now()
);

create table comidas (
  id          bigint generated always as identity primary key,
  fecha       date not null,
  hora        time,
  momento     text not null check (momento in (
                'desayuno', 'pre_entreno', 'post_entreno',
                'almuerzo', 'merienda', 'cena', 'snack')),
  descripcion text not null,
  receta_id   bigint references recetas (id) on delete set null,
  notas       text,
  creado_en   timestamptz not null default now()
);

create table habitos_diarios (
  fecha     date primary key,
  agua_ml   integer not null default 0 check (agua_ml >= 0),
  creatina  boolean not null default false
);

-- ─────────────────────────────────────────────────────────────
-- CUERPO (Femmto → Apple Salud → Vie)
-- ─────────────────────────────────────────────────────────────

create table composicion_corporal (
  id                     bigint generated always as identity primary key,
  medido_en              timestamptz not null,
  peso_kg                numeric(5,2),
  grasa_pct              numeric(4,1),
  tejido_magro_kg        numeric(5,2),
  musculo_esqueletico_kg numeric(5,2),
  metabolismo_basal_kcal smallint,
  origen                 text not null default 'apple_salud' check (origen in ('apple_salud', 'manual')),
  external_id            text unique,
  creado_en              timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- RECORDATORIOS (método principal de carga del MVP)
-- Cada recordatorio abre el formulario ya prellenado con `plantilla`.
-- ─────────────────────────────────────────────────────────────

create table recordatorios (
  id          bigint generated always as identity primary key,
  tipo        text not null check (tipo in ('comida', 'agua', 'creatina', 'ciclo', 'entreno')),
  hora        time not null,
  dias_semana smallint[] not null default '{1,2,3,4,5,6,7}',
  plantilla   jsonb not null default '{}',
  activo      boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- Índices para las consultas del dashboard e historial
-- ─────────────────────────────────────────────────────────────

create index on comidas (fecha);
create index on entrenos_planificados (fecha);
create index on entrenos_realizados (inicio);
create index on composicion_corporal (medido_en);

-- ─────────────────────────────────────────────────────────────
-- Seguridad: la app es de una sola usuaria. Solo alguien autenticado
-- puede leer o escribir; sin sesión, la API de Supabase no devuelve nada.
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'periodos', 'registro_ciclo', 'rutina_semanal', 'entrenos_realizados',
    'entrenos_planificados', 'recetas', 'comidas', 'habitos_diarios',
    'composicion_corporal', 'recordatorios'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo usuaria autenticada" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
