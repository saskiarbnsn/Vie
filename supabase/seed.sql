-- Vie · datos iniciales
-- Se corre una sola vez, después del schema.

-- Historial de períodos exportado de P.C. (Period Calendar), feb–sep 2026.
insert into periodos (fecha_inicio, fecha_fin) values
  ('2026-02-15', '2026-02-19'),
  ('2026-03-11', '2026-03-15'),
  ('2026-04-05', '2026-04-09'),
  ('2026-05-06', '2026-05-10'),
  ('2026-05-30', '2026-06-03'),
  ('2026-06-24', '2026-07-01'),  -- único período de 8 días
  ('2026-07-26', '2026-07-30'),
  ('2026-08-20', '2026-08-24'),
  ('2026-09-13', '2026-09-17');

-- Clases de horario fijo. El gym no va acá porque su horario cambia:
-- se carga como entreno planificado manual cuando se sabe la hora.
insert into rutina_semanal (dia_semana, hora_inicio, disciplina) values
  (1, '17:00', 'Pole Acrobático'),
  (1, '18:00', 'Pole Exotic'),
  (2, '17:00', 'Pole Giratorio'),
  (3, '12:00', 'Pole Sport'),
  (3, '18:00', 'Pole Exotic'),
  (4, '16:00', 'Stretching'),
  (5, '18:00', 'Pole Sport'),
  (5, '19:00', 'Pole Sport');

-- Recordatorios base. Los horarios son un punto de partida para ajustar con el uso.
insert into recordatorios (tipo, hora, dias_semana, plantilla) values
  ('creatina', '13:30', '{1,2,3,4,5,6,7}', '{"creatina": true}'),
  ('comida',   '13:45', '{1,2,3,4,5,6,7}', '{"momento": "almuerzo"}'),
  ('comida',   '21:45', '{1,2,3,4,5,6,7}', '{"momento": "cena"}'),
  ('agua',     '22:00', '{1,2,3,4,5,6,7}', '{}'),
  ('ciclo',    '22:15', '{1,2,3,4,5,6,7}', '{}');
