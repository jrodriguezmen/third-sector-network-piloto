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

Entrega siempre el resultado llamando a la herramienta guardar_matriz.`;

// Esquemas JSON de la herramienta: la API garantiza que la respuesta los sigue
// y que llega como JSON válido (sin comillas sin escapar ni texto suelto).
const str = { type: 'string' };
const strArr = (description) => ({ type: 'array', items: str, description });
const textLevel = { type: 'object', properties: { descripcion: str }, required: ['descripcion'] };
const fullLevel = {
  type: 'object',
  properties: {
    descripcion: str,
    indicadores: strArr('2-3 indicadores SMART'),
    fuentes: strArr('Fuentes de verificación'),
    supuestos: strArr('Supuestos o hipótesis'),
  },
  required: ['descripcion', 'indicadores', 'fuentes', 'supuestos'],
};
const arbol = {
  type: 'object',
  properties: { problema_central: str, causas: strArr('Causas'), efectos: strArr('Efectos') },
  required: ['problema_central', 'causas', 'efectos'],
};

const SCHEMA_PREVIEW = {
  type: 'object',
  properties: {
    titulo: str,
    resumen: { type: 'string', description: '2-3 frases' },
    arbol_problemas: arbol,
    objetivo_general: textLevel,
    objetivo_especifico: textLevel,
    resultados: {
      type: 'array',
      description: 'Entre 2 y 4 resultados',
      items: { type: 'object', properties: { codigo: { type: 'string', description: 'R1, R2…' }, descripcion: str }, required: ['codigo', 'descripcion'] },
    },
  },
  required: ['titulo', 'resumen', 'arbol_problemas', 'objetivo_general', 'objetivo_especifico', 'resultados'],
};

const SCHEMA_FULL = {
  type: 'object',
  properties: {
    titulo: str,
    resumen: { type: 'string', description: '2-3 frases' },
    arbol_problemas: arbol,
    objetivo_general: fullLevel,
    objetivo_especifico: fullLevel,
    resultados: {
      type: 'array',
      description: 'Entre 2 y 4 resultados, cada uno con 2-5 actividades',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string', description: 'R1, R2…' },
          ...fullLevel.properties,
          actividades: {
            type: 'array',
            items: {
              type: 'object',
              properties: { codigo: { type: 'string', description: 'A1.1, A1.2…' }, descripcion: str, recursos: str },
              required: ['codigo', 'descripcion', 'recursos'],
            },
          },
        },
        required: ['codigo', 'descripcion', 'indicadores', 'fuentes', 'supuestos', 'actividades'],
      },
    },
    precondiciones: strArr('Precondiciones'),
    riesgos: {
      type: 'array',
      items: { type: 'object', properties: { riesgo: str, mitigacion: str }, required: ['riesgo', 'mitigacion'] },
    },
  },
  required: ['titulo', 'resumen', 'arbol_problemas', 'objetivo_general', 'objetivo_especifico', 'resultados', 'precondiciones', 'riesgos'],
};

export const TOOL_NAME = 'guardar_matriz';

// --- Normalización tolerante de la respuesta ---
// Cuando el modelo no está forzado a usar el esquema, puede variar la forma: claves en
// camelCase o con tildes, la matriz envuelta en otra clave, JSON dentro de un texto,
// o niveles como texto en vez de objeto. Lo llevamos todo a la forma esperada.

const ALIASES = {
  objetivo_general: ['og', 'objetivo_global', 'fin'],
  objetivo_especifico: ['oe', 'proposito'],
  resultados: ['resultados_esperados', 'productos', 'componentes'],
  arbol_problemas: ['arbol_de_problemas', 'analisis_problemas', 'analisis_de_problemas'],
  indicadores: ['iov', 'indicadores_objetivamente_verificables'],
  fuentes: ['fuentes_de_verificacion', 'fuentes_verificacion', 'medios_de_verificacion'],
  supuestos: ['hipotesis', 'supuestos_hipotesis'],
  descripcion: ['enunciado', 'texto', 'objetivo', 'resultado', 'nombre', 'logica_de_intervencion'],
  precondiciones: ['condiciones_previas'],
  mitigacion: ['medida', 'medidas', 'medidas_de_mitigacion'],
};
const ALIAS_TO_KEY = Object.fromEntries(Object.entries(ALIASES).flatMap(([k, list]) => list.map((a) => [a, k])));
const LEVEL_KEYS = ['objetivo_general', 'objetivo_especifico'];

function normKey(k) {
  const snake = k
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return ALIAS_TO_KEY[snake] || snake;
}

function maybeJson(v) {
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t); } catch { return v; }
  }
  return v;
}

function deepNormalize(v) {
  v = maybeJson(v);
  if (Array.isArray(v)) return v.map(deepNormalize);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const key = normKey(k);
      if (!(key in out)) out[key] = deepNormalize(val);
    }
    return out;
  }
  return v;
}

function asLevel(v) {
  if (typeof v === 'string') return { descripcion: v };
  if (v && typeof v === 'object' && typeof v.descripcion !== 'string') {
    const firstText = Object.values(v).find((x) => typeof x === 'string' && x.trim());
    if (firstText) return { ...v, descripcion: firstText };
  }
  return v;
}

export function normalize(raw) {
  let data = deepNormalize(raw);
  // Desenvuelve si la matriz viene dentro de otra clave (p. ej. {"matriz": {...}}).
  for (let i = 0; i < 3 && data && !data.objetivo_general; i++) {
    const inner = Object.values(data).find((v) => v && typeof v === 'object' && !Array.isArray(v) && (v.objetivo_general || Object.values(v).some((w) => w && typeof w === 'object' && w.objetivo_general)));
    if (!inner) break;
    data = inner;
  }
  if (!data || typeof data !== 'object') return data;
  for (const k of LEVEL_KEYS) if (k in data) data[k] = asLevel(data[k]);
  if (Array.isArray(data.resultados)) data.resultados = data.resultados.map(asLevel);
  if (!data.titulo && typeof data.titulo_proyecto === 'string') data.titulo = data.titulo_proyecto;
  return data;
}

export function buildPrompt(form, mode) {
  const extra = mode === 'full'
    ? 'Genera la matriz de planificación completa. Cada objetivo y resultado debe tener entre 2 y 3 indicadores.'
    : 'Genera solo el análisis de problemas y la lógica de intervención (sin indicadores, fuentes, supuestos ni actividades).';
  const user = `Datos del proyecto que facilita la organización:
${formToText(form)}

${extra}

Entrega la respuesta llamando a la herramienta ${TOOL_NAME} con todos sus campos rellenos, usando exactamente los nombres de campo del esquema (objetivo_general, objetivo_especifico, resultados…).`;
  const tool = {
    name: TOOL_NAME,
    description: mode === 'full' ? 'Guarda la matriz de Marco Lógico completa.' : 'Guarda la vista previa del Marco Lógico.',
    input_schema: mode === 'full' ? SCHEMA_FULL : SCHEMA_PREVIEW,
  };
  return { system: SYSTEM, user, tool };
}

// Valida y normaliza la matriz. Acepta el objeto de la herramienta o, por compatibilidad, texto con JSON.
export function parseMatrix(input, mode) {
  let data = input;
  if (typeof input === 'string') {
    const start = input.indexOf('{');
    const end = input.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('La respuesta del modelo no contiene JSON');
    data = JSON.parse(input.slice(start, end + 1));
  }
  if (!data || typeof data !== 'object') throw new Error('Respuesta vacía del modelo');
  data = normalize(data);

  const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
  const strList = (v) => (Array.isArray(v) ? v.filter(isStr) : []);

  if (!isStr(data.titulo)) data.titulo = 'Proyecto';
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
