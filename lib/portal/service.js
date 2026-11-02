// Lógica de negocio del portal: aceptar compromisos, firmar, entregar, validar y verificar.
// Cada paso relevante deja su huella anclada en blockchain y un evento de auditoría.
import { anchorHash, sha256Hex } from './anchor.js';
import { buildContract, signedHash, validateMilestones } from './contract.js';
import { store } from './store.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const now = () => new Date().toISOString();

async function anclar(hash, tipo, referencia) {
  const r = await anchorHash(hash);
  return store.insert('anclajes', { hash, tipo, referencia, prueba: r.prueba || null, estado: r.estado, error: r.error || null });
}

async function evento(usuario, accion, entidad, entidad_id, detalle) {
  await store.insert('eventos', { usuario_id: usuario?.id || null, accion, entidad, entidad_id, detalle: detalle || null }).catch(() => {});
}

async function cargar(compromisoId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(compromisoId || ''))) throw new HttpError(400, 'Compromiso no válido.');
  const data = await store.compromisoCompleto(compromisoId);
  if (!data) throw new HttpError(404, 'No existe ese compromiso.');
  return data;
}

// La ONG acepta o rechaza un compromiso. Al aceptar se genera y ancla el convenio.
export async function responder(user, { compromiso_id, accion }) {
  const d = await cargar(compromiso_id);
  if (d.proyecto.ong_id !== user.id) throw new HttpError(403, 'Solo la ONG de la línea puede responder.');
  if (d.compromiso.estado !== 'propuesto') throw new HttpError(409, 'Este compromiso ya fue respondido.');
  if (accion === 'rechazar') {
    await store.update('compromisos', d.compromiso.id, { estado: 'rechazado' });
    await evento(user, 'rechazar', 'compromiso', d.compromiso.id);
    return { estado: 'rechazado' };
  }
  if (accion !== 'aceptar') throw new HttpError(400, 'Acción no válida.');
  if (d.linea.estado !== 'abierta') throw new HttpError(409, 'La línea ya tiene un financiador.');
  const problema = validateMilestones(d.hitos);
  if (problema) throw new HttpError(422, problema);

  const c = buildContract(d);
  const contrato = await store.insert('contratos', {
    compromiso_id: d.compromiso.id, texto: c.texto, hash: c.hash, comision_pct: c.comision_pct, comision_importe: c.comision,
  });
  await store.update('compromisos', d.compromiso.id, { estado: 'aceptado' });
  await store.update('lineas', d.linea.id, { estado: 'comprometida' });
  const anclaje = await anclar(c.hash, 'contrato', contrato.id);
  await evento(user, 'aceptar', 'compromiso', d.compromiso.id, { hash: c.hash });
  return { estado: 'aceptado', contrato_id: contrato.id, hash: c.hash, anclaje: anclaje.estado, desglose: { total: c.total, comision: c.comision, tramos: c.tramos } };
}

// Cada parte firma el convenio. Cuando firman las dos, se ancla la huella del contrato firmado.
export async function firmar(user, { compromiso_id }) {
  const d = await cargar(compromiso_id);
  if (!d.contrato) throw new HttpError(409, 'Todavía no hay convenio que firmar.');
  const esOng = d.proyecto.ong_id === user.id;
  const esFin = d.compromiso.financiador_id === user.id;
  if (!esOng && !esFin) throw new HttpError(403, 'No eres parte de este convenio.');
  if (d.compromiso.estado !== 'aceptado') throw new HttpError(409, 'El convenio no está pendiente de firma.');

  const campo = esOng ? 'firma_ong' : 'firma_financiador';
  if (d.contrato[campo]) throw new HttpError(409, 'Ya habías firmado este convenio.');
  let contrato = await store.update('contratos', d.contrato.id, { [campo]: now() });
  await evento(user, 'firmar', 'contrato', d.contrato.id, { parte: esOng ? 'ong' : 'financiador' });

  if (contrato.firma_ong && contrato.firma_financiador) {
    const h = signedHash(contrato);
    contrato = await store.update('contratos', d.contrato.id, { hash_firmado: h });
    await store.update('compromisos', d.compromiso.id, { estado: 'firmado' });
    await store.update('lineas', d.linea.id, { estado: 'en_ejecucion' });
    await anclar(h, 'contrato_firmado', d.contrato.id);
    return { estado: 'firmado', hash_firmado: h };
  }
  return { estado: 'pendiente_otra_firma' };
}

