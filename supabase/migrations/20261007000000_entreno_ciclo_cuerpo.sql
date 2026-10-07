-- Vie · entreno con exigencia, registro de gym y métricas completas de Femmto
--
-- Se corre una sola vez en el SQL Editor de Supabase, después del schema inicial.
-- No borra datos: solo agrega tablas y columnas.

-- ─────────────────────────────────────────────────────────────
-- DISCIPLINAS
-- Cada deporte tiene una exigencia habitual (la base). Después se puede
-- ajustar por semana (descarga de gym), por período o por turno puntual.
-- ─────────────────────────────────────────────────────────────

create table disciplinas (
  nombre         text primary key,
  categoria      text not null default 'pole' check (categoria in ('pole', 'gym', 'stretching', 'otro')),
  exigencia_base text not null default 'media' check (exigencia_base in ('alta', 'media', 'baja')),
  orden          smallint not null default 0
);

insert into disciplinas (nombre, categoria, exigencia_base, orden) values
  ('Pole Sport',      'pole',       'alta',  1),
  ('Pole Acrobático', 'pole',       'alta',  2),
  ('Pole Exotic',     'pole',       'media', 3),
  ('Pole Giratorio',  'pole',       'media', 4),
  ('Gym',             'gym',        'alta',  5),
  ('Stretching',      'stretching', 'baja',  6);

-- Exigencia puntual: null = usar la del deporte.
alter table rutina_semanal        add column exigencia text check (exigencia in ('alta', 'media', 'baja'));
alter table entrenos_planificados add column exigencia text check (exigencia in ('alta', 'media', 'baja'));

-- Semanas especiales. semana_inicio es siempre el lunes.
create table ajustes_semana (
  semana_inicio date primary key,
  descarga_gym  boolean not null default false
);

-- Preferencias de la usuaria (una sola fila).
create table preferencias (
  id                  smallint primary key default 1 check (id = 1),
  ajustar_en_periodo  boolean not null default true
);
insert into preferencias (id) values (1);

-- Cómo se siente para entrenar ese día. Baja la exigencia de los turnos del día.
create table energia_diaria (
  fecha date primary key,
  nivel text not null check (nivel in ('bien', 'poca', 'muy_baja'))
);

-- Días cuya rutina ya se copió a entrenos_planificados.
-- Evita que un turno movido "solo esta semana" vuelva a aparecer en su horario original.
create table dias_planificados (
  fecha date primary key
);
-- Los días que ya tienen entrenos de rutina cuentan como planificados.
insert into dias_planificados (fecha)
  select distinct fecha from entrenos_planificados where origen = 'rutina'
  on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- REGISTRO DE GYM
-- ─────────────────────────────────────────────────────────────

create table sesiones_gym (
  id         bigint generated always as identity primary key,
  fecha      date not null unique,           -- una sesión por día
  terminada  boolean not null default false,
  notas      text,
  creado_en  timestamptz not null default now()
);

create table series_gym (
  id         bigint generated always as identity primary key,
  sesion_id  bigint not null references sesiones_gym (id) on delete cascade,
  ejercicio  text not null,
  orden      smallint not null,               -- orden del ejercicio en la sesión
  numero     smallint not null,               -- número de serie dentro del ejercicio
  kg         numeric(5,1) not null default 0,
  reps       smallint not null default 0,
  hecha      boolean not null default false
);
create index on series_gym (sesion_id);
create index on series_gym (ejercicio);

-- ─────────────────────────────────────────────────────────────
-- CUERPO: todas las métricas que muestra Femmto
-- ─────────────────────────────────────────────────────────────

alter table composicion_corporal
  add column imc                     numeric(4,1),
  add column tejido_magro_pct        numeric(4,1),
  add column musculo_esqueletico_pct numeric(4,1),
  add column grasa_visceral          smallint,
  add column tejido_oseo_pct         numeric(4,1),
  add column hidratacion_pct         numeric(4,1),
  add column proteina_pct            numeric(4,1),
  add column edad_corporal           smallint;

-- Medición de Femmto del 25 de septiembre de 2026 (capturas de la app).
insert into composicion_corporal (
  medido_en, peso_kg, grasa_pct, imc, tejido_magro_pct, musculo_esqueletico_pct,
  grasa_visceral, tejido_oseo_pct, hidratacion_pct, proteina_pct, edad_corporal,
  metabolismo_basal_kcal, origen
) values (
  '2026-09-25 08:00-03', 66.55, 26.6, 24.4, 69.0, 42.8,
  7, 4.4, 50.4, 17.3, 26,
  1425, 'manual'
);

-- Recordatorio de pesaje consciente (al despertar y en ayunas).
alter table recordatorios drop constraint recordatorios_tipo_check;
alter table recordatorios add constraint recordatorios_tipo_check
  check (tipo in ('comida', 'agua', 'creatina', 'ciclo', 'entreno', 'pesaje'));
insert into recordatorios (tipo, hora, dias_semana, plantilla, activo)
  values ('pesaje', '08:00', '{1,2,3,4,5,6,7}', '{}', true);

-- ─────────────────────────────────────────────────────────────
-- Seguridad: mismas reglas que el resto de las tablas.
-- ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'disciplinas', 'ajustes_semana', 'preferencias', 'energia_diaria',
    'dias_planificados', 'sesiones_gym', 'series_gym'
  ] loop
    execute format('grant select, insert, update, delete on %I to authenticated', t);
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo usuaria autenticada" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
