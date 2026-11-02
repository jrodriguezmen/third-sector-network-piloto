import { buildPrompt, parseMatrix, TOOL_NAME } from './prompt.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// Modelos configurables por variable de entorno.
export const MODELS = {
  preview: process.env.MODEL_PREVIEW || 'claude-haiku-5-5',
  full: process.env.MODEL_FULL || 'claude-sonnet-5-5',
};

// Modelos que no admiten forzar la herramienta (tool_choice "tool"): se les ofrece en modo "auto".
const AUTO_ONLY = new Set();

// Llama a Claude con la herramienta del esquema de la matriz: la API devuelve el resultado
// ya como objeto JSON válido. Si el modelo no admite forzarla, se reintenta en modo "auto".
async function callClaude(opts) {
  const forced = !AUTO_ONLY.has(opts.model);
  try {
    return await request({ ...opts, forced });
  } catch (err) {
    if (forced && err.status === 400 && /tool_choice/.test(err.message)) {
      AUTO_ONLY.add(opts.model);
      return request({ ...opts, forced: false });
    }
    throw err;
  }
}

async function request({ system, user, tool, model, maxTokens, fetchImpl, forced }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');
  const headers = {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };
  if (process.env.ANTHROPIC_WORKSPACE_ID) headers['anthropic-workspace-id'] = process.env.ANTHROPIC_WORKSPACE_ID;
  const res = await fetchImpl(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: forced ? { type: 'tool', name: TOOL_NAME } : { type: 'auto' },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Error de la API de Claude (${res.status}): ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  if (json.stop_reason === 'max_tokens') throw new Error('La respuesta se cortó por longitud');
  const toolUse = (json.content || []).find((b) => b.type === 'tool_use');
  if (toolUse) return toolUse.input;
  return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// Genera la matriz. Reintenta una vez si la respuesta sale incompleta.
export async function generateMatrix(form, mode, { fetchImpl = fetch } = {}) {
  const { system, user, tool } = buildPrompt(form, mode);
  const model = MODELS[mode];
  const maxTokens = mode === 'full' ? 12000 : 4000;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    let output;
    try {
      output = await callClaude({ system, user, tool, model, maxTokens, fetchImpl });
      const matrix = parseMatrix(output, mode);
      if (matrix.titulo === 'Proyecto' && form.titulo) matrix.titulo = form.titulo;
      return matrix;
    } catch (err) {
      if (/Error de la API de Claude|Falta ANTHROPIC/.test(err.message)) throw err;
      // Deja en el registro de Vercel un trozo de la respuesta para poder diagnosticar.
      const sample = typeof output === 'string' ? output : JSON.stringify(output);
      console.error(`[${mode}] respuesta no válida (${err.message}):`, (sample || '').slice(0, 1500));
      lastError = err;
    }
  }
  throw new Error(`No se pudo generar una matriz válida: ${lastError.message}`);
}
