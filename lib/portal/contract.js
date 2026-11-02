// Genera el texto del convenio entre ONG y financiador para una línea, y calcula importes.
// Plantilla orientativa: debe revisarla un profesional antes de usarla con dinero real.
import { sha256Hex } from './anchor.js';

export const COMMISSION_PCT = Number(process.env.COMISION_PCT || 7);

const eur = (n) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

export function validateMilestones(hitos) {
  if (!Array.isArray(hitos) || hitos.length === 0) return 'La línea no tiene hitos definidos.';
  const total = round2(hitos.reduce((s, h) => s + Number(h.porcentaje || 0), 0));
  if (total !== 100) return `Los porcentajes de los hitos suman ${total} % y deben sumar 100 %.`;
  return null;
}

// Desglose: cuánto libera cada hito y la comisión de 3SN (sobre el importe comprometido).
export function breakdown(importe, hitos, pct = COMMISSION_PCT) {
  const total = round2(importe);
  const comision = round2((total * pct) / 100);
  const sorted = [...hitos].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  let asignado = 0;
  const tramos = sorted.map((h, i) => {
    const imp = i === sorted.length - 1 ? round2(total - asignado) : round2((total * Number(h.porcentaje)) / 100);
    asignado = round2(asignado + imp);
    return { hito_id: h.id, titulo: h.titulo, entregable: h.entregable, porcentaje: Number(h.porcentaje), importe: imp, fecha_prevista: h.fecha_prevista || null };
  });
  return { total, comision_pct: pct, comision, neto_ong: round2(total - comision), tramos };
}

export function buildContract({ compromiso, linea, proyecto, hitos, ong, financiador, fecha = new Date() }) {
  const b = breakdown(compromiso.importe, hitos);
  const fechaTxt = fecha.toISOString().slice(0, 10);
  const contrapartidas = (linea.contrapartidas || []).length ? linea.contrapartidas.join('; ') : 'Las que acuerden las partes por escrito';
  const texto = `CONVENIO DE COLABORACIÓN PARA LA FINANCIACIÓN DE UNA LÍNEA DE PROYECTO
Plataforma 3SN · Third Sector Network
Referencia del compromiso: ${compromiso.id}
Fecha de emisión: ${fechaTxt}

1. PARTES
1.1. Entidad beneficiaria (ONG): ${ong.nombre}${ong.cif ? `, con CIF ${ong.cif}` : ''}.
1.2. Entidad financiadora: ${financiador.nombre}${financiador.cif ? `, con CIF ${financiador.cif}` : ''}.
1.3. Plataforma: 3SN · Third Sector Network, que facilita el acuerdo, custodia el registro y verifica los hitos.

2. OBJETO
La entidad financiadora financia la línea «${linea.titulo}» del proyecto «${proyecto.titulo}»${proyecto.ubicacion ? ` (${proyecto.ubicacion})` : ''}.
Descripción de la línea: ${linea.descripcion}

3. IMPORTE Y LIBERACIÓN POR HITOS
3.1. Importe total comprometido: ${eur(b.total)}.
3.2. El importe se libera por tramos, cada uno tras la validación por la entidad financiadora del entregable del hito correspondiente:
${b.tramos.map((t, i) => `   ${i + 1}. ${t.titulo} — ${t.porcentaje} % (${eur(t.importe)}). Entregable: ${t.entregable}.${t.fecha_prevista ? ` Fecha prevista: ${t.fecha_prevista}.` : ''}`).join('\n')}
3.3. La entidad financiadora dispone de 15 días naturales desde cada entrega para validarla o rechazarla motivadamente. Transcurrido ese plazo sin respuesta, la entrega se entenderá validada.

4. CONTRAPARTIDAS PARA LA ENTIDAD FINANCIADORA
${contrapartidas}.
La entidad beneficiaria autoriza a la financiadora a difundir su participación en la línea y a usar los materiales entregados como contrapartida en su comunicación corporativa, citando a la entidad beneficiaria. Cuando la entidad beneficiaria esté acogida a la Ley 49/2002, las partes podrán formalizar este acuerdo como convenio de colaboración empresarial en actividades de interés general (art. 25), en cuyo caso la difusión de la participación no constituye prestación de servicios.

5. COMISIÓN DE LA PLATAFORMA
3SN percibe una comisión del ${b.comision_pct} % sobre el importe comprometido (${eur(b.comision)}), que se devenga de forma proporcional a cada tramo liberado. 3SN solo cobra cuando se valida la contrapartida de cada hito.

6. REGISTRO Y VERIFICACIÓN
La huella digital (SHA-256) de este convenio, de las firmas de las partes, de cada entrega y de cada validación se registra en una cadena de bloques pública (Bitcoin, mediante OpenTimestamps). Cualquiera de las partes puede verificar en todo momento que el texto y las entregas no han sido alterados.

7. PAGOS
Durante la fase piloto, los pagos se realizan fuera de la plataforma conforme al calendario de hitos validados que registra 3SN. En fases posteriores, el importe se depositará en una cuenta de custodia de un proveedor de pagos autorizado y se liberará automáticamente al validarse cada hito.

8. INCUMPLIMIENTO Y RESOLUCIÓN
Si un entregable es rechazado, la entidad beneficiaria podrá subsanarlo en un plazo de 30 días. Los tramos no liberados quedan sin efecto si el convenio se resuelve por incumplimiento. Las partes procurarán resolver de buena fe cualquier discrepancia antes de acudir a otras vías.

9. ACEPTACIÓN
Las partes aceptan este convenio mediante firma electrónica simple en la plataforma 3SN. Cada firma queda registrada con fecha y hora y su huella se ancla en la cadena de bloques.
`;
  return { texto, hash: sha256Hex(texto), ...b };
}

// Huella del contrato firmado: une la huella del texto con las dos firmas.
export function signedHash(contrato) {
  return sha256Hex(`${contrato.hash}|ong:${contrato.firma_ong}|financiador:${contrato.firma_financiador}`);
}
