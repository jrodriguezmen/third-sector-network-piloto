-- Pruebas de las reglas de acceso (RLS). Se ejecuta tras supabase_stub.sql y schema.sql.
\set ON_ERROR_STOP 1
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on storage.objects to authenticated;

-- Usuarios: una ONG, otra ONG, un financiador.
insert into auth.users values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222'), ('33333333-3333-3333-3333-333333333333');

create or replace function pg_temp.como(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), false); end $$;
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not cond then raise exception 'FALLO: %', msg; end if; raise notice 'ok - %', msg; end $$;

set role authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111');
insert into perfiles (id, tipo, nombre) values ('11111111-1111-1111-1111-111111111111', 'ong', 'ONG Uno');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into perfiles (id, tipo, nombre) values ('22222222-2222-2222-2222-222222222222', 'ong', 'ONG Dos');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
insert into perfiles (id, tipo, nombre) values ('33333333-3333-3333-3333-333333333333', 'financiador', 'Empresa Tres');

-- Nadie se hace admin a sí mismo
do $$ begin
  update perfiles set es_admin = true where id = '33333333-3333-3333-3333-333333333333';
  raise exception 'FALLO: se pudo hacer admin';
exception when insufficient_privilege or check_violation then raise notice 'ok - nadie se autoproclama admin';
when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - nadie se autoproclama admin (%)', sqlstate; end $$;

-- Un financiador no puede crear proyectos
do $$ begin
  insert into proyectos (ong_id, titulo, resumen) values ('33333333-3333-3333-3333-333333333333', 'Proyecto falso', 'Resumen de un proyecto falso');
  raise exception 'FALLO: financiador creó proyecto';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - financiador no crea proyectos'; end $$;

-- La ONG Uno crea un proyecto en borrador con una línea y un hito
select pg_temp.como('11111111-1111-1111-1111-111111111111');
insert into proyectos (id, ong_id, titulo, resumen) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Huertos urbanos', 'Red de huertos comunitarios en Usera');
insert into lineas (id, proyecto_id, titulo, descripcion, importe, contrapartidas) values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Formación', 'Talleres de agricultura ecológica', 5000, '{video,difusion}');
insert into hitos (linea_id, titulo, entregable, porcentaje) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Talleres realizados', 'Vídeo resumen de los talleres', 100);

-- La ONG Dos no puede añadir líneas al proyecto de otra
select pg_temp.como('22222222-2222-2222-2222-222222222222');
do $$ begin
  insert into lineas (proyecto_id, titulo, descripcion, importe) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Intrusa', 'Línea de otra ONG', 100);
  raise exception 'FALLO: otra ONG añadió línea';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - otra ONG no toca proyectos ajenos'; end $$;

-- En borrador no lo ven otros ni el público
select pg_temp.ok((select count(*) from proyectos) = 0, 'otra ONG no ve borradores');
select pg_temp.como(null);
set role anon;
select pg_temp.ok((select count(*) from proyectos) = 0, 'el público no ve borradores');

-- El financiador no puede comprometerse con una línea no publicada
set role authenticated;
select pg_temp.como('33333333-3333-3333-3333-333333333333');
do $$ begin
  insert into compromisos (linea_id, financiador_id, importe) values ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 5000);
  raise exception 'FALLO: compromiso sobre borrador';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - no hay compromisos sobre borradores'; end $$;

-- La ONG publica; ahora el público ve proyecto, línea e hito
select pg_temp.como('11111111-1111-1111-1111-111111111111');
update proyectos set estado = 'publicado' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.como(null);
set role anon;
select pg_temp.ok((select count(*) from proyectos) = 1 and (select count(*) from lineas) = 1 and (select count(*) from hitos) = 1, 'el público ve lo publicado');

-- El financiador se compromete; no puede hacerlo en nombre de otro ni ya "firmado"
set role authenticated;
select pg_temp.como('33333333-3333-3333-3333-333333333333');
insert into compromisos (id, linea_id, financiador_id, importe) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 5000);
do $$ begin
  insert into compromisos (linea_id, financiador_id, importe, estado) values ('bbbbbbbb-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 5000, 'firmado');
  raise exception 'FALLO: compromiso creado ya firmado';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - un compromiso nace como propuesto'; end $$;
do $$ begin
  update compromisos set estado = 'firmado' where id = 'cccccccc-0000-0000-0000-000000000001';
  if found then raise exception 'FALLO: el financiador cambió el estado'; end if;
  raise notice 'ok - el estado del compromiso no se cambia desde el cliente';
end $$;

-- Las partes ven el compromiso; otra ONG y el público no
select pg_temp.ok((select count(*) from compromisos) = 1, 'el financiador ve su compromiso');
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select pg_temp.ok((select count(*) from compromisos) = 1, 'la ONG ve el compromiso sobre su línea');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select pg_temp.ok((select count(*) from compromisos) = 0, 'otra ONG no ve compromisos ajenos');
select pg_temp.como(null);
set role anon;
select pg_temp.ok((select count(*) from compromisos) = 0, 'el público no ve compromisos');

-- Contratos y entregas no se pueden escribir desde el cliente
set role authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111');
do $$ begin
  insert into contratos (compromiso_id, texto, hash, comision_pct, comision_importe) values ('cccccccc-0000-0000-0000-000000000001', 'x', 'y', 0, 0);
  raise exception 'FALLO: cliente creó contrato';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - los contratos solo los crea el servidor'; end $$;

-- Almacenamiento: cada usuario sube solo a su carpeta
do $$ begin
  insert into storage.objects (bucket_id, name) values ('entregas', '22222222-2222-2222-2222-222222222222/x.mp4');
  raise exception 'FALLO: subió a carpeta ajena';
exception when others then if sqlerrm like 'FALLO%' then raise; end if; raise notice 'ok - no se sube a carpetas ajenas'; end $$;
insert into storage.objects (bucket_id, name) values ('entregas', '11111111-1111-1111-1111-111111111111/video.mp4');
select pg_temp.ok(true, 'se sube a la carpeta propia');
reset role;
