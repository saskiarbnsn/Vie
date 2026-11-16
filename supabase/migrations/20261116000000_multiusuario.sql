-- Vie · multiusuario
-- Pasa la base de "una sola usuaria" a "cada cuenta ve solo lo suyo".
--
-- ⚠️ Correr DESPUÉS de 20261007000000_entreno_ciclo_cuerpo.sql.
--    (Las tablas de esa migración que todavía no existan se saltean sin error,
--    pero el orden correcto es schema → entreno_ciclo_cuerpo → multiusuario.)
--
-- Qué hace:
--   1. Agrega user_id a todas las tablas y asigna lo ya cargado a la primera
--      cuenta creada (la de Saskia).
--   2. Reemplaza la política "solo usuaria autenticada" (using true, válida
--      cuando había una sola cuenta) por "cada cuenta ve lo suyo"
--      (user_id = auth.uid()), tanto para leer como para escribir.
--   3. Ajusta las claves primarias y unique que eran globales (una fila por
--      fecha, un nombre de disciplina) para que sean por cuenta.
--   4. Crea un trigger que inicializa preferencias y disciplinas para cada
--      cuenta nueva que se registre.
--
-- La app no cambia sus queries: el default auth.uid() completa user_id en
-- cada insert y RLS filtra cada select por la sesión.

-- ─────────────────────────────────────────────────────────────
-- 1 y 2 · user_id + RLS por cuenta en todas las tablas
-- ─────────────────────────────────────────────────────────────

do $$
declare
  uid uuid;
  t   text;
begin
  -- La primera cuenta se queda con todos los datos cargados hasta hoy.
  select id into uid from auth.users order by created_at limit 1;

  foreach t in array array[
    'periodos', 'registro_ciclo', 'rutina_semanal', 'entrenos_realizados',
    'entrenos_planificados', 'recetas', 'comidas', 'habitos_diarios',
    'composicion_corporal', 'recordatorios',
    'disciplinas', 'ajustes_semana', 'preferencias', 'energia_diaria',
    'dias_planificados', 'sesiones_gym', 'series_gym'
  ] loop
    if to_regclass('public.' || t) is null then
      continue; -- tabla de una migración que todavía no corrió
    end if;

    execute format(
      'alter table %I add column if not exists user_id uuid references auth.users (id) on delete cascade', t);

    if uid is not null then
      execute format('update %I set user_id = %L where user_id is null', t, uid);
    end if;

    -- Si quedara una fila sin dueña (no debería), esto falla a propósito.
    execute format('alter table %I alter column user_id set default auth.uid()', t);
    execute format('alter table %I alter column user_id set not null', t);

    execute format('drop policy if exists "solo usuaria autenticada" on %I', t);
    execute format('drop policy if exists "cada cuenta ve lo suyo" on %I', t);
    execute format(
      'create policy "cada cuenta ve lo suyo" on %I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);

    execute format('create index if not exists %I on %I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3 · Claves que eran globales pasan a ser por cuenta
-- ─────────────────────────────────────────────────────────────

-- Tablas del schema inicial (siempre existen).
alter table periodos
  drop constraint if exists periodos_fecha_inicio_key,
  add constraint periodos_user_fecha_inicio_key unique (user_id, fecha_inicio);

alter table registro_ciclo
  drop constraint if exists registro_ciclo_pkey,
  add primary key (user_id, fecha);

alter table habitos_diarios
  drop constraint if exists habitos_diarios_pkey,
  add primary key (user_id, fecha);

alter table entrenos_planificados
  drop constraint if exists entrenos_planificados_fecha_hora_inicio_disciplina_key,
  add constraint entrenos_planificados_user_fecha_hora_disciplina_key
    unique (user_id, fecha, hora_inicio, disciplina);

alter table entrenos_realizados
  drop constraint if exists entrenos_realizados_external_id_key,
  add constraint entrenos_realizados_user_external_id_key unique (user_id, external_id);

alter table composicion_corporal
  drop constraint if exists composicion_corporal_external_id_key,
  add constraint composicion_corporal_user_external_id_key unique (user_id, external_id);

-- Tablas de la migración de entreno/ciclo/cuerpo (con guarda por si falta alguna).
do $$
begin
  if to_regclass('public.sesiones_gym') is not null then
    alter table sesiones_gym
      drop constraint if exists sesiones_gym_fecha_key,
      add constraint sesiones_gym_user_fecha_key unique (user_id, fecha);
  end if;

  if to_regclass('public.ajustes_semana') is not null then
    alter table ajustes_semana
      drop constraint if exists ajustes_semana_pkey,
      add primary key (user_id, semana_inicio);
  end if;

  if to_regclass('public.energia_diaria') is not null then
    alter table energia_diaria
      drop constraint if exists energia_diaria_pkey,
      add primary key (user_id, fecha);
  end if;

  if to_regclass('public.dias_planificados') is not null then
    alter table dias_planificados
      drop constraint if exists dias_planificados_pkey,
      add primary key (user_id, fecha);
  end if;

  -- preferencias deja de ser "una sola fila" (id = 1) y pasa a una fila por cuenta.
  if to_regclass('public.preferencias') is not null then
    alter table preferencias drop constraint if exists preferencias_pkey;
    alter table preferencias drop constraint if exists preferencias_id_check;
    alter table preferencias drop column if exists id;
    alter table preferencias add primary key (user_id);
  end if;

  -- disciplinas deja de ser un catálogo global: cada cuenta tiene las suyas.
  if to_regclass('public.disciplinas') is not null then
    alter table disciplinas
      drop constraint if exists disciplinas_pkey,
      add primary key (user_id, nombre);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4 · Cada cuenta nueva arranca con sus preferencias y disciplinas
-- ─────────────────────────────────────────────────────────────

create or replace function public.inicializar_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.preferencias') is not null then
    insert into preferencias (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  if to_regclass('public.disciplinas') is not null then
    insert into disciplinas (user_id, nombre, categoria, exigencia_base, orden) values
      (new.id, 'Pole Sport',      'pole',       'alta',  1),
      (new.id, 'Pole Acrobático', 'pole',       'alta',  2),
      (new.id, 'Pole Exotic',     'pole',       'media', 3),
      (new.id, 'Pole Giratorio',  'pole',       'media', 4),
      (new.id, 'Gym',             'gym',        'alta',  5),
      (new.id, 'Stretching',      'stretching', 'baja',  6)
    on conflict (user_id, nombre) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.inicializar_usuario() from public, anon, authenticated;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.inicializar_usuario();
