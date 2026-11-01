import { buildPrompt, parseMatrix } from './prompt.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// Modelos configurables por variable de entorno.
export const MODELS = {
  preview: process.env.MODEL_PREVIEW || 'claude-haiku-5-5',
  full: process.env.MODEL_FULL || 'claude-sonnet-5-5',
};

async function callClaude({ system, user, model, maxTokens, fetchImpl }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');
  const res = await fetchImpl(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Error de la API de Claude (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// Genera la matriz. Reintenta una vez si el JSON sale mal formado o incompleto.
export async function generateMatrix(form, mode, { fetchImpl = fetch } = {}) {
  const { system, user } = buildPrompt(form, mode);
  const model = MODELS[mode];
  const maxTokens = mode === 'full' ? 8000 : 2000;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callClaude({ system, user, model, maxTokens, fetchImpl });
    try {
      return parseMatrix(text, mode);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`No se pudo generar una matriz válida: ${lastError.message}`);
}
