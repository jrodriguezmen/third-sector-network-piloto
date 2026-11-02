// Envoltorio común de las funciones del portal: método, autenticación y errores.
import { body, fail } from '../http.js';
import { store } from './store.js';

export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

// Crea un handler POST autenticado que llama a fn(user, body).
export function authed(fn) {
  return async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Método no permitido' });
    }
    try {
      const user = await store.userFromToken(bearer(req));
      if (!user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
      res.status(200).json(await fn(user, body(req)));
    } catch (err) {
      fail(res, err);
    }
  };
}
