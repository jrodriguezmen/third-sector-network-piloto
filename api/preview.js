// Vista previa gratuita: árbol de problemas + lógica de intervención (sin indicadores ni actividades).
import { generateMatrix } from '../lib/anthropic.js';
import { cleanForm } from '../lib/form.js';
import { body, fail, onlyPost } from '../lib/http.js';

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  try {
    const data = body(req);
    // Campo trampa para bots: los humanos no lo ven ni lo rellenan.
    if (data.web) return res.status(400).json({ error: 'Solicitud no válida.' });
    const form = cleanForm(data.form);
    const matrix = await generateMatrix(form, 'preview');
    res.status(200).json({ matrix });
  } catch (err) {
    fail(res, err);
  }
}
