# Estado de 3SN

*Actualizado: 15 de noviembre de 2026 (decisiones de José Carlos en el chat).*

**Aviso:** en las dos ejecuciones de hoy no se pudo comprobar que la web responde (la herramienta de lectura de páginas no obtuvo permiso). No hay indicio de fallo, pero está sin comprobar.

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

1. **Elegir el nombre del dominio y comprarlo** (15 min, en el ordenador). Decidir entre 3sn, thirdsectornetwork u otro nombre, con terminación .org o .com. La compra la haces tú o la confirmas tú.
2. **Activar los códigos de piloto** (5 min). El correo promete una matriz gratis; sin códigos no se puede cumplir. En vercel.com → proyecto third-sector-network-piloto → Settings → Environment Variables → añadir `PILOT_CODES` con, por ejemplo, `PILOTO-01,PILOTO-02,PILOTO-03,PILOTO-04,PILOTO-05` → Save → Deployments → Redeploy.
3. **Abrir la web y probar el portal con dos cuentas** (20 min). Primero abre https://third-sector-network-piloto.vercel.app y https://third-sector-network-piloto.vercel.app/portal/ y dime si cargan (hoy no pude comprobarlo). Después entra en `/portal/entrar.html` con un correo como ONG y publica un proyecto de prueba; con otro correo, como empresa, comprométete con una línea.

## Plan

### Plataforma e ingeniería
- [ ] Cuando haya dominio: conectarlo en Vercel, cambiar las direcciones de `sitemap.xml`, `robots.txt` y las etiquetas de la portada, y añadir el dominio a las direcciones permitidas del acceso por correo en Supabase (los dos últimos pasos necesitan a José Carlos en el ordenador).
- [ ] Revisar la portada: que explique los dos productos y lleve al portal (ahora solo hay un enlace en el pie).
- [ ] SEO básico: títulos, descripciones, `sitemap.xml`, `robots.txt`, etiquetas para compartir en redes.
- [ ] El portal no actualiza los sellos de "pendiente" a "confirmado" en Bitcoin: añadir la comprobación.
- [ ] Enlazar el Marco Lógico con el portal: de una matriz generada, crear el borrador de un proyecto con sus líneas.
- [ ] Antes de pedir proyectos reales a ONG: explicar qué se hace con los datos del proyecto que escriben en el formulario (sale como objeción en el posicionamiento).
- [ ] Completar `legal.html` (necesita titular, NIF, domicilio y correo: bloqueado hasta que José Carlos los dé).
- [ ] Forma de medir visitas y uso sin cookies (proponer opción; activar requiere a José Carlos).

### Datos
- [x] Lista de 30 ONG objetivo para el piloto (14/11): `datos/ong_objetivo_piloto.csv` y `borradores/lista-ong-objetivo.md`. 20 con sede en Madrid.
- [ ] Para las 5 primeras ONG de la lista: buscar en su web el buzón o formulario del área de proyectos y un motivo concreto para escribirles (sin guardar nombres de personas).
- [ ] Lista de 30 empresas y fundaciones corporativas objetivo (memorias de sostenibilidad, convocatorias propias).
- [ ] Bloqueado: subvenciones públicas una a una (BDNS) y ayuda oficial por actividad (info@OD). Desde la nube no hay acceso a esas webs; hace falta el ordenador de José Carlos.

### Posicionamiento y marketing
- [x] Documento de posicionamiento (14/11): `borradores/posicionamiento.md`. Es una hipótesis hasta que haya conversaciones.
- [ ] Análisis de alternativas (empezar por Worldcoo, Fonselp y Donadoo, que salen en la búsqueda y están sin comprobar): qué usan hoy las ONG para formular y para captar empresas (plataformas de donación, consultoras, convocatorias).
- [ ] Calendario de contenido de 4 semanas para LinkedIn (borradores).

### Campañas y captación
- [x] Borrador de correo a la CONGDE (14/11): `borradores/correo-congde.md` y borrador en Gmail. Falta firma.
- [x] Borrador de correo a ONG piloto (14/11): `borradores/correo-ong-piloto.md`, con variante corta y recordatorio. También en Gmail como borrador. Falta firma y códigos de piloto.
- [x] Guion de entrevista de 20 minutos (14/11): `borradores/guion-entrevista-ong.md`, con ficha de resultados y criterio para contar una conversación como "confirma el problema".

### Venta de la plataforma
- [ ] Mapa de posibles compradores o contratantes y qué pruebas pediría cada uno. Incluir cómo compra de verdad una administración (contrato, subvención, convenio), porque rara vez "compra" una plataforma.

## Decisiones tomadas

- 15/11/2026: los correos los firma "José Carlos" (solo nombre de pila) seguido de "3SN · Third Sector Network". Ya aplicado en `borradores/`; falta aplicarlo en los borradores de Gmail.
- 15/11/2026: 3SN tendrá dominio propio y un correo hola@dominio reenviado al Gmail de José Carlos, con etiqueta propia. Pendiente de comprar el dominio.

- 2/11/2026: flujo de dinero por hitos; ingresos por comisión; sellado en blockchain ahora y pagos con cripto más adelante; primera versión sin dinero real.
- 14/11/2026: foco exclusivo en tercer sector. 2SN y 1SN quedan para después.
- 14/11/2026 (propuesta del agente, pendiente de tu visto bueno): una conversación cuenta como "confirma el problema" si cumple dos de tres: da un coste concreto, ya ha gastado tiempo o dinero en resolverlo, o acepta probar la herramienta con fecha.

## Ideas aparcadas (2SN, 1SN y otras)

- (vacío)

## Seguimiento de contactos (por organización, sin datos personales)

| Organización | Tipo | Estado | Última acción | Siguiente paso |
|---|---|---|---|---|
| FAD | ONGD | Sin contactar | En lista (14/11) | Enviar correo piloto cuando haya firma y códigos |
| RESCATE | ONGD | Sin contactar | En lista (14/11) | Ídem |
| Amigos de la Tierra | ONGD | Sin contactar | En lista (14/11) | Ídem |
| AIETI | ONGD | Sin contactar | En lista (14/11) | Ídem |
| Movimiento por la Paz -MPDL- | ONGD | Sin contactar | En lista (14/11) | Ídem |

Las otras 25 están en `datos/ong_objetivo_piloto.csv`; se añaden aquí cuando se les escriba.
