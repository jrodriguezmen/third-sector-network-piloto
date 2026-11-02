import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';
import firmarHandler from '../api/portal/firmar.js';
import { anchorHash, sha256Hex } from '../lib/portal/anchor.js';
import { breakdown, buildContract, validateMilestones } from '../lib/portal/contract.js';
import { archivo, entregar, firmar, responder, validar, verificar } from '../lib/portal/service.js';
import { setStore } from '../lib/portal/store.js';
import { fakeRes } from './helpers.js';

const ONG = '11111111-1111-1111-1111-111111111111';
const FIN = '33333333-3333-3333-3333-333333333333';
const OTRO = '22222222-2222-2222-2222-222222222222';
const realFetch = globalThis.fetch;

// Base de datos en memoria con la misma interfaz que lib/portal/store.js.
function memoryStore() {
  const t = { perfiles: [], proyectos: [], lineas: [], hitos: [], compromisos: [], contratos: [], entregas: [], anclajes: [], eventos: [] };
  const byId = (table, id) => t[table].find((r) => r.id === id);
  const files = { [`${ONG}/video.mp4`]: Buffer.from('contenido del vídeo') };
  const s = {
    t,
    async userFromToken(token) { return { 'tok-ong': { id: ONG }, 'tok-fin': { id: FIN }, 'tok-otro': { id: OTRO } }[token] || null; },
    async perfil(id) { return byId('perfiles', id) || null; },
    async compromisoCompleto(id) {
      const compromiso = byId('compromisos', id);
      if (!compromiso) return null;
      const linea = byId('lineas', compromiso.linea_id);
      const proyecto = byId('proyectos', linea.proyecto_id);
      return {
        compromiso: { ...compromiso }, linea: { ...linea }, proyecto: { ...proyecto },
        hitos: t.hitos.filter((h) => h.linea_id === linea.id).map((h) => ({ ...h })).sort((a, b) => a.orden - b.orden),
        ong: byId('perfiles', proyecto.ong_id), financiador: byId('perfiles', compromiso.financiador_id),
        contrato: t.contratos.find((c) => c.compromiso_id === id) ? { ...t.contratos.find((c) => c.compromiso_id === id) } : null,
      };
    },
    async update(table, id, patch) { const r = byId(table, id); Object.assign(r, patch); return { ...r }; },
    async insert(table, row) { const r = { id: randomUUID(), creado: new Date().toISOString(), ...row }; t[table].push(r); return { ...r }; },
    async entrega(id) { return byId('entregas', id) ? { ...byId('entregas', id) } : null; },
    async entregasDeCompromiso(cid) { return t.entregas.filter((e) => e.compromiso_id === cid); },
    async anclajesPorHash(hash) { return t.anclajes.filter((a) => a.hash === hash); },
    async descargar(path) { if (!files[path]) throw new Error('no existe'); return files[path]; },
    async enlaceTemporal(path) { return `https://firmado.test/${path}`; },
  };
  t.perfiles.push({ id: ONG, tipo: 'ong', nombre: 'Asociación Huertos', cif: 'G12345678' }, { id: FIN, tipo: 'financiador', nombre: 'Empresa Verde SA', cif: 'A87654321' }, { id: OTRO, tipo: 'ong', nombre: 'Otra ONG' });
  t.proyectos.push({ id: 'p1', ong_id: ONG, titulo: 'Huertos urbanos', resumen: 'Red de huertos', ubicacion: 'Usera, Madrid', estado: 'publicado' });
  t.lineas.push({ id: 'l1', proyecto_id: 'p1', titulo: 'Formación en agricultura', descripcion: 'Talleres', importe: 5000, contrapartidas: ['Vídeo de 2 minutos', 'Logo en materiales'], estado: 'abierta' });
  t.hitos.push(
    { id: 'h1', linea_id: 'l1', orden: 1, titulo: 'Talleres', entregable: 'Vídeo de los talleres', porcentaje: 60, estado: 'pendiente' },
    { id: 'h2', linea_id: 'l1', orden: 2, titulo: 'Informe final', entregable: 'Informe y fotos', porcentaje: 40, estado: 'pendiente' },
  );
  t.compromisos.push({ id: 'c0000000-0000-0000-0000-000000000001', linea_id: 'l1', financiador_id: FIN, importe: 5000, estado: 'propuesto' });
  return s;
}

