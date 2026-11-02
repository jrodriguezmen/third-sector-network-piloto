// Registro notarial en blockchain mediante OpenTimestamps (sobre Bitcoin).
// Se envía solo la huella SHA-256 (nunca el documento): gratis, sin cartera ni criptomonedas.
// La prueba devuelta (.ots) queda "pendiente" hasta que Bitcoin la confirma (unas horas) y se puede
// verificar en https://opentimestamps.org subiendo el documento original y su archivo .ots.
// Diseñado para poder sustituir o complementar la red (p. ej. un contrato inteligente en Polygon).
import { createHash } from 'node:crypto';

export const CALENDARS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
];

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

// Envía la huella a un calendario OpenTimestamps. No lanza: devuelve { estado, prueba | error }.
export async function anchorHash(hashHex, { fetchImpl = fetch } = {}) {
  if (!/^[0-9a-f]{64}$/.test(hashHex)) return { estado: 'error', error: 'Huella no válida' };
  const digest = Buffer.from(hashHex, 'hex');
  let lastError = 'sin respuesta';
  for (const base of CALENDARS) {
    try {
      const res = await fetchImpl(`${base}/digest`, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream', accept: 'application/vnd.opentimestamps.v1' },
        body: digest,
      });
      if (!res.ok) { lastError = `${base} respondió ${res.status}`; continue; }
      const proof = Buffer.from(await res.arrayBuffer());
      return { estado: 'pendiente', prueba: proof.toString('base64'), calendario: base };
    } catch (err) {
      lastError = `${base}: ${err.message}`;
    }
  }
  return { estado: 'error', error: lastError };
}
