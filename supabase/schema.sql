-- =====================================================================
-- 3SN · Portal de proyectos y financiación — esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- =====================================================================

-- ---------- Perfiles (uno por usuario de Supabase Auth) ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('ong', 'financiador')),
  nombre text not null check (char_length(nombre) between 2 and 150),
  cif text check (char_length(cif) <= 20),
  web text check (char_length(web) <= 200),
  descripcion text check (char_length(descripcion) <= 2000),
  es_admin boolean not null default false,
  creado timestamptz not null default now()
);

-- ---------- Proyectos (de una ONG) ----------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  ong_id uuid not null references public.perfiles (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 200),
  resumen text not null check (char_length(resumen) between 10 and 3000),
  ubicacion text check (char_length(ubicacion) <= 200),
  ods int[] not null default '{}',
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado', 'archivado')),
  creado timestamptz not null default now()
);

-- ---------- Líneas financiables de un proyecto ----------
create table if not exists public.lineas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 200),
  descripcion text not null check (char_length(descripcion) between 10 and 3000),
  importe numeric(12, 2) not null check (importe > 0),
  -- Contrapartidas para el financiador: vídeos, material, difusión, voluntariado…
  contrapartidas text[] not null default '{}',
  estado text not null default 'abierta' check (estado in ('abierta', 'comprometida', 'en_ejecucion', 'cerrada')),
  creado timestamptz not null default now()
);

-- ---------- Hitos de una línea (lo que libera cada tramo de financiación) ----------
create table if not exists public.hitos (
  id uuid primary key default gen_random_uuid(),
  linea_id uuid not null references public.lineas (id) on delete cascade,
  orden int not null default 1,
  titulo text not null check (char_length(titulo) between 3 and 200),
  entregable text not null check (char_length(entregable) between 3 and 500),
  porcentaje numeric(5, 2) not null check (porcentaje > 0 and porcentaje <= 100),
  fecha_prevista date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'entregado', 'validado', 'rechazado')),
  creado timestamptz not null default now()
);

-- ---------- Compromisos de financiación (financiador → línea) ----------
create table if not exists public.compromisos (
  id uuid primary key default gen_random_uuid(),
  linea_id uuid not null references public.lineas (id) on delete cascade,
  financiador_id uuid not null references public.perfiles (id) on delete cascade,
  importe numeric(12, 2) not null check (importe > 0),
  mensaje text check (char_length(mensaje) <= 2000),
  estado text not null default 'propuesto' check (estado in ('propuesto', 'aceptado', 'rechazado', 'firmado', 'completado', 'cancelado')),
  creado timestamptz not null default now()
);

-- ---------- Contratos (texto congelado + huella + sello en blockchain) ----------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  compromiso_id uuid not null unique references public.compromisos (id) on delete cascade,
  texto text not null,
  hash text not null,
  comision_pct numeric(5, 2) not null,
  comision_importe numeric(12, 2) not null,
  firma_ong timestamptz,
  firma_financiador timestamptz,
  hash_firmado text,
  creado timestamptz not null default now()
);

-- ---------- Entregas de un hito (archivo o enlace + huella) ----------
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  hito_id uuid not null references public.hitos (id) on delete cascade,
  compromiso_id uuid not null references public.compromisos (id) on delete cascade,
  descripcion text not null check (char_length(descripcion) between 3 and 2000),
  enlace text check (char_length(enlace) <= 500),
  archivo text check (char_length(archivo) <= 500),
  hash text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'validada', 'rechazada')),
  comentario text check (char_length(comentario) <= 2000),
  creado timestamptz not null default now()
);

-- ---------- Anclajes en blockchain (registro notarial) ----------
create table if not exists public.anclajes (
  id uuid primary key default gen_random_uuid(),
  hash text not null,
  tipo text not null check (tipo in ('contrato', 'contrato_firmado', 'entrega', 'validacion')),
  referencia uuid,
  red text not null default 'bitcoin-opentimestamps',
  prueba text,           -- prueba .ots en base64 (pendiente hasta que se confirma en Bitcoin)
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'error')),
  error text,
  creado timestamptz not null default now()
);
create index if not exists anclajes_hash_idx on public.anclajes (hash);

-- ---------- Historial de eventos (auditoría) ----------
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb,
  creado timestamptz not null default now()
);

