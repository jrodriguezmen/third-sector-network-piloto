import { formToText } from './form.js';

const SYSTEM = `Eres un técnico experto en formulación de proyectos de cooperación al desarrollo y acción social en España y Latinoamérica, especializado en el Enfoque del Marco Lógico (EML) tal como lo usan la AECID, la Unión Europea, las comunidades autónomas y las fundaciones privadas.

Reglas de calidad:
- Lógica vertical coherente: actividades → resultados → objetivo específico → objetivo general.
- Un único objetivo general y un único objetivo específico.
- Resultados redactados como logros alcanzados (participio: "Mejorada…", "Fortalecidas…").
- Indicadores objetivamente verificables (IOV) SMART: con línea de base cuando tenga sentido, meta cuantificada, población y plazo. Ej.: "Al finalizar el mes 12, el 70 % de las 120 mujeres participantes…".
- Fuentes de verificación concretas (listados de asistencia, encuestas pre/post, informes, registros).
- Supuestos o hipótesis: factores externos fuera del control del proyecto, redactados en positivo.
- Incorpora los enfoques transversales indicados (género, derechos humanos, sostenibilidad ambiental, diversidad cultural) cuando sean pertinentes.
- No inventes datos estadísticos concretos del contexto; si hace falta una línea de base desconocida, indica "Línea de base: a determinar en el diagnóstico inicial".
- Escribe en español neutro y profesional.

Respondes SIEMPRE con un único objeto JSON válido, sin texto antes ni después y sin bloques de código.`;

const SCHEMA_PREVIEW = `{
  "titulo": string,
  "resumen": string (2-3 frases),
  "arbol_problemas": { "problema_central": string, "causas": [string], "efectos": [string] },
  "objetivo_general": { "descripcion": string },
  "objetivo_especifico": { "descripcion": string },
  "resultados": [ { "codigo": "R1", "descripcion": string } ]  (entre 2 y 4 resultados)
}`;

const SCHEMA_FULL = `{
  "titulo": string,
  "resumen": string (2-3 frases),
  "arbol_problemas": { "problema_central": string, "causas": [string], "efectos": [string] },
  "objetivo_general": { "descripcion": string, "indicadores": [string], "fuentes": [string], "supuestos": [string] },
  "objetivo_especifico": { "descripcion": string, "indicadores": [string], "fuentes": [string], "supuestos": [string] },
  "resultados": [
    {
      "codigo": "R1",
      "descripcion": string,
      "indicadores": [string],
      "fuentes": [string],
      "supuestos": [string],
      "actividades": [ { "codigo": "A1.1", "descripcion": string, "recursos": string } ]
    }
  ]  (entre 2 y 4 resultados, cada uno con 2-5 actividades),
  "precondiciones": [string],
  "riesgos": [ { "riesgo": string, "mitigacion": string } ]
}`;

export function buildPrompt(form, mode) {
  const schema = mode === 'full' ? SCHEMA_FULL : SCHEMA_PREVIEW;
  const extra = mode === 'full'
    ? 'Genera la matriz de planificación completa. Cada objetivo y resultado debe tener entre 2 y 3 indicadores.'
    : 'Genera solo el análisis de problemas y la lógica de intervención (sin indicadores, fuentes, supuestos ni actividades).';
  const user = `Datos del proyecto que facilita la organización:
${formToText(form)}

${extra}

Devuelve un JSON con exactamente esta estructura:
${schema}`;
  return { system: SYSTEM, user };
}

// Extrae y valida el JSON devuelto por el modelo.
export function parseMatrix(text, mode) {
  if (typeof text !== 'string') throw new Error('Respuesta vacía del modelo');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('La respuesta del modelo no contiene JSON');
  const data = JSON.parse(text.slice(start, end + 1));

  const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
  const strList = (v) => (Array.isArray(v) ? v.filter(isStr) : []);

  if (!isStr(data.titulo)) throw new Error('Falta el título');
  if (!data.objetivo_general || !isStr(data.objetivo_general.descripcion)) throw new Error('Falta el objetivo general');
  if (!data.objetivo_especifico || !isStr(data.objetivo_especifico.descripcion)) throw new Error('Falta el objetivo específico');
  if (!Array.isArray(data.resultados) || data.resultados.length === 0) throw new Error('Faltan resultados');

  const level = (o) => ({
    descripcion: o.descripcion.trim(),
    indicadores: strList(o.indicadores),
    fuentes: strList(o.fuentes),
    supuestos: strList(o.supuestos),
  });

  const clean = {
    titulo: data.titulo.trim(),
    resumen: isStr(data.resumen) ? data.resumen.trim() : '',
    arbol_problemas: {
      problema_central: isStr(data.arbol_problemas?.problema_central) ? data.arbol_problemas.problema_central.trim() : '',
      causas: strList(data.arbol_problemas?.causas),
      efectos: strList(data.arbol_problemas?.efectos),
    },
    objetivo_general: level(data.objetivo_general),
    objetivo_especifico: level(data.objetivo_especifico),
    resultados: data.resultados.filter((r) => r && isStr(r.descripcion)).map((r, i) => ({
      codigo: isStr(r.codigo) ? r.codigo.trim() : `R${i + 1}`,
      ...level(r),
      actividades: (Array.isArray(r.actividades) ? r.actividades : [])
        .filter((a) => a && isStr(a.descripcion))
        .map((a, j) => ({
          codigo: isStr(a.codigo) ? a.codigo.trim() : `A${i + 1}.${j + 1}`,
          descripcion: a.descripcion.trim(),
          recursos: isStr(a.recursos) ? a.recursos.trim() : '',
        })),
    })),
    precondiciones: strList(data.precondiciones),
    riesgos: (Array.isArray(data.riesgos) ? data.riesgos : [])
      .filter((r) => r && isStr(r.riesgo))
      .map((r) => ({ riesgo: r.riesgo.trim(), mitigacion: isStr(r.mitigacion) ? r.mitigacion.trim() : '' })),
  };

  if (mode === 'full') {
    const missing = clean.resultados.some((r) => r.indicadores.length === 0 || r.actividades.length === 0);
    if (missing || clean.objetivo_especifico.indicadores.length === 0) throw new Error('Matriz incompleta');
  }
  return clean;
}
