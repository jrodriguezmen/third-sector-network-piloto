# Estado de 3SN

*Actualizado: 14 de noviembre de 2026 (creación del agente).*

## Fase actual: 1 — Problema

| Métrica | Valor | Objetivo de la fase |
|---|---|---|
| Conversaciones con ONG | 0 | 15 |
| ONG que confirman el problema | 0 | 8 |
| Matrices completas generadas por ONG reales | 0 | 5 (fase 2) |
| Proyectos reales publicados en el portal | 0 | 3 (fase 2) |
| Pagos reales | 0 | 1 (fase 3) |
| Compromisos de empresas o fundaciones | 0 | 1 (fase 3) |

## Necesito de ti (máximo 3)

1. **Decidir quién firma los mensajes** (10 min). Los correos a ONG necesitan una persona o una marca detrás. Opciones: tu nombre, "equipo 3SN" con un correo propio, o un alias. Sin esto los borradores se quedan sin firma.
2. **Probar el portal con dos cuentas** (20 min). Entra en `/portal/entrar.html` con un correo como ONG y publica un proyecto de prueba; con otro correo, como empresa, comprométete con una línea. Aún no se ha hecho ninguna prueba real de principio a fin.
3. **Definir los códigos de piloto** (5 min). Añadir la variable `PILOT_CODES` en Vercel con 5–10 códigos para repartir a las primeras ONG.

## Plan

### Plataforma e ingeniería
- [ ] Revisar la portada: que explique los dos productos y lleve al portal (ahora solo hay un enlace en el pie).
- [ ] SEO básico: títulos, descripciones, `sitemap.xml`, `robots.txt`, etiquetas para compartir en redes.
- [ ] El portal no actualiza los sellos de "pendiente" a "confirmado" en Bitcoin: añadir la comprobación.
- [ ] Enlazar el Marco Lógico con el portal: de una matriz generada, crear el borrador de un proyecto con sus líneas.
- [ ] Completar `legal.html` (necesita titular, NIF, domicilio y correo: bloqueado hasta que José Carlos los dé).
- [ ] Forma de medir visitas y uso sin cookies (proponer opción; activar requiere a José Carlos).

### Datos
- [ ] Lista de 30 ONG objetivo para el piloto a partir de `datos/`: tamaño medio, poca financiación de empresas, sede en Madrid primero.
- [ ] Lista de 30 empresas y fundaciones corporativas objetivo (memorias de sostenibilidad, convocatorias propias).
- [ ] Bloqueado: subvenciones públicas una a una (BDNS) y ayuda oficial por actividad (info@OD). Desde la nube no hay acceso a esas webs; hace falta el ordenador de José Carlos.

### Posicionamiento y marketing
- [ ] Documento de posicionamiento: cliente ideal, problema, promesa, por qué 3SN, objeciones. Una página.
- [ ] Análisis de alternativas: qué usan hoy las ONG para formular y para captar empresas (plataformas de donación, consultoras, convocatorias).
- [ ] Calendario de contenido de 4 semanas para LinkedIn (borradores).

### Campañas y captación
- [ ] Borrador de correo a la CONGDE: presentar 3SN, pedir permiso para usar sus datos y proponer una prueba con socias.
- [ ] Borrador de correo a ONG piloto con oferta concreta: matriz completa gratis a cambio de 20 minutos de conversación.
- [ ] Guion de entrevista de 20 minutos para validar el problema (10 preguntas, sin vender).

### Venta de la plataforma
- [ ] Mapa de posibles compradores o contratantes y qué pruebas pediría cada uno. Incluir cómo compra de verdad una administración (contrato, subvención, convenio), porque rara vez "compra" una plataforma.

## Decisiones tomadas

- 2/11/2026: flujo de dinero por hitos; ingresos por comisión; sellado en blockchain ahora y pagos con cripto más adelante; primera versión sin dinero real.
- 14/11/2026: foco exclusivo en tercer sector. 2SN y 1SN quedan para después.

## Ideas aparcadas (2SN, 1SN y otras)

- (vacío)

## Seguimiento de contactos (por organización, sin datos personales)

| Organización | Tipo | Estado | Última acción | Siguiente paso |
|---|---|---|---|---|
| — | — | — | — | — |
