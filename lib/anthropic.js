import { buildPrompt, parseMatrix, TOOL_NAME } from './prompt.js';

const API_URL = 'https://api.anthropic.com/v1/messages';

// Modelos configurables por variable de entorno.
export const MODELS = {
  preview: process.env.MODEL_PREVIEW || 'claude-haiku-5-5',
  full: process.env.MODEL_FULL || 'claude-sonnet-5-5',
};

// Llama a Claude obligándole a usar la herramienta con el esquema de la matriz:
// la API devuelve el resultado ya como objeto JSON válido.
async function callClaude({ system, user, tool, model, maxTokens, fetchImpl }) {
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
      tool_choice: { type: 'tool', name: TOOL_NAME },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Error de la API de Claude (${res.status}): ${body.slice(0, 300)}`);
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
    try {
      const output = await callClaude({ system, user, tool, model, maxTokens, fetchImpl });
      return parseMatrix(output, mode);
    } catch (err) {
      if (/Error de la API de Claude|Falta ANTHROPIC/.test(err.message)) throw err;
      lastError = err;
    }
  }
  throw new Error(`No se pudo generar una matriz válida: ${lastError.message}`);
}
