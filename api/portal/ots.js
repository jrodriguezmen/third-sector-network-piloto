// Descarga la prueba .ots de un anclaje para verificarla en opentimestamps.org.
import { fail } from '../../lib/http.js';
import { verificar } from '../../lib/portal/service.js';

export default async function handler(req, res) {
  try {
    const hash = (req.query && req.query.hash) || new URL(req.url, 'http://x').searchParams.get('hash');
    const { registros } = await verificar(hash);
    const conPrueba = registros.find((r) => r.prueba);
    if (!conPrueba) return res.status(404).json({ error: 'No hay prueba disponible para esa huella.' });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${conPrueba.hash}.ots"`);
    res.status(200).send(Buffer.from(conPrueba.prueba, 'base64'));
  } catch (err) {
    fail(res, err);
  }
}