// La ONG registra la entrega de un hito (archivo subido a Supabase Storage o enlace externo).
export async function entregar(user, { compromiso_id, hito_id, descripcion, enlace, archivo }) {
  const d = await cargar(compromiso_id);
  if (d.proyecto.ong_id !== user.id) throw new HttpError(403, 'Solo la ONG puede registrar entregas.');
  if (d.compromiso.estado !== 'firmado') throw new HttpError(409, 'El convenio debe estar firmado por ambas partes.');
  const hito = d.hitos.find((h) => h.id === hito_id);
  if (!hito) throw new HttpError(404, 'Ese hito no pertenece a esta línea.');
  if (!['pendiente', 'rechazado'].includes(hito.estado)) throw new HttpError(409, 'Este hito ya tiene una entrega en curso o validada.');
  const desc = String(descripcion || '').trim();
  if (desc.length < 3) throw new HttpError(400, 'Describe la entrega.');
  const link = String(enlace || '').trim();
  const file = String(archivo || '').trim();
  if (!link && !file) throw new HttpError(400, 'Adjunta un archivo o un enlace.');
  if (link && !/^https?:\/\/\S+$/i.test(link)) throw new HttpError(400, 'El enlace no es válido.');
  if (file && !file.startsWith(`${user.id}/`)) throw new HttpError(403, 'Archivo no válido.');

  // Huella: del contenido del archivo si lo hay; si es un enlace, del enlace y la descripción.
  const contenido = file ? await store.descargar(file) : Buffer.from(`${link}\n${desc}`);
  const hash = sha256Hex(contenido);
  const entrega = await store.insert('entregas', {
    hito_id, compromiso_id, descripcion: desc, enlace: link || null, archivo: file || null, hash, estado: 'pendiente',
  });
  await store.update('hitos', hito_id, { estado: 'entregado' });
  const anclaje = await anclar(hash, 'entrega', entrega.id);
  await evento(user, 'entregar', 'entrega', entrega.id, { hash, hito_id });
  return { entrega_id: entrega.id, hash, anclaje: anclaje.estado };
}

// El financiador valida o rechaza una entrega. Al validar el último hito, la línea se cierra.
export async function validar(user, { entrega_id, decision, comentario }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(entrega_id || ''))) throw new HttpError(400, 'Entrega no válida.');
  const entrega = await store.entrega(entrega_id);
  if (!entrega) throw new HttpError(404, 'No existe esa entrega.');
  const d = await cargar(entrega.compromiso_id);
  if (d.compromiso.financiador_id !== user.id) throw new HttpError(403, 'Solo el financiador puede validar entregas.');
  if (entrega.estado !== 'pendiente') throw new HttpError(409, 'Esta entrega ya fue revisada.');
  const nota = String(comentario || '').slice(0, 2000);

  if (decision === 'rechazar') {
    if (nota.trim().length < 5) throw new HttpError(400, 'Explica el motivo del rechazo.');
    await store.update('entregas', entrega.id, { estado: 'rechazada', comentario: nota });
    await store.update('hitos', entrega.hito_id, { estado: 'rechazado' });
    await evento(user, 'rechazar', 'entrega', entrega.id, { comentario: nota });
    return { estado: 'rechazada' };
  }
  if (decision !== 'validar') throw new HttpError(400, 'Decisión no válida.');

  await store.update('entregas', entrega.id, { estado: 'validada', comentario: nota || null });
  await store.update('hitos', entrega.hito_id, { estado: 'validado' });
  const hashVal = sha256Hex(`validacion|${entrega.hash}|${user.id}|${now()}`);
  await anclar(hashVal, 'validacion', entrega.id);

  const hito = d.hitos.find((h) => h.id === entrega.hito_id);
  const importeTramo = Math.round(Number(d.compromiso.importe) * Number(hito?.porcentaje || 0)) / 100;
  const comisionTramo = Math.round(importeTramo * Number(d.contrato?.comision_pct || 0)) / 100;
  const pendientes = d.hitos.filter((h) => h.id !== entrega.hito_id && h.estado !== 'validado');
  let estado = 'validada';
  if (pendientes.length === 0) {
    await store.update('compromisos', d.compromiso.id, { estado: 'completado' });
    await store.update('lineas', d.linea.id, { estado: 'cerrada' });
    estado = 'linea_completada';
  }
  await evento(user, 'validar', 'entrega', entrega.id, { importe_tramo: importeTramo, comision_tramo: comisionTramo });
  // Aquí, en la fase de pagos, se ordenará al proveedor de custodia liberar el tramo y cobrar la comisión.
  return { estado, importe_liberable: importeTramo, comision_3sn: comisionTramo };
}

export async function verificar(hash) {
  const h = String(hash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(h)) throw new HttpError(400, 'La huella debe tener 64 caracteres hexadecimales.');
  return { hash: h, registros: await store.anclajesPorHash(h) };
}

// Enlace temporal (10 min) al archivo de una entrega, solo para las partes del convenio.
export async function archivo(user, { entrega_id }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(entrega_id || ''))) throw new HttpError(400, 'Entrega no válida.');
  const entrega = await store.entrega(entrega_id);
  if (!entrega) throw new HttpError(404, 'No existe esa entrega.');
  const d = await cargar(entrega.compromiso_id);
  if (d.proyecto.ong_id !== user.id && d.compromiso.financiador_id !== user.id) throw new HttpError(403, 'No eres parte de este convenio.');
  if (!entrega.archivo) return { url: entrega.enlace };
  return { url: await store.enlaceTemporal(entrega.archivo) };
}
