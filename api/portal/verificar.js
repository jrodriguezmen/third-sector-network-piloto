// Verificación pública: devuelve los registros en blockchain de una huella SHA-256.
import { fail } from '../../lib/http.js';
import { verificar } from '../../lib/portal/service.js';

export default async function handler(req, res) {
  try {
    const hash = (req.query && req.query.hash) || new URL(req.url, 'http://x').searchParams.get('hash');
    res.status(200).json(await verificar(hash));
  } catch (err) {
    fail(res, err);
  }
}
