// Acceso a datos del portal desde el servidor, con la clave de servicio de Supabase.
// Toda la lógica de negocio usa esta interfaz, así se puede sustituir por una falsa en los tests.
import { createClient } from '@supabase/supabase-js';

let override = null;
export function setStore(fake) { override = fake; }

let admin = null;
function client() {
  if (admin) return admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const real = {
  async userFromToken(token) {
    if (!token) return null;
    const { data, error } = await client().auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email };
  },
  async perfil(id) {
    return must(await client().from('perfiles').select('*').eq('id', id).maybeSingle());
  },
  // Compromiso con su línea, proyecto, hitos y las dos partes.
  async compromisoCompleto(id) {
    const c = must(await client().from('compromisos').select('*').eq('id', id).maybeSingle());
    if (!c) return null;
    const linea = must(await client().from('lineas').select('*').eq('id', c.linea_id).single());
    const proyecto = must(await client().from('proyectos').select('*').eq('id', linea.proyecto_id).single());
    const hitos = must(await client().from('hitos').select('*').eq('linea_id', linea.id).order('orden'));
    const ong = must(await client().from('perfiles').select('*').eq('id', proyecto.ong_id).single());
    const financiador = must(await client().from('perfiles').select('*').eq('id', c.financiador_id).single());
    const contrato = must(await client().from('contratos').select('*').eq('compromiso_id', id).maybeSingle());
    return { compromiso: c, linea, proyecto, hitos, ong, financiador, contrato };
  },
  async update(table, id, patch) {
    return must(await client().from(table).update(patch).eq('id', id).select().single());
  },
  async insert(table, row) {
    return must(await client().from(table).insert(row).select().single());
  },
  async entrega(id) {
    return must(await client().from('entregas').select('*').eq('id', id).maybeSingle());
  },
  async entregasDeCompromiso(compromisoId) {
    return must(await client().from('entregas').select('*').eq('compromiso_id', compromisoId));
  },
  async anclajesPorHash(hash) {
    return must(await client().from('anclajes').select('hash,tipo,referencia,red,estado,prueba,creado').eq('hash', hash).order('creado'));
  },
  async descargar(path) {
    const { data, error } = await client().storage.from('entregas').download(path);
    if (error) throw new Error(`No se pudo leer el archivo: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  },
  async enlaceTemporal(path, segundos = 600) {
    const { data, error } = await client().storage.from('entregas').createSignedUrl(path, segundos);
    if (error) throw new Error(`No se pudo generar el enlace: ${error.message}`);
    return data.signedUrl;
  },
};

export const store = new Proxy({}, { get: (_, prop) => (override || real)[prop] });
