import {
  AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageOrientation, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADER_FILL = '1F4E5F';
const LEVEL_FILL = 'E8F1F2';

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: 60 },
  ...opts,
  children: [new TextRun({ text, size: 18, ...(opts.run || {}) })],
});

const bullets = (items) => (items.length ? items : ['—']).map((t) => p(items.length ? `• ${t}` : t));

function cell(children, { fill, width, bold, color } = {}) {
  const paras = Array.isArray(children) ? children : [p(children, { run: { bold, color } })];
  return new TableCell({
    borders: BORDERS,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: paras,
  });
}

function levelRow(label, level) {
  return new TableRow({
    children: [
      cell([p(label, { run: { bold: true } }), p(level.descripcion)], { fill: LEVEL_FILL, width: 28 }),
      cell(bullets(level.indicadores), { width: 28 }),
      cell(bullets(level.fuentes), { width: 22 }),
      cell(bullets(level.supuestos), { width: 22 }),
    ],
  });
}

function activityRow(a) {
  return new TableRow({
    children: [
      cell([p(a.codigo, { run: { bold: true } }), p(a.descripcion)], { width: 28 }),
      cell([p('Recursos:', { run: { bold: true } }), p(a.recursos || '—')], { width: 28 }),
      cell('', { width: 22 }),
      cell('', { width: 22 }),
    ],
  });
}

export function buildDocument(matrix, meta = {}) {
  const header = new TableRow({
    tableHeader: true,
    children: ['Lógica de intervención', 'Indicadores objetivamente verificables', 'Fuentes de verificación', 'Supuestos / hipótesis']
      .map((t) => cell(t, { fill: HEADER_FILL, bold: true, color: 'FFFFFF' })),
  });

  const rows = [header, levelRow('OBJETIVO GENERAL', matrix.objetivo_general), levelRow('OBJETIVO ESPECÍFICO', matrix.objetivo_especifico)];
  for (const r of matrix.resultados) {
    rows.push(levelRow(`RESULTADO ${r.codigo}`, r));
    for (const a of r.actividades) rows.push(activityRow(a));
  }

  const ap = matrix.arbol_problemas;
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: matrix.titulo })] }),
  ];
  if (meta.organizacion) children.push(p(`Organización: ${meta.organizacion}`));
  if (matrix.resumen) children.push(p(matrix.resumen, { spacing: { after: 200 } }));

  if (ap.problema_central) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. Análisis de problemas')] }));
    children.push(p(`Problema central: ${ap.problema_central}`, { run: { bold: true } }));
    children.push(p('Causas:', { run: { bold: true } }), ...bullets(ap.causas));
    children.push(p('Efectos:', { run: { bold: true } }), ...bullets(ap.efectos));
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. Matriz de planificación (Marco Lógico)')] }));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

  if (matrix.precondiciones.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. Precondiciones')] }));
    children.push(...bullets(matrix.precondiciones));
  }
  if (matrix.riesgos.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. Riesgos y medidas de mitigación')] }));
    for (const r of matrix.riesgos) children.push(p(`• ${r.riesgo} → ${r.mitigacion || '—'}`));
  }
  children.push(p('Borrador generado con 3SN · Marco Lógico. Revísalo y adáptalo a las bases de la convocatoria antes de presentarlo.', {
    alignment: AlignmentType.LEFT, spacing: { before: 300 }, run: { italics: true, color: '666666' },
  }));

  return new Document({
    creator: '3SN · Marco Lógico',
    title: matrix.titulo,
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children,
    }],
  });
}

export async function matrixToDocxBase64(matrix, meta) {
  const buffer = await Packer.toBuffer(buildDocument(matrix, meta));
  return buffer.toString('base64');
}
