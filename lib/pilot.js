// Códigos de acceso para el piloto: permiten generar la matriz completa sin pagar.
// Se configuran en la variable de entorno PILOT_CODES, separados por comas (p. ej. "ONG-ACOGE,ONG-VERDE").
// Para desactivar un código, se quita de la lista y se vuelve a desplegar.

export function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase().replace(/\s+/g, '') : '';
}

export function isValidPilotCode(code) {
  const c = normalizeCode(code);
  if (!c || c.length > 40) return false;
  const codes = (process.env.PILOT_CODES || '').split(',').map(normalizeCode).filter(Boolean);
  return codes.includes(c);
}