const CID = 'c0000000-0000-0000-0000-000000000001';
let db;
let anchored;
beforeEach(() => {
  db = memoryStore();
  setStore(db);
  anchored = [];
  globalThis.fetch = async (url, init) => {
    anchored.push({ url, digest: Buffer.from(init.body).toString('hex') });
    return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('prueba-ots') };
  };
});
afterEach(() => { setStore(null); globalThis.fetch = realFetch; });

test('validateMilestones y breakdown: porcentajes, tramos y comisión', () => {
  assert.match(validateMilestones([{ porcentaje: 50 }, { porcentaje: 30 }]), /suman 80/);
  assert.equal(validateMilestones([{ porcentaje: 33.33 }, { porcentaje: 33.33 }, { porcentaje: 33.34 }]), null);
  const b = breakdown(1000, [{ id: 'a', orden: 1, porcentaje: 33.33 }, { id: 'b', orden: 2, porcentaje: 33.33 }, { id: 'c', orden: 3, porcentaje: 33.34 }], 7);
  assert.equal(b.comision, 70);
  assert.equal(b.tramos.reduce((s, x) => s + x.importe, 0), 1000, 'los tramos suman el total exacto');
});

test('anchorHash envía solo la huella y devuelve la prueba; si falla no lanza', async () => {
  const h = sha256Hex('hola');
  const r = await anchorHash(h);
  assert.equal(r.estado, 'pendiente');
  assert.equal(anchored[0].digest, h);
  assert.match(anchored[0].url, /opentimestamps\.org\/digest$/);
  globalThis.fetch = async () => { throw new Error('sin red'); };
  assert.equal((await anchorHash(h)).estado, 'error');
  assert.equal((await anchorHash('xyz')).estado, 'error');
});

test('flujo completo: aceptar → firmar → entregar → validar cierra la línea', async () => {
  // Solo la ONG de la línea puede responder
  await assert.rejects(responder({ id: OTRO }, { compromiso_id: CID, accion: 'aceptar' }), /Solo la ONG/);
  const r = await responder({ id: ONG }, { compromiso_id: CID, accion: 'aceptar' });
  assert.equal(r.estado, 'aceptado');
  assert.equal(r.desglose.comision, 350);
  const contrato = db.t.contratos[0];
  assert.match(contrato.texto, /Asociación Huertos, con CIF G12345678/);
  assert.match(contrato.texto, /Vídeo de 2 minutos/);
  assert.match(contrato.texto, /60 % \(3000,00 €\)/);
  assert.equal(contrato.hash, sha256Hex(contrato.texto), 'la huella corresponde al texto');
  assert.equal(db.t.lineas[0].estado, 'comprometida');
  assert.equal(db.t.anclajes[0].tipo, 'contrato');
  await assert.rejects(responder({ id: ONG }, { compromiso_id: CID, accion: 'aceptar' }), /ya fue respondido/);

  // No se puede entregar antes de firmar
  await assert.rejects(entregar({ id: ONG }, { compromiso_id: CID, hito_id: 'h1', descripcion: 'Vídeo', archivo: `${ONG}/video.mp4` }), /firmado por ambas/);

  // Firmas
  await assert.rejects(firmar({ id: OTRO }, { compromiso_id: CID }), /No eres parte/);
  assert.equal((await firmar({ id: ONG }, { compromiso_id: CID })).estado, 'pendiente_otra_firma');
  await assert.rejects(firmar({ id: ONG }, { compromiso_id: CID }), /Ya habías firmado/);
  const f = await firmar({ id: FIN }, { compromiso_id: CID });
  assert.equal(f.estado, 'firmado');
  assert.equal(db.t.lineas[0].estado, 'en_ejecucion');
  assert.ok(db.t.anclajes.some((a) => a.tipo === 'contrato_firmado' && a.hash === f.hash_firmado));

  // Entrega del hito 1 con archivo: la huella es la del contenido
  await assert.rejects(entregar({ id: ONG }, { compromiso_id: CID, hito_id: 'h1', descripcion: 'Vídeo', archivo: `${OTRO}/robado.mp4` }), /Archivo no válido/);
  const e1 = await entregar({ id: ONG }, { compromiso_id: CID, hito_id: 'h1', descripcion: 'Vídeo de los talleres', archivo: `${ONG}/video.mp4` });
  assert.equal(e1.hash, createHash('sha256').update('contenido del vídeo').digest('hex'));
  assert.equal(db.t.hitos[0].estado, 'entregado');
  assert.equal((await archivo({ id: FIN }, { entrega_id: e1.entrega_id })).url, `https://firmado.test/${ONG}/video.mp4`);
  await assert.rejects(archivo({ id: OTRO }, { entrega_id: e1.entrega_id }), /No eres parte/);

  // Solo el financiador valida; rechazar exige motivo
  await assert.rejects(validar({ id: ONG }, { entrega_id: e1.entrega_id, decision: 'validar' }), /Solo el financiador/);
  await assert.rejects(validar({ id: FIN }, { entrega_id: e1.entrega_id, decision: 'rechazar', comentario: '' }), /motivo/);
  const v1 = await validar({ id: FIN }, { entrega_id: e1.entrega_id, decision: 'validar' });
  assert.equal(v1.estado, 'validada');
  assert.equal(v1.importe_liberable, 3000);
  assert.equal(v1.comision_3sn, 210);

  // Hito 2 con enlace, rechazado y vuelto a entregar
  const e2 = await entregar({ id: ONG }, { compromiso_id: CID, hito_id: 'h2', descripcion: 'Informe final', enlace: 'https://drive.example/informe.pdf' });
  await validar({ id: FIN }, { entrega_id: e2.entrega_id, decision: 'rechazar', comentario: 'Faltan las fotos' });
  assert.equal(db.t.hitos[1].estado, 'rechazado');
  const e3 = await entregar({ id: ONG }, { compromiso_id: CID, hito_id: 'h2', descripcion: 'Informe final con fotos', enlace: 'https://drive.example/informe-v2.pdf' });
  const v3 = await validar({ id: FIN }, { entrega_id: e3.entrega_id, decision: 'validar' });
  assert.equal(v3.estado, 'linea_completada');
  assert.equal(db.t.lineas[0].estado, 'cerrada');
  assert.equal(db.t.compromisos[0].estado, 'completado');

  // Verificación pública de la huella del contrato
  const ver = await verificar(contrato.hash);
  assert.equal(ver.registros[0].tipo, 'contrato');
  await assert.rejects(verificar('no-es-hash'), /64 caracteres/);
});

