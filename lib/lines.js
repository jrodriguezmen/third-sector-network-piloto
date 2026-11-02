// Formato de salida por líneas con etiquetas. Es mucho más robusto que el JSON:
// no hay comillas que escapar ni llaves que cerrar, y una línea mal escrita no rompe el resto.

const PREVIEW_SPEC = `TITULO: título del proyecto
RESUMEN: 2-3 frases
PROBLEMA: problema central
CAUSA: una causa (repite la línea para cada causa, 3-6)
EFECTO: un efecto (repite la línea para cada efecto, 3-5)
OG: objetivo general
OE: objetivo específico
R: R1 | descripción del resultado (entre 2 y 4 líneas R)`;

const FULL_SPEC = `TITULO: título del proyecto
RESUMEN: 2-3 frases
PROBLEMA: problema central
CAUSA: una causa (repite la línea para cada causa, 3-6)
EFECTO: un efecto (repite la línea para cada efecto, 3-5)
OG: objetivo general
IND: indicador del objetivo general (2-3 líneas IND)
FV: fuente de verificación (1-3 líneas FV)
SUP: supuesto (1-2 líneas SUP)
OE: objetivo específico
IND: …
FV: …
SUP: …
R: R1 | descripción del resultado
IND: …
FV: …
SUP: …
A: A1.1 | descripción de la actividad | recursos necesarios
A: A1.2 | … | …
(repite el bloque R con sus IND, FV, SUP y 2-5 líneas A, para 2-4 resultados)
PRE: precondición (1-3 líneas)
RIESGO: riesgo | medida de mitigación (2-4 líneas)`;

export function formatInstructions(mode) {
  return `Formato de respuesta OBLIGATORIO: solo líneas que empiezan por una etiqueta en mayúsculas seguida de dos puntos, en este orden, sin títulos, sin viñetas, sin negritas y sin texto adicional. Cada IND, FV y SUP pertenece al último OG, OE o R escrito antes.

${mode === 'full' ? FULL_SPEC : PREVIEW_SPEC}`;
}

const TAG = /^\s*(?:[-*•]\s*)?\**\s*(TITULO|TÍTULO|RESUMEN|PROBLEMA|CAUSA|EFECTO|OG|OE|IND|FV|SUP|R|A|PRE|RIESGO)\s*\**\s*:\s*(.*)$/i;

// Convierte el texto por líneas en el objeto de matriz (mismo formato que espera parseMatrix).
export function parseLines(text) {
  const m = {
    titulo: '', resumen: '',
    arbol_problemas: { problema_central: '', causas: [], efectos: [] },
    objetivo_general: null, objetivo_especifico: null,
    resultados: [], precondiciones: [], riesgos: [],
  };
  let level = null; // nivel actual al que se cuelgan IND / FV / SUP
  let last = null; // función para añadir texto de continuación a la última línea
  const newLevel = (descripcion) => ({ descripcion, indicadores: [], fuentes: [], supuestos: [] });
  const pushTo = (arr, v) => { arr.push(v); const i = arr.length - 1; last = (t) => { arr[i] = `${arr[i]} ${t}`; }; };
  const split = (v, n) => { const parts = v.split('|').map((s) => s.trim()); while (parts.length < n) parts.push(''); return parts; };

  for (const raw of String(text || '').replace(/```[a-z]*\n?/gi, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(TAG);
    if (!match) { if (last) last(line); continue; }
    const tag = match[1].toUpperCase().replace('Í', 'I');
    const value = match[2].trim().replace(/^\*+|\*+$/g, '').trim();
    switch (tag) {
      case 'TITULO': m.titulo = value; last = (t) => { m.titulo += ` ${t}`; }; break;
      case 'RESUMEN': m.resumen = value; last = (t) => { m.resumen += ` ${t}`; }; break;
      case 'PROBLEMA': m.arbol_problemas.problema_central = value; last = (t) => { m.arbol_problemas.problema_central += ` ${t}`; }; break;
      case 'CAUSA': pushTo(m.arbol_problemas.causas, value); break;
      case 'EFECTO': pushTo(m.arbol_problemas.efectos, value); break;
      case 'OG': level = m.objetivo_general = newLevel(value); last = (t) => { level.descripcion += ` ${t}`; }; break;
      case 'OE': level = m.objetivo_especifico = newLevel(value); last = (t) => { level.descripcion += ` ${t}`; }; break;
      case 'R': {
        const [a, b] = split(value, 2);
        const hasCode = /^R\s*\d+$/i.test(a) && b;
        level = { codigo: hasCode ? a.replace(/\s+/g, '').toUpperCase() : `R${m.resultados.length + 1}`, ...newLevel(hasCode ? b : value), actividades: [] };
        m.resultados.push(level);
        const lv = level; last = (t) => { lv.descripcion += ` ${t}`; };
        break;
      }
      case 'IND': if (level) pushTo(level.indicadores, value); break;
      case 'FV': if (level) pushTo(level.fuentes, value); break;
      case 'SUP': if (level) pushTo(level.supuestos, value); break;
      case 'A': {
        const r = m.resultados[m.resultados.length - 1];
        if (!r) break;
        const [a, b, c] = split(value, 3);
        const hasCode = /^A\s*\d+(\.\d+)?$/i.test(a) && b;
        const act = hasCode
          ? { codigo: a.replace(/\s+/g, '').toUpperCase(), descripcion: b, recursos: c }
          : { codigo: `A${m.resultados.length}.${r.actividades.length + 1}`, descripcion: a, recursos: b };
        r.actividades.push(act);
        last = (t) => { act.descripcion += ` ${t}`; };
        break;
      }
      case 'PRE': pushTo(m.precondiciones, value); break;
      case 'RIESGO': { const [riesgo, mitigacion] = split(value, 2); m.riesgos.push({ riesgo, mitigacion }); last = null; break; }
      default: break;
    }
  }
  return m;
}
