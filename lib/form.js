import { createHash } from 'node:crypto';

// Campos del formulario y su longitud máxima (para limitar abusos y coste de tokens).
export const FIELDS = {
  titulo: { label: 'Título del proyecto', max: 150, required: true },
  organizacion: { label: 'Organización', max: 120, required: false },
  problema: { label: 'Problema que queréis resolver', max: 1500, required: true },
  poblacion: { label: 'Población destinataria', max: 600, required: true },
  ubicacion: { label: 'Lugar de intervención', max: 200, required: true },
  duracion: { label: 'Duración', max: 60, required: true },
  presupuesto: { label: 'Presupuesto aproximado', max: 60, required: false },
  financiador: { label: 'Convocatoria o financiador', max: 200, required: false },
  enfoques: { label: 'Enfoques transversales', max: 300, required: false },
  contexto: { label: 'Información adicional', max: 1500, required: false },
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// Devuelve un objeto limpio solo con los campos conocidos, recortados y validados.
export function cleanForm(input) {
  if (!input || typeof input !== 'object') throw new ValidationError('Faltan los datos del proyecto.');
  const out = {};
  for (const [key, def] of Object.entries(FIELDS)) {
    const raw = input[key];
    const value = typeof raw === 'string' ? raw.trim().replace(/\s+\n/g, '\n') : '';
    if (def.required && value.length < 3) throw new ValidationError(`Rellena el campo «${def.label}».`);
    if (value.length > def.max) throw new ValidationError(`«${def.label}» es demasiado largo (máx. ${def.max} caracteres).`);
    out[key] = value;
  }
  return out;
}

// Huella del proyecto: liga un pago a un proyecto concreto (no se puede pagar uno y generar otro distinto).
export function formHash(form) {
  const canonical = Object.keys(FIELDS).map((k) => `${k}=${form[k] || ''}`).join('\n');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export function formToText(form) {
  return Object.entries(FIELDS)
    .filter(([k]) => form[k])
    .map(([k, def]) => `- ${def.label}: ${form[k]}`)
    .join('\n');
}