test('aceptar falla si los hitos no suman 100 %', async () => {
  db.t.hitos[1].porcentaje = 30;
  await assert.rejects(responder({ id: ONG }, { compromiso_id: CID, accion: 'aceptar' }), /suman 90/);
  assert.equal(db.t.contratos.length, 0);
});

test('handler HTTP: exige POST y sesión', async () => {
  const get = fakeRes();
  await firmarHandler({ method: 'GET', headers: {} }, get);
  assert.equal(get.statusCode, 405);
  const anon = fakeRes();
  await firmarHandler({ method: 'POST', headers: {}, body: { compromiso_id: CID } }, anon);
  assert.equal(anon.statusCode, 401);
  const bad = fakeRes();
  await firmarHandler({ method: 'POST', headers: { authorization: 'Bearer tok-otro' }, body: { compromiso_id: CID } }, bad);
  assert.equal(bad.statusCode, 409, 'sin convenio todavía');
  await responder({ id: ONG }, { compromiso_id: CID, accion: 'aceptar' });
  const ok = fakeRes();
  await firmarHandler({ method: 'POST', headers: { authorization: 'Bearer tok-fin' }, body: { compromiso_id: CID } }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.payload.estado, 'pendiente_otra_firma');
});

test('buildContract incluye partes, tramos, comisión y cláusula de registro en blockchain', () => {
  const d = {
    compromiso: { id: 'x', importe: 1000 }, linea: { titulo: 'L', descripcion: 'D', contrapartidas: [] },
    proyecto: { titulo: 'P' }, hitos: [{ id: 'a', orden: 1, titulo: 'Único', entregable: 'Vídeo', porcentaje: 100 }],
    ong: { nombre: 'ONG' }, financiador: { nombre: 'Fin' },
  };
  const c = buildContract({ ...d, fecha: new Date('2026-11-02') });
  assert.match(c.texto, /Fecha de emisión: 2026-11-02/);
  assert.match(c.texto, /OpenTimestamps/);
  assert.match(c.texto, /Ley 49\/2002/);
  assert.equal(c.hash.length, 64);
});