-- =====================================================================
-- Seguridad a nivel de fila (RLS)
-- Lectura pública solo de lo publicado; escritura solo del propio dueño.
-- Los cambios de estado sensibles (contratos, firmas, validaciones)
-- solo los hace el servidor (api/portal/*) con la clave de servicio.
-- =====================================================================
alter table public.perfiles enable row level security;
alter table public.proyectos enable row level security;
alter table public.lineas enable row level security;
alter table public.hitos enable row level security;
alter table public.compromisos enable row level security;
alter table public.contratos enable row level security;
alter table public.entregas enable row level security;
alter table public.anclajes enable row level security;
alter table public.eventos enable row level security;

-- Funciones de ayuda
create or replace function public.es_dueno_proyecto(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from proyectos where id = p and ong_id = auth.uid());
$$;
create or replace function public.es_dueno_linea(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lineas li join proyectos pr on pr.id = li.proyecto_id where li.id = l and pr.ong_id = auth.uid());
$$;
create or replace function public.linea_publicada(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lineas li join proyectos pr on pr.id = li.proyecto_id where li.id = l and pr.estado = 'publicado');
$$;
create or replace function public.parte_compromiso(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from compromisos co
    join lineas li on li.id = co.linea_id
    join proyectos pr on pr.id = li.proyecto_id
    where co.id = c and (co.financiador_id = auth.uid() or pr.ong_id = auth.uid())
  );
$$;

-- Perfiles: cualquiera ve nombre/tipo/web (para mostrar quién publica o financia); cada uno edita el suyo.
drop policy if exists perfiles_leer on public.perfiles;
create policy perfiles_leer on public.perfiles for select using (true);
drop policy if exists perfiles_crear on public.perfiles;
create policy perfiles_crear on public.perfiles for insert with check (id = auth.uid() and es_admin = false);
drop policy if exists perfiles_editar on public.perfiles;
create policy perfiles_editar on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid() and es_admin = false);

-- Proyectos
drop policy if exists proyectos_leer on public.proyectos;
create policy proyectos_leer on public.proyectos for select using (estado = 'publicado' or ong_id = auth.uid());
drop policy if exists proyectos_crear on public.proyectos;
create policy proyectos_crear on public.proyectos for insert with check (
  ong_id = auth.uid() and exists (select 1 from perfiles where id = auth.uid() and tipo = 'ong')
);
drop policy if exists proyectos_editar on public.proyectos;
create policy proyectos_editar on public.proyectos for update using (ong_id = auth.uid()) with check (ong_id = auth.uid());
drop policy if exists proyectos_borrar on public.proyectos;
create policy proyectos_borrar on public.proyectos for delete using (ong_id = auth.uid() and estado = 'borrador');

-- Líneas
drop policy if exists lineas_leer on public.lineas;
create policy lineas_leer on public.lineas for select using (public.linea_publicada(id) or public.es_dueno_proyecto(proyecto_id));
drop policy if exists lineas_crear on public.lineas;
create policy lineas_crear on public.lineas for insert with check (public.es_dueno_proyecto(proyecto_id) and estado = 'abierta');
drop policy if exists lineas_editar on public.lineas;
create policy lineas_editar on public.lineas for update using (public.es_dueno_proyecto(proyecto_id) and estado = 'abierta') with check (estado = 'abierta');
drop policy if exists lineas_borrar on public.lineas;
create policy lineas_borrar on public.lineas for delete using (public.es_dueno_proyecto(proyecto_id) and estado = 'abierta');

-- Hitos
drop policy if exists hitos_leer on public.hitos;
create policy hitos_leer on public.hitos for select using (public.linea_publicada(linea_id) or public.es_dueno_linea(linea_id));
drop policy if exists hitos_crear on public.hitos;
create policy hitos_crear on public.hitos for insert with check (public.es_dueno_linea(linea_id) and estado = 'pendiente');
drop policy if exists hitos_editar on public.hitos;
create policy hitos_editar on public.hitos for update using (public.es_dueno_linea(linea_id) and estado = 'pendiente') with check (estado = 'pendiente');
drop policy if exists hitos_borrar on public.hitos;
create policy hitos_borrar on public.hitos for delete using (public.es_dueno_linea(linea_id) and estado = 'pendiente');

-- Compromisos: los ven las dos partes; los crea un financiador sobre una línea publicada y abierta.
drop policy if exists compromisos_leer on public.compromisos;
create policy compromisos_leer on public.compromisos for select using (public.parte_compromiso(id));
drop policy if exists compromisos_crear on public.compromisos;
create policy compromisos_crear on public.compromisos for insert with check (
  financiador_id = auth.uid()
  and estado = 'propuesto'
  and exists (select 1 from perfiles where id = auth.uid() and tipo = 'financiador')
  and public.linea_publicada(linea_id)
);
-- (aceptar, rechazar, firmar y completar se hacen desde el servidor)

-- Contratos, entregas y eventos: solo lectura para las partes; escritura solo del servidor.
drop policy if exists contratos_leer on public.contratos;
create policy contratos_leer on public.contratos for select using (public.parte_compromiso(compromiso_id));
drop policy if exists entregas_leer on public.entregas;
create policy entregas_leer on public.entregas for select using (public.parte_compromiso(compromiso_id));

-- Anclajes: públicos (cualquiera puede verificar una huella).
drop policy if exists anclajes_leer on public.anclajes;
create policy anclajes_leer on public.anclajes for select using (true);

-- =====================================================================
-- Almacenamiento de entregas (vídeos, documentos…): bucket privado.
-- La ONG sube a la carpeta <su id>/…; el servidor las lee para calcular la huella.
-- =====================================================================
insert into storage.buckets (id, name, public) values ('entregas', 'entregas', false)
on conflict (id) do nothing;

drop policy if exists entregas_subir on storage.objects;
create policy entregas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists entregas_ver_propias on storage.objects;
create policy entregas_ver_propias on storage.objects for select to authenticated
  using (bucket_id = 'entregas' and (storage.foldername(name))[1] = auth.uid()::text);
